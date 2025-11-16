import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Neo4jService } from '../core/neo4j/neo4j.service';

@Injectable()
export class ProjectsService {
  constructor(private neo: Neo4jService) {}

  async list() {
    try {
      const rows = await this.neo.run(
        `MATCH (p:DuAn)
         OPTIONAL MATCH (p)-[:SU_DUNG_CONG_NGHE]->(c:CongNghe)
         RETURN p{.*, congNghe: collect(DISTINCT c.ten)} AS prj
         ORDER BY p.ten`
      );
      return rows.map(r => r.prj);
    } catch (e) {
      throw new ServiceUnavailableException('Database connection error');
    }
  }

  async getFull(key: string) {
    try {
      const rows = await this.neo.run(
        `MATCH (p:DuAn {key:$key})
         OPTIONAL MATCH (p)-[:SU_DUNG_CONG_NGHE]->(tech:CongNghe)
         OPTIONAL MATCH (e:NhanSu)-[:LAM_DU_AN]->(p)
         OPTIONAL MATCH (pb:PhongBan)-[:CO_NHAN_SU]->(e)
         RETURN {
           key: p.key, ten: p.ten, trangThai: p.trangThai,
           congNghe: collect(DISTINCT tech.ten),
           nhanSu: collect(DISTINCT e{ .empId, .ten, .chucDanh }),
           phongBan: collect(DISTINCT pb{ .code, .ten })
         } AS full`,
        { key }
      );
      if (!rows[0]) throw new NotFoundException('Project not found');
      return rows[0].full;
    } catch (e) {
      if (e instanceof NotFoundException) throw e;
      throw new ServiceUnavailableException('Database connection error');
    }
  }

  async create(dto: { key: string; ten: string; trangThai?: string }) {
    try {
      await this.neo.run(
        `MERGE (p:DuAn {key:$key})
         ON CREATE SET p.ten=$ten, p.trangThai=coalesce($trangThai,'Active')`,
        dto
      );
      return { ok: true };
    } catch (e) {
      throw new ServiceUnavailableException('Database connection error');
    }
  }
}
