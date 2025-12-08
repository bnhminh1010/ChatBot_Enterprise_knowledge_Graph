import { Neo4jService } from '../../core/neo4j/neo4j.service';
export interface EmployeeRecommendation {
    employee: {
        id: string;
        name: string;
        position: string;
        department: string;
        level: string;
    };
    matchScore: number;
    matchingSkills: string[];
    currentWorkload: 'low' | 'medium' | 'high';
    projectCount: number;
    reason: string;
}
export interface TrainingSuggestion {
    skill: string;
    priority: 'high' | 'medium' | 'low';
    reason: string;
    relatedProjects: string[];
}
export interface ProjectRecommendation {
    project: {
        id: string;
        name: string;
        client: string;
        status: string;
    };
    matchScore: number;
    matchingSkills: string[];
    reason: string;
}
export declare class RecommendationService {
    private readonly neo4jService;
    private readonly logger;
    constructor(neo4jService: Neo4jService);
    recommendEmployeesForProject(projectName: string, requiredSkills?: string[], limit?: number): Promise<{
        recommendations: EmployeeRecommendation[];
        projectInfo: any;
    }>;
    recommendTrainingForEmployee(employeeId?: string, employeeName?: string): Promise<{
        suggestions: TrainingSuggestion[];
        employee: any;
    }>;
    recommendProjectsForEmployee(employeeId?: string, employeeName?: string, limit?: number): Promise<{
        recommendations: ProjectRecommendation[];
        employee: any;
    }>;
    private getLevelScore;
    private generateRecommendationReason;
    findEmployeesNeedingTraining(limit?: number): Promise<{
        employees: Array<{
            employee: {
                id: string;
                name: string;
                position: string;
                department: string;
            };
            missingSkills: string[];
            skillGapCount: number;
            priority: 'high' | 'medium' | 'low';
            reason: string;
        }>;
        trendingSkills: string[];
    }>;
}
