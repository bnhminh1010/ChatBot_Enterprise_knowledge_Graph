import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header không tồn tại');
    }

    // Format: "Bearer <token>"
    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Token format không hợp lệ');
    }

    try {
      const payload = this.jwtService.verify(token);
      request.user = payload; // Gắn user vào request
      return true;
    } catch (error) {
      throw new UnauthorizedException('Token không hợp lệ hoặc hết hạn');
    }
  }
}
