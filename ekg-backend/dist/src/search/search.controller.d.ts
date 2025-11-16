import { Neo4jService } from '../core/neo4j/neo4j.service';
import { SearchQueryDto } from './dto/search-query.dto';
export declare class SearchController {
    private neo;
    constructor(neo: Neo4jService);
    search(query: SearchQueryDto): Promise<{
        page: number;
        limit: number;
        total: any;
        items: any[];
    }>;
}
