// src/departments/departments.service.ts
import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Neo4jService } from '../core/neo4j/neo4j.service';

@Injectable()
export class DepartmentsService {
  constructor(private neo: Neo4jService) {}

  async list() {
    try {
      const rows = await this.neo.run(
        `MATCH (p:PhongBan)
         RETURN {
           id: p.code,
           code: p.code,
           name: p.ten,
           description: COALESCE(p.description, '')
         } AS dept
         ORDER BY p.ten`
      );
      return rows.map(r => r.dept);
    } catch (e) {
      throw new ServiceUnavailableException('Database connection error');
    }
  }

  async get(code: string) {
    try {
      const rows = await this.neo.run(
        `MATCH (p:PhongBan {code:$code}) 
         RETURN {
           id: p.code,
           code: p.code,
           name: p.ten,
           description: COALESCE(p.description, '')
         } AS dept`,
        { code }
      );
      if (!rows[0]) throw new NotFoundException('Department not found');
      return rows[0].dept;
    } catch (e) {
      if (e instanceof NotFoundException) throw e;
      throw new ServiceUnavailableException('Database connection error');
    }
  }

  async create(dto: { code: string; ten: string }) {
    try {
      await this.neo.run(
        `MERGE (p:PhongBan {code:$code}) ON CREATE SET p.ten=$ten`,
        dto
      );
      return { ok: true };
    } catch (e) {
      throw new ServiceUnavailableException('Database connection error');
    }
  }

  async update(code: string, dto: { ten?: string }) {
    try {
      const res = await this.neo.run(
        `MATCH (p:PhongBan {code:$code})
         SET p.ten = coalesce($ten, p.ten)
         RETURN p{.*} AS dept`,
        { code, ten: dto.ten }
      );
      if (!res[0]) throw new NotFoundException('Department not found');
      return res[0].dept;
    } catch (e) {
      if (e instanceof NotFoundException) throw e;
      throw new ServiceUnavailableException('Database connection error');
    }
  }

  async remove(code: string) {
    try {
      const res = await this.neo.run(
        `MATCH (p:PhongBan {code:$code}) RETURN p LIMIT 1`,
        { code }
      );
      if (!res[0]) throw new NotFoundException('Department not found');
      await this.neo.run(`MATCH (p:PhongBan {code:$code}) DETACH DELETE p`, { code });
      return { ok: true };
    } catch (e) {
      if (e instanceof NotFoundException) throw e;
      throw new ServiceUnavailableException('Database connection error');
    }
  }
}
