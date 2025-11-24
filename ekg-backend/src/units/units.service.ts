import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Neo4jService } from '../core/neo4j/neo4j.service';

@Injectable()
export class UnitsService {
  constructor(private neo: Neo4jService) {}

  async list() {
    try {
      const rows = await this.neo.run(
        `MATCH (n:DonVi)
         RETURN {
           id: n.id,
           code: n.id,
           name: n.ten,
           description: COALESCE(n.mo_ta, ''),
           type: n.loai,
           departmentCount: n.so_phong_ban
         } AS unit
         ORDER BY n.ten`
      );
      return rows.map(r => r.unit);
    } catch (e) {
      throw new ServiceUnavailableException('Database connection error');
    }
  }

  async findByName(name: string) {
    try {
      const rows = await this.neo.run(
        `MATCH (n:DonVi)
         WHERE toLower(n.ten) CONTAINS toLower($name) OR toLower(n.id) CONTAINS toLower($name)
         RETURN {
           id: n.id,
           code: n.id,
           name: n.ten,
           description: COALESCE(n.mo_ta, ''),
           type: n.loai,
           departmentCount: n.so_phong_ban
         } AS unit
         LIMIT 1`,
        { name }
      );
      if (!rows[0]) throw new NotFoundException(`Unit "${name}" not found`);
      return rows[0].unit;
    } catch (e) {
      if (e instanceof NotFoundException) throw e;
      throw new ServiceUnavailableException('Database connection error');
    }
  }
}
