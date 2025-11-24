import { Injectable } from '@nestjs/common';
import { Neo4jService } from '../core/neo4j/neo4j.service';
import * as crypto from 'crypto';

export interface User {
  email: string;
  username?: string; // Keep for backward compatibility
  hoTen: string;
  trangThai: string;
  password?: string;
  salt?: string;
  role?: string;
}

@Injectable()
export class UsersService {
  constructor(private readonly neo4j: Neo4jService) {}

  async findByEmail(email: string): Promise<User | null> {
    const cypher = `
      MATCH (u:NguoiDung {email: $email})-[:CO_VAI_TRO]->(r:VaiTro)
      RETURN u.email AS email,
             u.username AS username,
             u.ho_ten AS hoTen, 
             u.trang_thai AS trangThai,
             u.mat_khau_hash AS password,
             u.mat_khau_salt AS salt,
             r.ma AS role
    `;

    const result = await this.neo4j.run<{
      email: string;
      username: string;
      hoTen: string;
      trangThai: string;
      password: string;
      salt: string;
      role: string;
    }>(cypher, { email });

    if (result.length === 0) {
      return null;
    }

    const record = result[0];
    return {
      email: record.email,
      username: record.username,
      hoTen: record.hoTen,
      trangThai: record.trangThai,
      password: record.password,
      salt: record.salt,
      role: record.role,
    };
  }

  // Keep for backward compatibility
  async findByUsername(username: string): Promise<User | null> {
    const cypher = `
      MATCH (u:NguoiDung {username: $username})-[:CO_VAI_TRO]->(r:VaiTro)
      RETURN u.username AS username, 
             u.ho_ten AS hoTen, 
             u.trang_thai AS trangThai,
             u.mat_khau_hash AS password,
             u.mat_khau_salt AS salt,
             r.ma AS role
    `;

    const result = await this.neo4j.run<{
      username: string;
      hoTen: string;
      trangThai: string;
      password: string;
      salt: string;
      role: string;
    }>(cypher, { username });

    if (result.length === 0) {
      return null;
    }

    const record = result[0];
    return {
      email: record.username, // Use username as email for backward compat
      username: record.username,
      hoTen: record.hoTen,
      trangThai: record.trangThai,
      password: record.password,
      salt: record.salt,
      role: record.role,
    };
  }

  async validatePassword(
    plainPassword: string,
    hashedPassword: string | undefined,
    salt: string | undefined,
  ): Promise<boolean> {
    if (!hashedPassword) {
      return false;
    }
    // Formula: SHA256(password + "APTXX_SALT")
    // Note: salt parameter is ignored as we use static salt
    const hash = crypto
      .createHash('sha256')
      .update(plainPassword + 'APTXX_SALT')
      .digest('hex');
    return hash === hashedPassword;
  }

  async hashPassword(
    password: string,
  ): Promise<{ hash: string; salt: string }> {
    // Static salt used
    const salt = 'APTXX_SALT'; 
    // Formula: SHA256(password + "APTXX_SALT")
    const hash = crypto
      .createHash('sha256')
      .update(password + 'APTXX_SALT')
      .digest('hex');
    return { hash, salt };
  }
}
