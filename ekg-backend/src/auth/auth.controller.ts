import { Controller, Post, Body, UseGuards, Get, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, AuthResponseDto } from './dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * Đăng nhập
   * POST /auth/login
   * Body: { email, password }
   */
  @Post('login')
  @ApiOperation({ summary: 'Đăng nhập với email và mật khẩu' })
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }

  /**
   * Lấy thông tin user hiện tại
   * GET /auth/me
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy thông tin user hiện tại' })
  async getCurrentUser(@Request() req: any) {
    return {
      user: req.user,
      message: 'Lấy thông tin user thành công',
    };
  }

  /**
   * Verify token (check xem token còn hợp lệ không)
   * GET /auth/verify
   */
  @Get('verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify JWT token' })
  async verifyToken(@Request() req: any) {
    return {
      valid: true,
      user: req.user,
    };
  }
}
