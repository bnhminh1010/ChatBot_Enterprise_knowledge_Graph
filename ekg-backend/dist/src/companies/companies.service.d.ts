import { Neo4jService } from '../core/neo4j/neo4j.service';
export declare class CompaniesService {
    private neo;
    constructor(neo: Neo4jService);
    list(): Promise<any[]>;
    findByName(name: string): Promise<any>;
}
