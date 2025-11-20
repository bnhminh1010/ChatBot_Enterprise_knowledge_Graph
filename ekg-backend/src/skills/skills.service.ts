import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import neo4j from 'neo4j-driver';
import { Neo4jService } from '../core/neo4j/neo4j.service';

@Injectable()
export class SkillsService {
  constructor(private neo: Neo4jService) {}

  async list() {
    try {
      const rows = await this.neo.run(
        `MATCH (k:KyNang) 
         RETURN {
           id: k.ten,
           name: k.ten,
           category: COALESCE(k.category, '')
         } AS skill 
         ORDER BY k.ten`
      );
      return rows.map(r => r.skill);
    } catch (e) {
      throw new ServiceUnavailableException('Database connection error');
    }
  }

  async top(limit = 10) {
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

  async search(term: string) {
    try {
      const rows = await this.neo.run(
        `MATCH (k:KyNang) WHERE toLower(k.ten) CONTAINS toLower($term) 
         RETURN {
           id: k.ten,
           name: k.ten,
           category: COALESCE(k.category, '')
         } AS skill`,
        { term }
      );
      return rows.map(r => r.skill);
    } catch (e) {
      throw new ServiceUnavailableException('Database connection error');
    }
  }

  async create(dto: { ten: string }) {
    try {
      await this.neo.run(`MERGE (k:KyNang {ten:$ten})`, dto);
      return { ok: true };
    } catch (e) {
      throw new ServiceUnavailableException('Database connection error');
    }
  }

  async addToEmployee(dto: { empId: string; ten: string; level?: number }) {
    try {
      await this.neo.run(
        `MATCH (e:NhanSu {empId:$empId})
         MERGE (k:KyNang {ten:$ten})
         MERGE (e)-[r:CO_KY_NANG]->(k)
         SET r.level = coalesce($level, r.level, 1)`,
        { empId: dto.empId, ten: dto.ten, level: dto.level ?? 1 }
      );
      return { ok: true };
    } catch (e) {
      throw new ServiceUnavailableException('Database connection error');
    }
  }

  async related(ten: string, limit = 5) {
    try {
      const rows = await this.neo.run(
        `MATCH (e:NhanSu)-[:CO_KY_NANG]->(k1:KyNang {ten:$ten})
         MATCH (e)-[:CO_KY_NANG]->(k2:KyNang)
         WHERE k2 <> k1
         RETURN k2.ten AS skill, count(*) AS freq
         ORDER BY freq DESC
         LIMIT $limit`,
        { ten, limit: neo4j.int(limit) }
      );
      return rows;
    } catch (e) {
      throw new ServiceUnavailableException('Database connection error');
    }
  }
}
