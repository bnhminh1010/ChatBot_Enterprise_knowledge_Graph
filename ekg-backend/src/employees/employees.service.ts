// src/employees/employees.service.ts
import { Injectable, NotFoundException, ServiceUnavailableException, Logger } from '@nestjs/common';
import neo4j from 'neo4j-driver';
import { Neo4jService } from '../core/neo4j/neo4j.service';

@Injectable()
export class EmployeesService {
  private readonly logger = new Logger(EmployeesService.name);
  
  constructor(private neo: Neo4jService) {}

  async list(skip = 0, limit = 20) {
    try {
      const rows = await this.neo.run(
        `MATCH (e:NhanSu)
         OPTIONAL MATCH (e)-[r:CO_KY_NANG]->(k:KyNang)
         WITH e, collect({name:k.ten, level:r.level}) AS skills
         RETURN {
           id: e.empId,
           empId: e.empId,
           name: e.ten,
           position: e.chucDanh,
           skills: skills
         } AS emp
         ORDER BY e.ten
         SKIP $skip LIMIT $limit`,
        { skip: neo4j.int(skip), limit: neo4j.int(limit) }
      );
      return rows.map(r => r.emp);
    } catch (e) {
      if (e instanceof NotFoundException) throw e;
      const errorMessage = e instanceof Error ? e.message : 'Database connection error';
      this.logger.error('Employees list error:', errorMessage);
      throw new ServiceUnavailableException(errorMessage);
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
           id: e.empId,
           empId: e.empId,
           name: e.ten,
           position: e.chucDanh,
           department: pb.ten,
           skills: collect({name:k.ten, level:r.level}),
           projects: collect(DISTINCT {key:p.key, name:p.ten})
         } AS emp`,
        { empId }
      );
      if (!rows[0]) throw new NotFoundException('Employee not found');
      return rows[0].emp;
    } catch (e) {
      if (e instanceof NotFoundException) throw e;
      const errorMessage = e instanceof Error ? e.message : 'Database connection error';
      this.logger.error('Get employee error:', errorMessage);
      throw new ServiceUnavailableException(errorMessage);
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
      const errorMessage = e instanceof Error ? e.message : 'Database connection error';
      this.logger.error('Create employee error:', errorMessage);
      throw new ServiceUnavailableException(errorMessage);
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
      const errorMessage = e instanceof Error ? e.message : 'Database connection error';
      this.logger.error('Top skills error:', errorMessage);
      throw new ServiceUnavailableException(errorMessage);
    }
  }
}
