// src/employees/employees.service.ts
import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import neo4j from 'neo4j-driver';
import { Neo4jService } from '../core/neo4j/neo4j.service';

@Injectable()
export class EmployeesService {
  constructor(private neo: Neo4jService) {}

  async list(skip = 0, limit = 20) {
    try {
      const rows = await this.neo.run(
        `MATCH (e:NhanSu)
         OPTIONAL MATCH (e)-[r:CO_KY_NANG]->(k:KyNang)
         WITH e, collect({ten:k.ten, level:r.level}) AS skills
         RETURN e{.*, skills: skills} AS emp
         ORDER BY e.ten
         SKIP $skip LIMIT $limit`,
        { skip: neo4j.int(skip), limit: neo4j.int(limit) }
      );
      return rows.map(r => r.emp);
    } catch (e) {
      if (e instanceof NotFoundException) throw e;
      throw new ServiceUnavailableException('Database connection error');
    }
  }

  async get(empId: string) {
    try {
      const rows = await this.neo.run(
        `MATCH (e:NhanSu {empId:$empId})
         OPTIONAL MATCH (pb:PhongBan)-[:CO_NHAN_SU]->(e)
         OPTIONAL MATCH (e)-[r:CO_KY_NANG]->(k:KyNang)
         OPTIONAL MATCH (e)-[:LAM_DU_AN]->(p:DuAn)
         RETURN {
           empId:e.empId, ten:e.ten, chucDanh:e.chucDanh,
           phongBan: pb.ten,
           kyNang: collect({ten:k.ten, level:r.level}),
           duAn: collect(DISTINCT {key:p.key, ten:p.ten})
         } AS emp`,
        { empId }
      );
      if (!rows[0]) throw new NotFoundException('Employee not found');
      return rows[0].emp;
    } catch (e) {
      if (e instanceof NotFoundException) throw e;
      throw new ServiceUnavailableException('Database connection error');
    }
  }

  async create(dto: { empId: string; ten: string; chucDanh?: string; phongBanCode: string }) {
    try {
      await this.neo.run(
        `MATCH (pb:PhongBan {code:$phongBanCode})
         MERGE (e:NhanSu {empId:$empId})
         ON CREATE SET e.ten=$ten, e.chucDanh=$chucDanh
         MERGE (pb)-[:CO_NHAN_SU]->(e)`,
        dto
      );
      return { ok: true };
    } catch (e) {
      throw new ServiceUnavailableException('Database connection error');
    }
  }

  async topSkills(limit = 10) {
    try {
      const rows = await this.neo.run(
        `MATCH (:NhanSu)-[r:CO_KY_NANG]->(k:KyNang)
         RETURN k.ten AS skill, count(r) AS freq
         ORDER BY freq DESC
         LIMIT $limit`,
        { limit: neo4j.int(limit) }
      );
      return rows;
    } catch (e) {
      throw new ServiceUnavailableException('Database connection error');
    }
  }
}
