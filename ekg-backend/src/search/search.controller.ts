// ekg-backend/src/search/search.controller.ts
import { Controller, Post, Body, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Neo4jService } from '../core/neo4j/neo4j.service';
import neo4j from 'neo4j-driver';
import { SearchQueryDto } from './dto/search-query.dto';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private neo: Neo4jService) {}

  @ApiOperation({ summary: 'Tìm kiếm chung (NhanSu, KyNang, DuAn) với phân trang' })
  @Post()
  async search(
    @Body() query: SearchQueryDto,
  ) {
    const q = query.q ?? '';
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const unionBlock = `CALL {
         MATCH (e:NhanSu) WHERE toLower(e.ten) CONTAINS toLower($q)
         RETURN 'NhanSu' AS type, e{.*} AS data
         UNION
         MATCH (k:KyNang) WHERE toLower(k.ten) CONTAINS toLower($q)
         RETURN 'KyNang' AS type, k{.*} AS data
         UNION
         MATCH (p:DuAn) WHERE toLower(p.ten) CONTAINS toLower($q) OR toLower(p.key) CONTAINS toLower($q)
         RETURN 'DuAn' AS type, p{.*} AS data
       }`;

    try {
      const itemsRows = await this.neo.run(
        `${unionBlock}
         RETURN {type: type, data: data} AS res 
         SKIP $skip LIMIT $limit`,
        { q, skip: neo4j.int(skip), limit: neo4j.int(limit) }
      );
      const items = itemsRows.map(r => r.res);

      const totalRows = await this.neo.run(
        `${unionBlock}
         RETURN count(*) AS total`,
        { q }
      );
      const rawTotal = totalRows[0]?.total ?? 0;
      const total = rawTotal && typeof (rawTotal as any).toNumber === 'function'
        ? (rawTotal as any).toNumber()
        : Number(rawTotal);

      return { page, limit, total, items };
    } catch {
      throw new ServiceUnavailableException('Database connection error');
    }
  }
}