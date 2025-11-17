import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    
    // Nếu không có @Roles decorator, cho phép pass
    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException('User không được xác định');
    }

    // Kiểm tra user có role được yêu cầu không
    const hasRole = requiredRoles.some(role => user.roles?.includes(role));

    if (!hasRole) {
      throw new ForbiddenException(
        `Bạn không có quyền truy cập. Cần role: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
