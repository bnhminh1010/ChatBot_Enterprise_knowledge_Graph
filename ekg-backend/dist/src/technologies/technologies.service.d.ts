import { Neo4jService } from '../core/neo4j/neo4j.service';
export declare class TechnologiesService {
    private neo;
    constructor(neo: Neo4jService);
    list(): Promise<any[]>;
    findByName(name: string): Promise<any>;
    search(filters: {
        id?: string;
        name?: string;
        type?: string;
        description?: string;
        keyword?: string;
    }): Promise<any[]>;
    count(): Promise<number>;
}
