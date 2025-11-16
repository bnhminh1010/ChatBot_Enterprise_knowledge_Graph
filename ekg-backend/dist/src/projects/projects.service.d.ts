import { Neo4jService } from '../core/neo4j/neo4j.service';
export declare class ProjectsService {
    private neo;
    constructor(neo: Neo4jService);
    list(): Promise<any[]>;
    getFull(key: string): Promise<any>;
    create(dto: {
        key: string;
        ten: string;
        trangThai?: string;
    }): Promise<{
        ok: boolean;
    }>;
}
