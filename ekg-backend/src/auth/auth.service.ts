import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      return null;
    }

    if (user.trangThai !== 'Active') {
      throw new UnauthorizedException('Tài khoản đã bị khóa');
    }

    // Validate password
    const isPasswordValid = await this.usersService.validatePassword(
      password,
      user.password,
      user.salt,
    );

    if (!isPasswordValid) {
      return null;
    }

    // Remove password from user object
    const { password: _, ...result } = user;
    return result;
  }

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
      7 * 24 * 60 * 60, // 7 days in seconds
      email, // Store email instead of username
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

  async refresh(refreshToken: string) {
    // Get email from Redis
    const email = await this.redis.get(`refresh:${refreshToken}`);

    if (!email) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Get fresh user data
    const user = await this.usersService.findByEmail(email);
    if (!user || user.trangThai !== 'Active') {
      throw new UnauthorizedException('User không hợp lệ');
    }

    // Generate new access token
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

  async logout(refreshToken: string) {
    // Delete refresh token from Redis
    await this.redis.del(`refresh:${refreshToken}`);
  }

  async getUserRole(email: string): Promise<string | null> {
    const user = await this.usersService.findByEmail(email);
    return user?.role || null;
  }
}
