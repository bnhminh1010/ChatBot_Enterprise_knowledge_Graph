// src/departments/departments.service.ts
import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
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
         ORDER BY p.ten`,
      );
      return rows.map((r) => r.dept);
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
        { code },
      );
      if (!rows[0]) throw new NotFoundException('Department not found');
      return rows[0].dept;
    } catch (e) {
      if (e instanceof NotFoundException) throw e;
      throw new ServiceUnavailableException('Database connection error');
    }
  }

  /**
   * NEW: Find department by name (fuzzy matching)
   */
  async findByName(name: string) {
    try {
      const rows = await this.neo.run(
        `MATCH (p:PhongBan)
         WHERE toLower(p.ten) CONTAINS toLower($name) OR toLower(p.code) CONTAINS toLower($name)
         RETURN {
           id: p.code,
           code: p.code,
           name: p.ten,
           description: COALESCE(p.description, '')
         } AS dept
         LIMIT 1`,
        { name },
      );
      if (!rows[0])
        throw new NotFoundException(`Department "${name}" not found`);
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
        dto,
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
        { code, ten: dto.ten },
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
        { code },
      );
      if (!res[0]) throw new NotFoundException('Department not found');
      await this.neo.run(`MATCH (p:PhongBan {code:$code}) DETACH DELETE p`, {
        code,
      });
      return { ok: true };
    } catch (e) {
      if (e instanceof NotFoundException) throw e;
      throw new ServiceUnavailableException('Database connection error');
    }
  }

  // TOOL: search_departments_by_name (already exists as findByName, keep it)

  // TOOL: search_departments_by_code
  async searchByCode(code: string) {
    try {
      const rows = await this.neo.run(
        `MATCH (p:PhongBan)
         WHERE toLower(p.ma) CONTAINS toLower($code)
         RETURN {
           id: p.id,
           code: p.ma,
           name: p.ten,
           headcount: p.so_nhan_su_du_kien,
           email: p.email_lien_he
         } AS dept
         ORDER BY p.ten`,
        { code },
      );
      return rows.map((r) => r.dept);
    } catch (e) {
      throw new ServiceUnavailableException('Database connection error');
    }
  }

  // TOOL: search_departments_by_headcount
  async searchByHeadcount(headcount: number) {
    try {
      const rows = await this.neo.run(
        `MATCH (p:PhongBan)
         WHERE p.so_nhan_su_du_kien = $headcount
         RETURN {
           id: p.id,
           code: p.ma,
           name: p.ten,
           headcount: p.so_nhan_su_du_kien,
           email: p.email_lien_he
         } AS dept
         ORDER BY p.ten`,
        { headcount },
      );
      return rows.map((r) => r.dept);
    } catch (e) {
      throw new ServiceUnavailableException('Database connection error');
    }
  }

  // TOOL: search_departments_by_email
  async searchByEmail(email: string) {
    try {
      const rows = await this.neo.run(
        `MATCH (p:PhongBan)
         WHERE toLower(p.email_lien_he) CONTAINS toLower($email)
         RETURN {
           id: p.id,
           code: p.ma,
           name: p.ten,
           headcount: p.so_nhan_su_du_kien,
           email: p.email_lien_he
         } AS dept
         ORDER BY p.ten`,
        { email },
      );
      return rows.map((r) => r.dept);
    } catch (e) {
      throw new ServiceUnavailableException('Database connection error');
    }
  }

  // TOOL: get_department_by_id
  async getById(id: string) {
    try {
      const rows = await this.neo.run(
        `MATCH (p:PhongBan {id: $id})
         OPTIONAL MATCH (p)-[:CO_NHAN_SU]->(e:NhanSu)
         RETURN {
           id: p.id,
           code: p.ma,
           name: p.ten,
           headcount: p.so_nhan_su_du_kien,
           email: p.email_lien_he,
           employees: collect(DISTINCT {id: e.id, name: e.ho_ten})
         } AS dept`,
        { id },
      );
      if (!rows[0]) throw new NotFoundException('Department not found');
      return rows[0].dept;
    } catch (e) {
      if (e instanceof NotFoundException) throw e;
      throw new ServiceUnavailableException('Database connection error');
    }
  }

  /**
   * TOOL: count_departments
   */
  async count(): Promise<number> {
    try {
      const rows = await this.neo.run(
        `MATCH (p:PhongBan)
         RETURN count(p) AS total`
      );
      return rows[0]?.total?.toNumber() || 0;
    } catch (e) {
      throw new ServiceUnavailableException('Database connection error');
    }
  }
}
