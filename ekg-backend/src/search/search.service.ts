import { Injectable } from '@nestjs/common';
import { Neo4jService } from '../core/neo4j/neo4j.service';
import neo4j from 'neo4j-driver';

export interface SearchQuery {
  query: string;
  page?: number;
  limit?: number;
}

export interface SearchResult {
  type: string;
  id: string;
  name: string;
  [key: string]: any;
}

@Injectable()
export class SearchService {
  constructor(private neo: Neo4jService) {}

  /**
   * Global search across all entities
   */
  async search(params: SearchQuery): Promise<SearchResult[]> {
    const q = params.query ?? '';
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const skip = (page - 1) * limit;

    const unionBlock = `CALL {
      MATCH (e:NhanSu) WHERE toLower(e.ho_ten) CONTAINS toLower($q)
      RETURN 'Employee' AS type, e.id AS id, e.ho_ten AS name, e.chucDanh AS extra
      UNION
      MATCH (k:KyNang) WHERE toLower(k.ten) CONTAINS toLower($q)
      RETURN 'Skill' AS type, k.ten AS id, k.ten AS name, COALESCE(k.category, '') AS extra
      UNION
      MATCH (p:DuAn) WHERE toLower(p.ten) CONTAINS toLower($q) OR toLower(p.ma) CONTAINS toLower($q)
      RETURN 'Project' AS type, p.id AS id, p.ten AS name, p.trang_thai AS extra
      UNION
      MATCH (d:PhongBan) WHERE toLower(d.ten) CONTAINS toLower($q)
      RETURN 'Department' AS type, d.id AS id, d.ten AS name, COALESCE(d.description, '') AS extra
    }`;

    try {
      const rows = await this.neo.run(
        `${unionBlock}
         RETURN {type: type, id: id, name: name} AS res 
         SKIP $skip LIMIT $limit`,
        { q, skip: neo4j.int(skip), limit: neo4j.int(limit) },
      );

      return rows.map((r: any) => r.res);
    } catch (error) {
      throw new Error(`Search failed: ${error}`);
    }
  }
}
