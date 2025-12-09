/**
 * @fileoverview Auth Service - Authentication Logic
 * @module auth/auth.service
 *
 * Service xử lý logic authentication.
 * Bao gồm login, logout, refresh token, và validation.
 *
 * Token Strategy:
 * - Access token: JWT, 15 phút
 * - Refresh token: UUID, lưu trong Redis, 7 ngày
 *
 * @author APTX3107 Team
 */
import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

/**
 * Service xử lý authentication với JWT và refresh tokens.
 *
 * @example
 * const result = await authService.login(email, password);
 * // { access_token, refresh_token, user }
 */
@Injectable()
export class AuthService {
  /**
   * @param usersService - Service quản lý users
   * @param jwtService - JWT service từ @nestjs/jwt
   * @param redis - Redis client để lưu refresh tokens
   */
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  /**
   * Validate user credentials.
   *
   * @param email - Email của user
   * @param password - Password cần validate
   * @returns User object (không có password) hoặc null nếu invalid
   * @throws UnauthorizedException nếu tài khoản bị khóa
   */
  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      return null;
    }

    if (user.trangThai !== 'Active') {
      throw new UnauthorizedException('Tài khoản đã bị khóa');
    }

    const isPasswordValid = await this.usersService.validatePassword(
      password,
      user.password,
      user.salt,
    );

    if (!isPasswordValid) {
      return null;
    }

    const { password: _, ...result } = user;
    return result;
  }

  /**
   * Login user và tạo tokens.
   *
   * @param email - Email của user
   * @param password - Password
   * @returns Object chứa access_token, refresh_token và user info
   * @throws UnauthorizedException nếu credentials không đúng
   */
  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);

    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    const payload = {
      email: user.email,
      username: user.username,
      hoTen: user.hoTen,
      role: user.role,
    };

    // Generate short-lived access token
    const access_token = this.jwtService.sign(payload);

    // Generate refresh token (UUID)
    const refresh_token = uuidv4();

    // Store refresh token in Redis (7 days TTL)
    await this.redis.setex(
      `refresh:${refresh_token}`,
      7 * 24 * 60 * 60, // 7 days
      email,
    );

    return {
      access_token,
      refresh_token,
      user: {
        email: user.email,
        username: user.username,
        hoTen: user.hoTen,
        role: user.role,
      },
    };
  }

  /**
   * Refresh access token sử dụng refresh token.
   *
   * @param refreshToken - Refresh token từ cookie
   * @returns Object chứa access_token mới và user info
   * @throws UnauthorizedException nếu refresh token không hợp lệ
   */
  async refresh(refreshToken: string) {
    const email = await this.redis.get(`refresh:${refreshToken}`);

    if (!email) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.usersService.findByEmail(email);
    if (!user || user.trangThai !== 'Active') {
      throw new UnauthorizedException('User không hợp lệ');
    }

    const payload = {
      email: user.email,
      username: user.username,
      hoTen: user.hoTen,
      role: user.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        email: user.email,
        username: user.username,
        hoTen: user.hoTen,
        role: user.role,
      },
    };
  }

  /**
   * Logout user bằng cách xóa refresh token.
   *
   * @param refreshToken - Refresh token cần xóa
   */
  async logout(refreshToken: string) {
    await this.redis.del(`refresh:${refreshToken}`);
  }

  /**
   * Lấy role của user theo email.
   *
   * @param email - Email của user
   * @returns Role string hoặc null
   */
  async getUserRole(email: string): Promise<string | null> {
    const user = await this.usersService.findByEmail(email);
    return user?.role || null;
  }
}
