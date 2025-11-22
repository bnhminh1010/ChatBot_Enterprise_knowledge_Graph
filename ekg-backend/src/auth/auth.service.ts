import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly jwtService: JwtService,
    ) { }

    async validateUser(username: string, password: string) {
        const user = await this.usersService.findByUsername(username);

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
        );

        if (!isPasswordValid) {
            return null;
        }

        // Remove password from user object
        const { password: _, ...result } = user;
        return result;
    }

    async login(username: string, password: string) {
        const user = await this.validateUser(username, password);

        if (!user) {
            throw new UnauthorizedException('Tên đăng nhập hoặc mật khẩu không đúng');
        }

        const payload = {
            username: user.username,
            hoTen: user.hoTen,
            role: user.role,
        };

        return {
            access_token: this.jwtService.sign(payload),
            user: {
                username: user.username,
                hoTen: user.hoTen,
                role: user.role,
            },
        };
    }

    async getUserRole(username: string): Promise<string | null> {
        const user = await this.usersService.findByUsername(username);
        return user?.role || null;
    }
}
