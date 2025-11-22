import { Injectable } from '@nestjs/common';
import { Neo4jService } from '../core/neo4j/neo4j.service';
import * as bcrypt from 'bcrypt';

export interface User {
    username: string;
    hoTen: string;
    trangThai: string;
    password?: string;
    role?: string;
}

@Injectable()
export class UsersService {
    constructor(private readonly neo4j: Neo4jService) { }

    async findByUsername(username: string): Promise<User | null> {
        const cypher = `
      MATCH (u:NguoiDung {username: $username})-[:CO_VAI_TRO]->(r:VaiTro)
      RETURN u.username AS username, 
             u.ho_ten AS hoTen, 
             u.trang_thai AS trangThai,
             u.password AS password,
             r.ma AS role
    `;

        const result = await this.neo4j.run<{
            username: string;
            hoTen: string;
            trangThai: string;
            password: string;
            role: string;
        }>(cypher, { username });

        if (result.length === 0) {
            return null;
        }

        const record = result[0];
        return {
            username: record.username,
            hoTen: record.hoTen,
            trangThai: record.trangThai,
            password: record.password,
            role: record.role,
        };
    }

    async validatePassword(plainPassword: string, hashedPassword: string | undefined): Promise<boolean> {
        if (!hashedPassword) {
            return false;
        }
        return bcrypt.compare(plainPassword, hashedPassword);
    }

    async hashPassword(password: string): Promise<string> {
        const saltRounds = 10;
        return bcrypt.hash(password, saltRounds);
    }
}
