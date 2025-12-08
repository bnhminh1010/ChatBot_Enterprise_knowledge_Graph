/**
 * Graph data types for visualization
 */

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  val?: number;
  properties?: Record<string, any>;
}

export interface GraphLink {
  source: string;
  target: string;
  relationship: string;
  value?: number;
  properties?: Record<string, any>;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}
