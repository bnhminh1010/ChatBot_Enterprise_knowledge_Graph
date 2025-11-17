import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Neo4jService } from '../core/neo4j/neo4j.service';
import { LoginDto } from './dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private neo4jService: Neo4jService,
    private jwtService: JwtService,
  ) {}

  /**
   * Login user - kiểm tra email/password và tạo JWT token
   */
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // 1. Tìm user trong Neo4j
    const user = await this.findUserByEmail(email);
    if (!user) {
      this.logger.warn(`Login failed: User not found - ${email}`);
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    // 2. So sánh mật khẩu
    const isPasswordValid = await bcrypt.compare(password, user.matKhau);
    if (!isPasswordValid) {
      this.logger.warn(`Login failed: Invalid password - ${email}`);
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    // 3. Tạo JWT token
    const token = this.jwtService.sign(
      {
        id: user.id,
        email: user.email,
        roles: user.roles || ['user'],
      },
      { expiresIn: '7d' },
    );

    return {
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        hoTen: user.hoTen,
        roles: user.roles || ['user'],
      },
      expiresIn: 604800, // 7 ngày (giây)
    };
  }

  /**
   * Tìm user bằng email
   */
  async findUserByEmail(email: string) {
    const cypher = `
      MATCH (u:User {email: $email})
      OPTIONAL MATCH (u)-[:CO_ROLE]->(r:Role)
      RETURN {
        id: u.id,
        email: u.email,
        matKhau: u.matKhau,
        hoTen: u.hoTen,
        trangThai: u.trangThai,
        roles: collect(r.ten)
      } as user
    `;

    const result = await this.neo4jService.run(cypher, { email });
    return result?.[0]?.user || null;
  }

  /**
   * Validate JWT payload
   */
  validateToken(payload: any) {
    if (!payload || !payload.email) {
      throw new UnauthorizedException('Token không hợp lệ');
    }
    return payload;
  }

  /**
   * Hash password (dùng khi tạo user mới)
   */
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }
}
