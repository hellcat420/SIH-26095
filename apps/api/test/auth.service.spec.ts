import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { AuthService } from '../src/auth/auth.service';
import { OtpChallenge } from '../src/auth/otp-challenge.entity';
import { User } from '../src/auth/user.entity';
import { UserRole } from '../src/auth/auth.types';

const phone = '9876543210';
const user = {
  id: '1f8fe6ea-1d57-48bd-b9ec-f0a1fd99f7d9',
  name: 'Demo Inspector',
  phone,
  email: null,
  role: UserRole.Inspector,
  instituteId: null,
  district: null,
  state: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function createOtpRepository() {
  let challenge: Partial<OtpChallenge> | null = null;
  return {
    update: jest.fn(async (_criteria: unknown, _values: unknown) => ({ affected: 1 })),
    create: jest.fn((value: Partial<OtpChallenge>) => value),
    save: jest.fn(async (value: Partial<OtpChallenge>) => {
      challenge = { ...value, id: 'challenge-1', createdAt: new Date() };
      return challenge;
    }),
    findOne: jest.fn(async () => challenge),
    createQueryBuilder: jest.fn(() => {
      const builder = {
        update: jest.fn(() => builder),
        set: jest.fn(() => builder),
        where: jest.fn(() => builder),
        andWhere: jest.fn(() => builder),
        execute: jest.fn(async () => {
          if (!challenge || challenge.consumedAt) return { affected: 0 };
          challenge.consumedAt = new Date();
          return { affected: 1 };
        }),
      };
      return builder;
    }),
    getChallenge: () => challenge,
  };
}

describe('AuthService OTP challenges', () => {
  const originalEnvironment = {
    nodeEnv: process.env.NODE_ENV,
    demoUsersEnabled: process.env.AUTH_DEMO_USERS_ENABLED,
    otpHashSecret: process.env.OTP_HASH_SECRET,
    jwtSecret: process.env.JWT_SECRET,
    gatewayUrl: process.env.OTP_GATEWAY_URL,
  };
  let service: AuthService;
  let otpRepository: ReturnType<typeof createOtpRepository>;

  afterEach(() => {
    process.env.NODE_ENV = originalEnvironment.nodeEnv;
    process.env.AUTH_DEMO_USERS_ENABLED = originalEnvironment.demoUsersEnabled;
    process.env.OTP_HASH_SECRET = originalEnvironment.otpHashSecret;
    process.env.JWT_SECRET = originalEnvironment.jwtSecret;
    process.env.OTP_GATEWAY_URL = originalEnvironment.gatewayUrl;
  });

  async function createService() {
    process.env.NODE_ENV = 'development';
    process.env.AUTH_DEMO_USERS_ENABLED = 'true';
    process.env.OTP_HASH_SECRET = 'test-otp-secret';
    delete process.env.OTP_GATEWAY_URL;
    otpRepository = createOtpRepository();

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: { sign: jest.fn(() => 'signed-token') } },
        { provide: getRepositoryToken(User), useValue: { findOneBy: jest.fn(async () => user) } },
        { provide: getRepositoryToken(OtpChallenge), useValue: otpRepository },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
  }

  it('stores a salted OTP hash and exposes the code only in enabled development demo mode', async () => {
    await createService();

    const result = await service.requestOtp({ phone });
    const developmentOtp = 'developmentOtp' in result ? result.developmentOtp : undefined;

    expect(developmentOtp).toMatch(/^\d{6}$/);
    expect(otpRepository.getChallenge()?.otpHash).not.toBe(developmentOtp);
    expect(otpRepository.getChallenge()?.salt).toBeTruthy();
    expect(otpRepository.getChallenge()?.expiresAt?.getTime()).toBeGreaterThan(Date.now());
  });

  it('consumes a successful OTP so it cannot be reused', async () => {
    await createService();
    const request = await service.requestOtp({ phone });
    const developmentOtp = 'developmentOtp' in request ? request.developmentOtp : undefined;
    if (!developmentOtp) throw new Error('Expected a development OTP.');

    const login = await service.loginWithOtp({ phone, otp: developmentOtp });
    expect(login.user.id).toBe(user.id);
    await expect(service.loginWithOtp({ phone, otp: developmentOtp })).rejects.toThrow('Invalid or expired OTP.');
  });

  it('applies a per-phone cooldown to repeated OTP requests', async () => {
    await createService();
    await service.requestOtp({ phone });

    await expect(service.requestOtp({ phone }))
      .rejects.toThrow('Please wait before requesting another OTP.');
  });
});
