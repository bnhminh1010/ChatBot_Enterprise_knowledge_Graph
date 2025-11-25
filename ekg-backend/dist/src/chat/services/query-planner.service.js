"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var QueryPlannerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryPlannerService = void 0;
const common_1 = require("@nestjs/common");
let QueryPlannerService = QueryPlannerService_1 = class QueryPlannerService {
    logger = new common_1.Logger(QueryPlannerService_1.name);
    async createPlan(intent, context) {
        const plan = {
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
        plan.dataSources = [...new Set(plan.steps.map(s => s.dataSource))];
        plan.estimatedTime = plan.steps.length * 100;
        if (plan.dataSources.includes('gemini')) {
            plan.estimatedTime += 500;
        }
        plan.canParallelize = plan.steps.every(s => s.dependencies.length === 0);
        this.logger.debug(`Created plan ${plan.id}: ${plan.steps.length} steps, ${plan.dataSources.join(', ')}`);
        return plan;
    }
    createSearchPlan(intent, context) {
        const steps = [];
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
    createAnalyzePlan(intent, context) {
        const steps = [];
        steps.push({
            id: 'fetch_data',
            type: 'fetch',
            dataSource: 'neo4j',
            operation: 'search',
            params: intent.slots,
            dependencies: [],
        });
        steps.push({
            id: 'aggregate',
            type: 'aggregate',
            dataSource: 'cache',
            operation: 'aggregate',
            params: intent.slots,
            dependencies: ['fetch_data'],
        });
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
    createComparePlan(intent, context) {
        const steps = [];
        steps.push({
            id: 'fetch_entity_1',
            type: 'fetch',
            dataSource: 'neo4j',
            operation: 'search',
            params: { entity: intent.slots.entity1 || intent.contextEntities[0] },
            dependencies: [],
        });
        steps.push({
            id: 'fetch_entity_2',
            type: 'fetch',
            dataSource: 'neo4j',
            operation: 'search',
            params: { entity: intent.slots.entity2 || intent.contextEntities[1] },
            dependencies: [],
        });
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
    createRecommendPlan(intent, context) {
        const steps = [];
        steps.push({
            id: 'fetch_candidates',
            type: 'fetch',
            dataSource: 'neo4j',
            operation: 'search',
            params: intent.slots,
            dependencies: [],
        });
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
    createCountPlan(intent, context) {
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
    createDefaultPlan(intent, context) {
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
    async optimizeExecution(plan) {
        return plan;
    }
};
exports.QueryPlannerService = QueryPlannerService;
exports.QueryPlannerService = QueryPlannerService = QueryPlannerService_1 = __decorate([
    (0, common_1.Injectable)()
], QueryPlannerService);
//# sourceMappingURL=query-planner.service.js.map