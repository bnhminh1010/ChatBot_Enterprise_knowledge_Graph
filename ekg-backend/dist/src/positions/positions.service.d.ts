import { Neo4jService } from '../core/neo4j/neo4j.service';
export declare class PositionsService {
    private neo;
    constructor(neo: Neo4jService);
    list(): Promise<any[]>;
    findByName(name: string): Promise<any>;
    search(filters: {
        name?: string;
        level?: string;
        group?: string;
        keyword?: string;
    }): Promise<any[]>;
    count(): Promise<number>;
}
