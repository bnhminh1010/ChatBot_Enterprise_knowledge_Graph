export interface QueryClassificationResult {
    level: 'simple' | 'medium' | 'complex';
    type: string;
    value?: string;
    keywords: string[];
    confidence: number;
    filters?: {
        department?: string;
        skill?: string;
        project?: string;
        position?: string;
        experience?: number;
    };
}
export declare class QueryClassifierService {
    private readonly simplePatterns;
    private readonly mediumPatterns;
    private readonly complexPatterns;
    classifyQuery(message: string): QueryClassificationResult;
    private calculateSimpleScore;
    private calculateMediumScore;
    private calculateComplexScore;
    private getQueryDetails;
    private extractDepartmentName;
    private extractSkillName;
    private extractProjectName;
    private extractExperience;
    private extractSearchValue;
}
