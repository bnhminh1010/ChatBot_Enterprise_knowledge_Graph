/**
 * @fileoverview Auth Module - Authentication & Authorization
 * @module auth/auth.module
 *
 * Module xử lý authentication và authorization.
 * Sử dụng JWT tokens với Passport.js.
 *
 * Components:
 * - AuthService: Login, logout, token management
 * - AuthController: Auth endpoints
 * - JwtStrategy: JWT validation
 * - RolesGuard: Role-based access control
 *
 * Security:
 * - Access token: 15 minutes expiry
 * - Refresh token: 7 days expiry (planned)
 *
 * @author APTX3107 Team
 */
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RolesGuard } from './guards/roles.guard';

/**
 * Module quản lý authentication và authorization.
 */
@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      signOptions: { expiresIn: '15m' }, // Short-lived access token
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, RolesGuard],
  exports: [AuthService, JwtStrategy, RolesGuard],
})
export class AuthModule {}
