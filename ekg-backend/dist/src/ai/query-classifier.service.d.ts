export interface QueryClassificationResult {
    level: 'simple' | 'medium' | 'complex';
    type: string;
    value?: string;
    keywords: string[];
}
export declare class QueryClassifierService {
    classifyQuery(message: string): QueryClassificationResult;
    private extractSearchValue;
}
