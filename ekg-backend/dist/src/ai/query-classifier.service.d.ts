export interface QueryClassificationResult {
    level: 'simple' | 'medium' | 'complex';
    type: string;
    value?: string;
    keywords: string[];
    filters?: {
        department?: string;
        skill?: string;
        project?: string;
        position?: string;
    };
}
export declare class QueryClassifierService {
    classifyQuery(message: string): QueryClassificationResult;
    private extractSearchValue;
    private extractDepartmentName;
    private extractSkillName;
    private extractProjectName;
}
