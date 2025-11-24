import { Neo4jService } from '../core/neo4j/neo4j.service';
export declare class SkillsService {
    private neo;
    constructor(neo: Neo4jService);
    list(): Promise<any[]>;
    top(limit?: number): Promise<any[]>;
    search(term: string): Promise<any[]>;
    create(dto: {
        ten: string;
    }): Promise<{
        ok: boolean;
    }>;
    addToEmployee(dto: {
        empId: string;
        ten: string;
        level?: number;
    }): Promise<{
        ok: boolean;
    }>;
    related(ten: string, limit?: number): Promise<any[]>;
}
