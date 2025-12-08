import { Neo4jService } from '../core/neo4j/neo4j.service';
import { GraphDataExtractor } from '../chat/services/graph-data-extractor.service';
export declare class ProjectsService {
    private neo;
    private graphExtractor;
    private readonly logger;
    constructor(neo: Neo4jService, graphExtractor: GraphDataExtractor);
    list(): Promise<any[]>;
    getFull(key: string): Promise<any>;
    create(dto: {
        key: string;
        ten: string;
        trang_thai?: string;
    }): Promise<{
        ok: boolean;
    }>;
    searchByClient(client: string): Promise<any[]>;
    searchByField(field: string): Promise<any[]>;
    searchByType(type: string): Promise<any[]>;
    searchByCode(code: string): Promise<any[]>;
    searchByStartDate(startDate: string): Promise<any[]>;
    searchByStatus(status: string): Promise<any[]>;
    searchByName(name: string, skip?: number, limit?: number): Promise<{
        projects: any[];
        graphData: any;
    }>;
    getById(id: string): Promise<any>;
    count(): Promise<number>;
    getProjectManager(projectName: string): Promise<any>;
}
