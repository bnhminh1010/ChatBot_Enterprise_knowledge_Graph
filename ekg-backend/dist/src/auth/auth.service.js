"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const users_service_1 = require("../users/users.service");
const ioredis_1 = __importDefault(require("ioredis"));
const uuid_1 = require("uuid");
let AuthService = class AuthService {
    usersService;
    jwtService;
    redis;
    constructor(usersService, jwtService, redis) {
        this.usersService = usersService;
        this.jwtService = jwtService;
        this.redis = redis;
    }
    async validateUser(email, password) {
        const user = await this.usersService.findByEmail(email);
        if (!user) {
            return null;
        }
        if (user.trangThai !== 'Active') {
            throw new common_1.UnauthorizedException('Tài khoản đã bị khóa');
        }
        const isPasswordValid = await this.usersService.validatePassword(password, user.password);
        if (!isPasswordValid) {
            return null;
        }
        const { password: _, ...result } = user;
        return result;
    }
    async login(email, password) {
        const user = await this.validateUser(email, password);
        if (!user) {
            throw new common_1.UnauthorizedException('Email hoặc mật khẩu không đúng');
        }
        const payload = {
            email: user.email,
            username: user.username,
            hoTen: user.hoTen,
            role: user.role,
        };
        const access_token = this.jwtService.sign(payload);
        const refresh_token = (0, uuid_1.v4)();
        await this.redis.setex(`refresh:${refresh_token}`, 7 * 24 * 60 * 60, email);
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
    async refresh(refreshToken) {
        const email = await this.redis.get(`refresh:${refreshToken}`);
        if (!email) {
            throw new common_1.UnauthorizedException('Invalid or expired refresh token');
        }
        const user = await this.usersService.findByEmail(email);
        if (!user || user.trangThai !== 'Active') {
            throw new common_1.UnauthorizedException('User không hợp lệ');
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
    async logout(refreshToken) {
        await this.redis.del(`refresh:${refreshToken}`);
    }
    async getUserRole(email) {
        const user = await this.usersService.findByEmail(email);
        return user?.role || null;
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)('REDIS_CLIENT')),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        jwt_1.JwtService,
        ioredis_1.default])
], AuthService);
//# sourceMappingURL=auth.service.js.map