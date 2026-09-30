import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { getJwtSecret } from './auth.config';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtStrategy } from './jwt.strategy';
import { RolesGuard } from './roles.guard';
import { OtpChallenge } from './otp-challenge.entity';
import { User } from './user.entity';
import { Assignment } from '../assignments/assignment.entity';
import { Inspection } from '../inspections/inspection.entity';
import { Institute } from '../institutes/institute.entity';
import { AccessScopeService } from './access-scope.service';

@Module({
  imports: [
    PassportModule,
    TypeOrmModule.forFeature([User, OtpChallenge, Assignment, Inspection, Institute]),
    JwtModule.register({
      secret: getJwtSecret(),
      signOptions: { expiresIn: '15m' },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AccessScopeService,
    JwtStrategy,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
  exports: [AuthService, AccessScopeService],
})
export class AuthModule {}
