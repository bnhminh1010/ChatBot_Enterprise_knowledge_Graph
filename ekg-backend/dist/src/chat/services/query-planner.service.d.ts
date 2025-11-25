import { IntentResult } from '../../ai/intent-understanding.service';
import { ConversationContext } from './context-manager.service';
export interface QueryStep {
    id: string;
    type: 'fetch' | 'filter' | 'aggregate' | 'compute' | 'analyze';
    dataSource: 'neo4j' | 'vector' | 'cache' | 'gemini';
    operation: string;
    params: Record<string, any>;
    dependencies: string[];
}
export interface QueryPlan {
    id: string;
    steps: QueryStep[];
    dataSources: string[];
    estimatedTime: number;
    canParallelize: boolean;
}
export declare class QueryPlannerService {
    private readonly logger;
    createPlan(intent: IntentResult, context: ConversationContext): Promise<QueryPlan>;
    private createSearchPlan;
    private createAnalyzePlan;
    private createComparePlan;
    private createRecommendPlan;
    private createCountPlan;
    private createDefaultPlan;
    optimizeExecution(plan: QueryPlan): Promise<QueryPlan>;
}
