import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Neo4jService } from '../core/neo4j/neo4j.service';

@Injectable()
export class PositionsService {
  constructor(private neo: Neo4jService) {}

  async list() {
    try {
      const rows = await this.neo.run(
        `MATCH (p:ChucDanh)
         RETURN {
           id: p.id,
           code: p.id,
           name: p.ten,
           description: COALESCE(p.mo_ta_ngan, ''),
           level: p.cap_bac,
           group: p.nhom_nghe
         } AS position
         ORDER BY p.ten`,
      );
      return rows.map((r) => r.position);
    } catch (e) {
      throw new ServiceUnavailableException('Database connection error');
    }
  }

  async findByName(name: string) {
    try {
      const rows = await this.neo.run(
        `MATCH (p:ChucDanh)
         WHERE toLower(p.ten) CONTAINS toLower($name) OR toLower(p.id) CONTAINS toLower($name)
         RETURN {
           id: p.id,
           code: p.id,
           name: p.ten,
           description: COALESCE(p.mo_ta_ngan, ''),
           level: p.cap_bac,
           group: p.nhom_nghe
         } AS position
         LIMIT 1`,
        { name },
      );
      if (!rows[0]) throw new NotFoundException(`Position "${name}" not found`);
      return rows[0].position;
    } catch (e) {
      if (e instanceof NotFoundException) throw e;
      throw new ServiceUnavailableException('Database connection error');
    }
  }
  async search(filters: {
    name?: string;
    level?: string;
    group?: string;
    keyword?: string;
  }) {
    try {
      let cypher = `MATCH (p:ChucDanh) WHERE 1=1`;
      const params: any = {};

      if (filters.name) {
        cypher += ` AND toLower(p.ten) CONTAINS toLower($name)`;
        params.name = filters.name;
      }

      if (filters.level) {
        cypher += ` AND toLower(p.cap_bac) = toLower($level)`;
        params.level = filters.level;
      }

      if (filters.group) {
        cypher += ` AND toLower(p.nhom_nghe) CONTAINS toLower($group)`;
        params.group = filters.group;
      }

      if (filters.keyword) {
        cypher += ` AND (
          toLower(p.ten) CONTAINS toLower($keyword) OR 
          toLower(p.id) CONTAINS toLower($keyword) OR 
          toLower(p.mo_ta_ngan) CONTAINS toLower($keyword)
        )`;
        params.keyword = filters.keyword;
      }

      cypher += ` RETURN {
        id: p.id,
        code: p.id,
        name: p.ten,
        description: COALESCE(p.mo_ta_ngan, ''),
        level: p.cap_bac,
        group: p.nhom_nghe
      } AS position ORDER BY p.cap_bac, p.ten LIMIT 20`;

      const rows = await this.neo.run(cypher, params);
      return rows.map((r) => r.position);
    } catch (e) {
      throw new ServiceUnavailableException('Database connection error');
    }
  }

  /**
   * TOOL: count_positions
   */
  async count(): Promise<number> {
    try {
      const rows = await this.neo.run(
        `MATCH (p:ChucDanh)
         RETURN count(p) AS total`,
      );
      return rows[0]?.total?.toNumber() || 0;
    } catch (e) {
      throw new ServiceUnavailableException('Database connection error');
    }
  }
}
