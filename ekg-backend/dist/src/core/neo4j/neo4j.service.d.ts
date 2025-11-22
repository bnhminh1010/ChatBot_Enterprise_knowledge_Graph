import { OnModuleDestroy } from '@nestjs/common';
import { Session } from 'neo4j-driver';
export declare class Neo4jService implements OnModuleDestroy {
    private driver;
    private readonly logger;
    private ensureDriver;
    getSession(database?: string): Session;
    verifyConnection(): Promise<boolean>;
    run<T = any>(cypher: string, params?: Record<string, any>): Promise<T[]>;
    onModuleDestroy(): Promise<void>;
}
