import { HttpException, HttpStatus, Injectable, OnModuleInit, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'crypto';
import { IsNull, Repository } from 'typeorm';
import { OtpChallenge } from './otp-challenge.entity';
import { DEMO_USERS } from './demo-users';
import { User } from './user.entity';
import { AuthResponse, AuthTokens, AuthUser, RefreshTokenDto, RequestOtpDto, TokenPayload, UserRole, VerifyOtpDto } from './auth.types';

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(OtpChallenge) private readonly otpRepository: Repository<OtpChallenge>,
  ) {}

  async onModuleInit() {
    if (process.env.AUTH_DEMO_USERS_ENABLED !== 'true') return;
    if (process.env.NODE_ENV === 'production') {
      throw new Error('AUTH_DEMO_USERS_ENABLED cannot be enabled in production.');
    }

    for (const demoUser of DEMO_USERS) {
      const existingUser = await this.userRepository.findOneBy({ phone: demoUser.phone });
      if (!existingUser) {
        await this.userRepository.save(this.userRepository.create({
          ...demoUser,
          email: demoUser.email,
          instituteId: demoUser.instituteId ?? null,
          district: demoUser.district ?? null,
          state: demoUser.state ?? null,
          isActive: true,
        }));
      }
    }
  }

  async requestOtp({ phone }: RequestOtpDto) {
    const normalizedPhone = this.normalizePhone(phone);
    const user = await this.userRepository.findOneBy({ phone: normalizedPhone, isActive: true });
    if (!user) throw new UnauthorizedException('No active user registered for this phone number.');

    const demoUser = this.isDemoEnabled() && DEMO_USERS.some((item) => item.phone === normalizedPhone);
    const gatewayUrl = process.env.OTP_GATEWAY_URL;
    if (!demoUser && !gatewayUrl) {
      throw new ServiceUnavailableException('OTP delivery is not configured.');
    }

    const now = new Date();
    const latestChallenge = await this.otpRepository.findOne({
      where: { phone: normalizedPhone },
      order: { createdAt: 'DESC' },
    });
    if (latestChallenge && now.getTime() - latestChallenge.createdAt.getTime() < 60_000) {
      throw new HttpException('Please wait before requesting another OTP.', HttpStatus.TOO_MANY_REQUESTS);
    }

    const otp = randomInt(0, 1_000_000).toString().padStart(6, '0');
    await this.otpRepository.update({ phone: normalizedPhone, consumedAt: IsNull() }, { consumedAt: now });
    const salt = randomBytes(16).toString('hex');
    const challenge = await this.otpRepository.save(this.otpRepository.create({
      phone: normalizedPhone,
      salt,
      otpHash: this.hashOtp(otp, salt),
      attempts: 0,
      expiresAt: new Date(now.getTime() + 5 * 60 * 1000),
      consumedAt: null,
    }));

    if (demoUser) {
      return { message: 'Demo OTP created. It expires in 5 minutes.', phone: normalizedPhone, developmentOtp: otp };
    }

    try {
      await this.deliverOtp(normalizedPhone, otp);
    } catch {
      await this.otpRepository.update(challenge.id, { consumedAt: new Date() });
      throw new ServiceUnavailableException('OTP delivery failed. Please try again later.');
    }

    return { message: 'OTP sent successfully.', phone: normalizedPhone };
  }

  async loginWithOtp({ phone, otp }: VerifyOtpDto): Promise<AuthResponse> {
    const normalizedPhone = this.normalizePhone(phone);
    const user = await this.userRepository.findOneBy({ phone: normalizedPhone, isActive: true });
    if (!user) throw new UnauthorizedException('Invalid phone number or OTP.');
    const challenge = await this.otpRepository.findOne({
      where: { phone: normalizedPhone, consumedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
    if (!challenge || challenge.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Invalid or expired OTP.');
    }
    if (!this.matchesOtp(otp, challenge)) {
      const attemptedAt = new Date();
      await this.otpRepository.createQueryBuilder()
        .update(OtpChallenge)
        .set({
          attempts: () => '"attempts" + 1',
          consumedAt: () => `CASE WHEN "attempts" >= 4 THEN :attemptedAt ELSE "consumedAt" END`,
        })
        .where('id = :id', { id: challenge.id })
        .andWhere('consumedAt IS NULL')
        .andWhere('expiresAt > :attemptedAt', { attemptedAt })
        .andWhere('attempts < 5')
        .execute();
      throw new UnauthorizedException('Invalid or expired OTP.');
    }

    const consumedAt = new Date();
    const consumeResult = await this.otpRepository.createQueryBuilder()
      .update(OtpChallenge)
      .set({ consumedAt })
      .where('id = :id', { id: challenge.id })
      .andWhere('consumedAt IS NULL')
      .andWhere('expiresAt > :consumedAt', { consumedAt })
      .andWhere('attempts < 5')
      .execute();
    if (consumeResult.affected !== 1) throw new UnauthorizedException('Invalid or expired OTP.');

    const tokens = this.issueTokens(this.toAuthUser(user));

    return {
      ...tokens,
      user: this.toAuthUser(user),
    };
  }

  async refreshToken({ refreshToken }: RefreshTokenDto): Promise<AuthTokens> {
    let payload: TokenPayload;
    try {
      payload = this.jwtService.verify<TokenPayload>(refreshToken, {
        ignoreExpiration: false,
      });
    } catch {
      throw new UnauthorizedException('Refresh token is invalid or expired.');
    }
    if (payload.tokenType !== 'refresh') throw new UnauthorizedException('Invalid refresh token type.');
    const user = await this.userRepository.findOneBy({ id: payload.sub, isActive: true });
    if (!user) throw new UnauthorizedException('Unknown user for refresh token.');
    return this.issueTokens(this.toAuthUser(user));
  }

  async validateUserFromJwt(payload: TokenPayload): Promise<AuthUser> {
    if (payload.tokenType !== 'access') throw new UnauthorizedException('Invalid token type.');
    const user = await this.userRepository.findOneBy({ id: payload.sub, isActive: true });
    if (!user) throw new UnauthorizedException('User not found for token.');
    return this.toAuthUser(user);
  }

  private issueTokens(user: AuthUser): AuthTokens {
    const accessToken = this.jwtService.sign({
      sub: user.id,
      role: user.role,
      tokenType: 'access',
    });

    const refreshToken = this.jwtService.sign(
      {
        sub: user.id,
        tokenType: 'refresh',
      },
      { expiresIn: '7d' },
    );

    return { accessToken, refreshToken };
  }

  private async deliverOtp(phone: string, otp: string): Promise<void> {
    const gatewayUrl = process.env.OTP_GATEWAY_URL;
    if (!gatewayUrl) throw new ServiceUnavailableException('OTP delivery is not configured.');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (process.env.OTP_GATEWAY_TOKEN) {
      headers.Authorization = `Bearer ${process.env.OTP_GATEWAY_TOKEN}`;
    }
    const response = await fetch(gatewayUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ phone, message: `Your DoSJE verification code is ${otp}. It expires in 5 minutes.` }),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new ServiceUnavailableException(`OTP gateway returned HTTP ${response.status}.`);
  }

  private isDemoEnabled(): boolean {
    return process.env.AUTH_DEMO_USERS_ENABLED === 'true' && process.env.NODE_ENV !== 'production';
  }

  private hashOtp(otp: string, salt: string): string {
    const secret = process.env.OTP_HASH_SECRET || process.env.JWT_SECRET || 'dosje-development-otp-secret';
    return createHmac('sha256', secret).update(`${salt}:${otp}`).digest('hex');
  }

  private matchesOtp(otp: string, challenge: OtpChallenge): boolean {
    const actual = Buffer.from(this.hashOtp(otp, challenge.salt), 'hex');
    const expected = Buffer.from(challenge.otpHash, 'hex');
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }

  private toAuthUser(user: User): AuthUser {
    return {
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email ?? undefined,
      role: user.role,
      instituteId: user.instituteId,
      district: user.district ?? undefined,
      state: user.state ?? undefined,
    };
  }

  private normalizePhone(phone: string): string {
    return phone.replace(/\s+/g, '').trim();
  }
}
