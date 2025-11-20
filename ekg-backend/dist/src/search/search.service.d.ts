import { Neo4jService } from '../core/neo4j/neo4j.service';
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
export declare class SearchService {
    private neo;
    constructor(neo: Neo4jService);
    search(params: SearchQuery): Promise<SearchResult[]>;
}
