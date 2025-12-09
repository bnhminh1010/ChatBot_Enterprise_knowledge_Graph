/**
 * @fileoverview Auth Controller - Authentication Endpoints
 * @module auth/auth.controller
 * 
 * Controller xử lý authentication endpoints.
 * Sử dụng HttpOnly cookies cho security.
 * 
 * Endpoints:
 * - POST /auth/login - Đăng nhập
 * - POST /auth/refresh - Refresh access token
 * - POST /auth/logout - Đăng xuất
 * - GET /auth/profile - Lấy thông tin user (protected)
 * 
 * @author APTX3107 Team
 */
import { Controller, Post, Body, Get, UseGuards, Res, Req, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { Response, Request } from 'express';

/**
 * Controller xử lý authentication.
 * Tokens được lưu trong HttpOnly cookies.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Login và set tokens vào cookies.
   * 
   * @route POST /auth/login
   * @param loginDto - Email và password
   * @param res - Express response (để set cookies)
   * @returns User info (không có tokens trong response body)
   */
  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { access_token, refresh_token, user } = await this.authService.login(
      loginDto.email,
      loginDto.password,
    );

    // Set access token in HttpOnly cookie
    res.cookie('access_token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    // Set refresh token in HttpOnly cookie
    res.cookie('refresh_token', refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return { user }; // Don't send tokens in response body
  }

  /**
   * Refresh access token sử dụng refresh token từ cookie.
   * 
   * @route POST /auth/refresh
   * @param req - Express request (để đọc cookies)
   * @param res - Express response (để set cookie mới)
   * @returns User info với access_token mới trong cookie
   */
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies['refresh_token'];
    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token');
    }

    const { access_token, user } = await this.authService.refresh(refreshToken);

    res.cookie('access_token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000,
    });

    return { user };
  }

  /**
   * Logout và clear cookies.
   * 
   * @route POST /auth/logout
   * @security JWT
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies['refresh_token'];
    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }

    res.clearCookie('access_token');
    res.clearCookie('refresh_token');

    return { message: 'Logged out successfully' };
  }

  /**
   * Lấy profile của user hiện tại.
   * 
   * @route GET /auth/profile
   * @security JWT
   * @returns User profile (username, hoTen, role)
   */
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@CurrentUser() user: any) {
    return {
      username: user.username,
      hoTen: user.hoTen,
      role: user.role,
    };
  }
}
