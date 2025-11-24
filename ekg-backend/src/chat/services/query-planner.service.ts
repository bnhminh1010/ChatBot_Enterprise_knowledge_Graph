import { Injectable, Logger } from '@nestjs/common';
import { IntentResult } from '../../ai/intent-understanding.service';
import { ConversationContext } from './context-manager.service';

export interface QueryStep {
  id: string;
  type: 'fetch' | 'filter' | 'aggregate' | 'compute' | 'analyze';
  dataSource: 'neo4j' | 'vector' | 'cache' | 'gemini';
  operation: string;
  params: Record<string, any>;
  dependencies: string[];  // IDs of steps this depends on
}

export interface QueryPlan {
  id: string;
  steps: QueryStep[];
  dataSources: string[];
  estimatedTime: number;
  canParallelize: boolean;
}

/**
 * Query Planner Service
 * Tạo execution plan dựa trên intent và context
 */
@Injectable()
export class QueryPlannerService {
  private readonly logger = new Logger(QueryPlannerService.name);

  /**
   * Create execution plan dựa trên intent
   */
  async createPlan(
    intent: IntentResult,
    context: ConversationContext,
  ): Promise<QueryPlan> {
    const plan: QueryPlan = {
      id: `plan_${Date.now()}`,
      steps: [],
      dataSources: [],
      estimatedTime: 0,
      canParallelize: false,
    };

    switch (intent.primary) {
      case 'search':
        plan.steps = this.createSearchPlan(intent, context);
        break;

      case 'analyze':
        plan.steps = this.createAnalyzePlan(intent, context);
        break;

      case 'compare':
        plan.steps = this.createComparePlan(intent, context);
        break;

      case 'recommend':
        plan.steps = this.createRecommendPlan(intent, context);
        break;

      case 'count':
        plan.steps = this.createCountPlan(intent, context);
        break;

      default:
        plan.steps = this.createDefaultPlan(intent, context);
    }

    // Extract data sources
    plan.dataSources = [...new Set(plan.steps.map(s => s.dataSource))];

    // Estimate time (100ms per step, +200ms for Gemini)
    plan.estimatedTime = plan.steps.length * 100;
    if (plan.dataSources.includes('gemini')) {
      plan.estimatedTime += 500;
    }

    // Check if can parallelize (no dependencies)
    plan.canParallelize = plan.steps.every(s => s.dependencies.length === 0);

    this.logger.debug(
      `Created plan ${plan.id}: ${plan.steps.length} steps, ${plan.dataSources.join(', ')}`,
    );

    return plan;
  }

  /**
   * Create plan for search intent
   */
  private createSearchPlan(intent: IntentResult, context: ConversationContext): QueryStep[] {
    const steps: QueryStep[] = [];

    // Step 1: Fetch data from Neo4j
    steps.push({
      id: 'fetch_data',
      type: 'fetch',
      dataSource: 'neo4j',
      operation: 'search',
      params: {
        ...intent.slots,
        contextEntities: intent.contextEntities,
      },
      dependencies: [],
    });

    // Step 2: Filter if needed
    if (intent.secondary?.includes('filter')) {
      steps.push({
        id: 'filter_results',
        type: 'filter',
        dataSource: 'cache',
        operation: 'filter',
        params: intent.slots,
        dependencies: ['fetch_data'],
      });
    }

    // Step 3: Sort if needed
    if (intent.secondary?.includes('sort')) {
      steps.push({
        id: 'sort_results',
        type: 'compute',
        dataSource: 'cache',
        operation: 'sort',
        params: intent.slots,
        dependencies: intent.secondary?.includes('filter') ? ['filter_results'] : ['fetch_data'],
      });
    }

    return steps;
  }

  /**
   * Create plan for analyze intent
   */
  private createAnalyzePlan(intent: IntentResult, context: ConversationContext): QueryStep[] {
    const steps: QueryStep[] = [];

    // Step 1: Fetch data
    steps.push({
      id: 'fetch_data',
      type: 'fetch',
      dataSource: 'neo4j',
      operation: 'search',
      params: intent.slots,
      dependencies: [],
    });

    // Step 2: Aggregate data
    steps.push({
      id: 'aggregate',
      type: 'aggregate',
      dataSource: 'cache',
      operation: 'aggregate',
      params: intent.slots,
      dependencies: ['fetch_data'],
    });

    // Step 3: Analyze with Gemini
    steps.push({
      id: 'analyze',
      type: 'analyze',
      dataSource: 'gemini',
      operation: 'analyze',
      params: {
        context: context.currentTopic,
        data: 'from_aggregate',
      },
      dependencies: ['aggregate'],
    });

    return steps;
  }

  /**
   * Create plan for compare intent
   */
  private createComparePlan(intent: IntentResult, context: ConversationContext): QueryStep[] {
    const steps: QueryStep[] = [];

    // Step 1: Fetch first entity
    steps.push({
      id: 'fetch_entity_1',
      type: 'fetch',
      dataSource: 'neo4j',
      operation: 'search',
      params: { entity: intent.slots.entity1 || intent.contextEntities[0] },
      dependencies: [],
    });

    // Step 2: Fetch second entity (can parallelize)
    steps.push({
      id: 'fetch_entity_2',
      type: 'fetch',
      dataSource: 'neo4j',
      operation: 'search',
      params: { entity: intent.slots.entity2 || intent.contextEntities[1] },
      dependencies: [],
    });

    // Step 3: Compare with Gemini
    steps.push({
      id: 'compare',
      type: 'analyze',
      dataSource: 'gemini',
      operation: 'compare',
      params: {
        context: context.currentTopic,
      },
      dependencies: ['fetch_entity_1', 'fetch_entity_2'],
    });

    return steps;
  }

  /**
   * Create plan for recommend intent
   */
  private createRecommendPlan(intent: IntentResult, context: ConversationContext): QueryStep[] {
    const steps: QueryStep[] = [];

    // Step 1: Fetch candidates
    steps.push({
      id: 'fetch_candidates',
      type: 'fetch',
      dataSource: 'neo4j',
      operation: 'search',
      params: intent.slots,
      dependencies: [],
    });

    // Step 2: Vector search for similarity (if applicable)
    if (context.currentTopic.includes('skills')) {
      steps.push({
        id: 'vector_search',
        type: 'fetch',
        dataSource: 'vector',
        operation: 'similarity_search',
        params: { query: intent.slots.requirements },
        dependencies: [],
      });
    }

    // Step 3: Rank and recommend with Gemini
    steps.push({
      id: 'recommend',
      type: 'analyze',
      dataSource: 'gemini',
      operation: 'recommend',
      params: {
        criteria: intent.slots,
        context: context.currentTopic,
      },
      dependencies: steps.length > 1 ? ['fetch_candidates', 'vector_search'] : ['fetch_candidates'],
    });

    return steps;
  }

  /**
   * Create plan for count intent
   */
  private createCountPlan(intent: IntentResult, context: ConversationContext): QueryStep[] {
    return [
      {
        id: 'count',
        type: 'aggregate',
        dataSource: 'neo4j',
        operation: 'count',
        params: intent.slots,
        dependencies: [],
      },
    ];
  }

  /**
   * Default plan
   */
  private createDefaultPlan(intent: IntentResult, context: ConversationContext): QueryStep[] {
    return [
      {
        id: 'default_fetch',
        type: 'fetch',
        dataSource: 'neo4j',
        operation: 'search',
        params: intent.slots,
        dependencies: [],
      },
    ];
  }

  /**
   * Optimize execution plan (future enhancement)
   */
  async optimizeExecution(plan: QueryPlan): Promise<QueryPlan> {
    // For now, return as-is
    // Future: reorder steps, merge similar queries, etc.
    return plan;
  }
}
