import { OnModuleInit } from '@nestjs/common';
import { Neo4jService } from '../../core/neo4j/neo4j.service';
interface NodeTypeInfo {
    label: string;
    displayNameVi: string;
    count: number;
    properties: string[];
    sampleData: Record<string, any>[];
}
interface RelationshipInfo {
    type: string;
    fromLabel: string;
    toLabel: string;
    descriptionVi: string;
    count: number;
}
interface DatabaseSchema {
    nodeTypes: NodeTypeInfo[];
    relationships: RelationshipInfo[];
    lastUpdated: Date;
}
interface DatabaseStats {
    employees: {
        total: number;
        byDepartment: Record<string, number>;
    };
    departments: {
        total: number;
        names: string[];
    };
    projects: {
        total: number;
        byStatus: Record<string, number>;
    };
    skills: {
        total: number;
        topSkills: string[];
    };
    documents: {
        total: number;
    };
    lastUpdated: Date;
}
export declare class DatabaseContextService implements OnModuleInit {
    private readonly neo4j;
    private readonly logger;
    private schemaCache;
    private statsCache;
    private contextStringCache;
    private readonly SCHEMA_TTL_MS;
    private readonly STATS_TTL_MS;
    private schemaLastLoaded;
    private statsLastLoaded;
    private readonly nodeTypeMap;
    private readonly relationshipMap;
    constructor(neo4j: Neo4jService);
    onModuleInit(): Promise<void>;
    loadFullContext(): Promise<void>;
    private loadSchema;
    private loadStatistics;
    private sanitizeNodeData;
    private buildContextString;
    getAgentContext(): Promise<string>;
    getSchema(): DatabaseSchema | null;
    getStatistics(): DatabaseStats | null;
    forceRefresh(): Promise<void>;
}
export {};
