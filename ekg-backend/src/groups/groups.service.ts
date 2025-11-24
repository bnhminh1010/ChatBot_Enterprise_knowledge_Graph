import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Neo4jService } from '../core/neo4j/neo4j.service';

@Injectable()
export class GroupsService {
  constructor(private neo: Neo4jService) {}

  async list() {
    try {
      const rows = await this.neo.run(
        `MATCH (n:Nhom)
         RETURN {
           id: n.id,
           code: n.ma,
           name: n.ten,
           description: COALESCE(n.mo_ta, ''),
           type: n.loai_nhom,
           memberCount: n.so_nhan_su
         } AS group
         ORDER BY n.ten`
      );
      return rows.map(r => r.group);
    } catch (e) {
      throw new ServiceUnavailableException('Database connection error');
    }
  }

  async findByName(name: string) {
    try {
      const rows = await this.neo.run(
        `MATCH (n:Nhom)
         WHERE toLower(n.ten) CONTAINS toLower($name) OR toLower(n.ma) CONTAINS toLower($name)
         RETURN {
           id: n.id,
           code: n.ma,
           name: n.ten,
           description: COALESCE(n.mo_ta, ''),
           type: n.loai_nhom,
           memberCount: n.so_nhan_su
         } AS group
         LIMIT 1`,
        { name }
      );
      if (!rows[0]) throw new NotFoundException(`Group "${name}" not found`);
      return rows[0].group;
    } catch (e) {
      if (e instanceof NotFoundException) throw e;
      throw new ServiceUnavailableException('Database connection error');
    }
  }
}
