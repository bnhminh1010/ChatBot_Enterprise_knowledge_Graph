import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import type { Response, Request } from 'express';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(loginDto: LoginDto, res: Response): Promise<{
        user: {
            email: string;
            username: string | undefined;
            hoTen: string;
            role: string | undefined;
        };
    }>;
    refresh(req: Request, res: Response): Promise<{
        user: {
            email: string;
            username: string | undefined;
            hoTen: string;
            role: string | undefined;
        };
    }>;
    logout(req: Request, res: Response): Promise<{
        message: string;
    }>;
    getProfile(user: any): {
        username: any;
        hoTen: any;
        role: any;
    };
}
