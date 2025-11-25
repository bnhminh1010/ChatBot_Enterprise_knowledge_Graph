import { Neo4jService } from '../core/neo4j/neo4j.service';
export declare class ProjectsService {
    private neo;
    constructor(neo: Neo4jService);
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
    getById(id: string): Promise<any>;
    count(): Promise<number>;
    getProjectManager(projectName: string): Promise<any>;
}
