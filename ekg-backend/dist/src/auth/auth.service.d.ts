import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import Redis from 'ioredis';
export declare class AuthService {
    private readonly usersService;
    private readonly jwtService;
    private readonly redis;
    constructor(usersService: UsersService, jwtService: JwtService, redis: Redis);
    validateUser(email: string, password: string): Promise<{
        email: string;
        username?: string;
        hoTen: string;
        trangThai: string;
        salt?: string;
        role?: string;
    } | null>;
    login(email: string, password: string): Promise<{
        access_token: string;
        refresh_token: string;
        user: {
            email: string;
            username: string | undefined;
            hoTen: string;
            role: string | undefined;
        };
    }>;
    refresh(refreshToken: string): Promise<{
        access_token: string;
        user: {
            email: string;
            username: string | undefined;
            hoTen: string;
            role: string | undefined;
        };
    }>;
    logout(refreshToken: string): Promise<void>;
    getUserRole(email: string): Promise<string | null>;
}
