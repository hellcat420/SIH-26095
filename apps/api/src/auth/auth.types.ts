import { IsNotEmpty, IsString, Matches } from 'class-validator';

export enum UserRole {
  Inspector = 'Inspector',
  Official = 'Official',
  NGOAdmin = 'NGOAdmin',
  Beneficiary = 'Beneficiary',
  Authority = 'Authority',
}

export interface AuthUser {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: UserRole;
  instituteId?: string | null;
  district?: string;
  state?: string;
}

export class RequestOtpDto {
  @IsString()
  @Matches(/^\+?[1-9]\d{7,14}$/)
  phone!: string;
}

export class VerifyOtpDto extends RequestOtpDto {
  @IsString()
  @Matches(/^\d{6}$/)
  otp!: string;
}

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

export interface TokenPayload {
  sub: string;
  role: UserRole;
  tokenType: 'access' | 'refresh';
  phone?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse extends AuthTokens {
  user: AuthUser;
}
