import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Neo4jService } from '../core/neo4j/neo4j.service';

@Injectable()
export class TechnologiesService {
  constructor(private neo: Neo4jService) {}

  async list() {
    try {
      const rows = await this.neo.run(
        `MATCH (t:CongNghe)
         RETURN {
           id: t.id,
           code: t.id,
           name: t.ten,
           type: t.loai,
           description: COALESCE(t.mo_ta, '')
         } AS tech
         ORDER BY t.ten`,
      );
      return rows.map((r) => r.tech);
    } catch (e) {
      throw new ServiceUnavailableException('Database connection error');
    }
  }

  async findByName(name: string) {
    try {
      const rows = await this.neo.run(
        `MATCH (t:CongNghe)
         WHERE toLower(t.ten) CONTAINS toLower($name) OR toLower(t.id) CONTAINS toLower($name)
         RETURN {
           id: t.id,
           code: t.id,
           name: t.ten,
           type: t.loai,
           description: COALESCE(t.mo_ta, '')
         } AS tech
         LIMIT 1`,
        { name },
      );
      if (!rows[0])
        throw new NotFoundException(`Technology "${name}" not found`);
      return rows[0].tech;
    } catch (e) {
      if (e instanceof NotFoundException) throw e;
      throw new ServiceUnavailableException('Database connection error');
    }
  }
  async search(filters: {
    id?: string;
    name?: string;
    type?: string;
    description?: string;
    keyword?: string;
  }) {
    try {
      let cypher = `MATCH (t:CongNghe) WHERE 1=1`;
      const params: any = {};

      if (filters.id) {
        cypher += ` AND toLower(t.id) = toLower($id)`;
        params.id = filters.id;
      }

      if (filters.name) {
        cypher += ` AND toLower(t.ten) CONTAINS toLower($name)`;
        params.name = filters.name;
      }

      if (filters.type) {
        cypher += ` AND toLower(t.loai) CONTAINS toLower($type)`;
        params.type = filters.type;
      }

      if (filters.description) {
        cypher += ` AND toLower(t.mo_ta) CONTAINS toLower($description)`;
        params.description = filters.description;
      }

      if (filters.keyword) {
        cypher += ` AND (
          toLower(t.ten) CONTAINS toLower($keyword) OR 
          toLower(t.id) CONTAINS toLower($keyword) OR 
          toLower(t.loai) CONTAINS toLower($keyword) OR
          toLower(t.mo_ta) CONTAINS toLower($keyword)
        )`;
        params.keyword = filters.keyword;
      }

      cypher += ` RETURN {
        id: t.id,
        code: t.id,
        name: t.ten,
        type: t.loai,
        description: COALESCE(t.mo_ta, '')
      } AS tech ORDER BY t.loai, t.ten LIMIT 20`;

      const rows = await this.neo.run(cypher, params);
      return rows.map((r) => r.tech);
    } catch (e) {
      throw new ServiceUnavailableException('Database connection error');
    }
  }

  /**
   * TOOL: count_technologies
   */
  async count(): Promise<number> {
    try {
      const rows = await this.neo.run(
        `MATCH (t:CongNghe)
         RETURN count(t) AS total`,
      );
      return rows[0]?.total?.toNumber() || 0;
    } catch (e) {
      throw new ServiceUnavailableException('Database connection error');
    }
  }
}
