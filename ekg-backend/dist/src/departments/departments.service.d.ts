import { Neo4jService } from '../core/neo4j/neo4j.service';
export declare class DepartmentsService {
    private neo;
    constructor(neo: Neo4jService);
    list(): Promise<any[]>;
    get(code: string): Promise<any>;
    findByName(name: string): Promise<any>;
    create(dto: {
        code: string;
        ten: string;
    }): Promise<{
        ok: boolean;
    }>;
    update(code: string, dto: {
        ten?: string;
    }): Promise<any>;
    remove(code: string): Promise<{
        ok: boolean;
    }>;
}
