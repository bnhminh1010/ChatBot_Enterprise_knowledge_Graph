export declare enum IntentType {
    GET_INFO = "get_info",
    SEARCH = "search",
    COUNT = "count",
    COMPARE = "compare",
    AGGREGATE = "aggregate",
    LIST = "list",
    ANALYZE = "analyze",
    GREETING = "greeting",
    GENERAL_KNOWLEDGE = "general_knowledge",
    UPLOAD = "upload"
}
export declare enum EntityType {
    PERSON = "person",
    DEPARTMENT = "department",
    PROJECT = "project",
    SKILL = "skill",
    TECHNOLOGY = "technology",
    POSITION = "position",
    DOCUMENT = "document",
    COMPANY = "company",
    LOCATION = "location",
    DATE = "date",
    NUMBER = "number"
}
export interface Entity {
    type: EntityType;
    value: string;
    normalizedValue?: string;
    confidence: number;
    startIndex?: number;
    endIndex?: number;
    metadata?: Record<string, any>;
}
export interface Intent {
    type: IntentType;
    confidence: number;
    entities: Entity[];
    requiredTools?: string[];
    priority: number;
}
export interface QueryComplexity {
    level: 'simple' | 'medium' | 'complex';
    score: number;
    factors: {
        multiIntent: boolean;
        entityCount: number;
        requiresReasoning: boolean;
        requiresAggregation: boolean;
        requiresComparison: boolean;
    };
}
export interface QueryAnalysisResult {
    originalQuery: string;
    normalizedQuery: string;
    intents: Intent[];
    mainIntent: Intent;
    entities: Entity[];
    complexity: QueryComplexity;
    suggestedTools: string[];
    needsContext: boolean;
    ambiguities?: string[];
    confidence: number;
    metadata?: {
        processingTime: number;
        geminiUsed: boolean;
        fallbackUsed: boolean;
    };
}
export interface QueryAnalysisContext {
    conversationHistory?: Array<{
        role: 'user' | 'assistant';
        content: string;
    }>;
    previousEntities?: Entity[];
    userPreferences?: {
        preferredFormat?: 'table' | 'list' | 'paragraph';
        department?: string;
        role?: string;
    };
}
