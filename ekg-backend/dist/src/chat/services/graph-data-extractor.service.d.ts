import { GraphNode, GraphLink } from './types/graph.types';
export interface Neo4jGraphData {
    nodes: GraphNode[];
    links: GraphLink[];
}
export declare class GraphDataExtractor {
    private readonly logger;
    extractGraphData(records: any[]): Neo4jGraphData | null;
    private isNode;
    private isRelationship;
    private isPath;
    private addNode;
    private addRelationship;
    private extractPath;
    private normalizeNodeType;
    private getNodeSize;
    shouldGenerateGraph(records: any[]): boolean;
}
