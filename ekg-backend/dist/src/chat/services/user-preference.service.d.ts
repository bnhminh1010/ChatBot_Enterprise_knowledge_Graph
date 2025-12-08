export interface UserPreferences {
    userId: string;
    frequentTopics: TopicFrequency[];
    preferredResponseStyle: 'concise' | 'detailed' | 'auto';
    frequentlyAskedEntities: EntityFrequency[];
    averageQueryLength: number;
    preferredTimeOfDay: string;
    totalQueries: number;
    createdAt: number;
    updatedAt: number;
}
export interface TopicFrequency {
    topic: string;
    count: number;
    lastAsked: number;
}
export interface EntityFrequency {
    type: string;
    value: string;
    count: number;
    lastAsked: number;
}
export declare class UserPreferenceService {
    private readonly logger;
    private redis;
    private readonly TTL_DAYS;
    constructor();
    getPreferences(userId: string): Promise<UserPreferences | null>;
    private createDefaultPreferences;
    recordQuery(userId: string, query: string, detectedEntities: Array<{
        type: string;
        value: string;
    }>, detectedTopic: string): Promise<void>;
    getPersonalizationHints(userId: string): Promise<{
        topTopics: string[];
        frequentEntities: Array<{
            type: string;
            value: string;
        }>;
        suggestedResponseStyle: string;
    }>;
    setResponseStyle(userId: string, style: 'concise' | 'detailed' | 'auto'): Promise<void>;
    getUserStats(userId: string): Promise<{
        totalQueries: number;
        topTopic: string | null;
        favoriteEntity: string | null;
        memberSince: number | null;
    }>;
    onModuleDestroy(): Promise<void>;
}
