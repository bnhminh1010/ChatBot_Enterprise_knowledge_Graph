// ekg-backend/src/search/search.controller.ts
import { Controller, Post, Body, ServiceUnavailableException, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Neo4jService } from '../core/neo4j/neo4j.service';
import neo4j from 'neo4j-driver';
import { SearchQueryDto } from './dto/search-query.dto';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  private readonly logger = new Logger(SearchController.name);

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
         RETURN 'Employee' AS type, {id: e.empId, name: e.ten, position: e.chucDanh} AS data
         UNION
         MATCH (k:KyNang) WHERE toLower(k.ten) CONTAINS toLower($q)
         RETURN 'Skill' AS type, {id: k.ten, name: k.ten, category: COALESCE(k.category, '')} AS data
         UNION
         MATCH (p:DuAn) WHERE toLower(p.ten) CONTAINS toLower($q) OR toLower(p.key) CONTAINS toLower($q)
         RETURN 'Project' AS type, {id: p.key, key: p.key, name: p.ten, status: COALESCE(p.trangThai, 'Active')} AS data
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
    } catch (error: any) {
      const errorMessage = error?.message || 'Database connection error';
      this.logger.error('Search error:', errorMessage);
      throw new ServiceUnavailableException(errorMessage);
    }
  }
}