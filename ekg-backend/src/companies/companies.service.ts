import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Neo4jService } from '../core/neo4j/neo4j.service';

@Injectable()
export class CompaniesService {
  constructor(private neo: Neo4jService) {}

  async list() {
    try {
      const rows = await this.neo.run(
        `MATCH (c:CongTy)
         RETURN {
           id: c.id,
           code: c.id,
           name: c.ten,
           field: c.linh_vuc,
           employeeCount: c.so_nhan_su,
           founded: c.founded,
           domain: c.domain
         } AS company
         ORDER BY c.ten`
      );
      return rows.map(r => r.company);
    } catch (e) {
      throw new ServiceUnavailableException('Database connection error');
    }
  }

  async findByName(name: string) {
    try {
      const rows = await this.neo.run(
        `MATCH (c:CongTy)
         WHERE toLower(c.ten) CONTAINS toLower($name) OR toLower(c.id) CONTAINS toLower($name)
         RETURN {
           id: c.id,
           code: c.id,
           name: c.ten,
           field: c.linh_vuc,
           employeeCount: c.so_nhan_su,
           founded: c.founded,
           domain: c.domain
         } AS company
         LIMIT 1`,
        { name }
      );
      if (!rows[0]) throw new NotFoundException(`Company "${name}" not found`);
      return rows[0].company;
    } catch (e) {
      if (e instanceof NotFoundException) throw e;
      throw new ServiceUnavailableException('Database connection error');
    }
  }
}
