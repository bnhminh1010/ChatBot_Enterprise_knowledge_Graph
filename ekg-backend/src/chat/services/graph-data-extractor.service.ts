import { Injectable, Logger } from '@nestjs/common';
import { GraphNode, GraphLink } from './types/graph.types';

export interface Neo4jGraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

/**
 * Service to extract graph visualization data from Neo4j query results
 * Converts Neo4j Records into frontend-compatible graph format
 */
@Injectable()
export class GraphDataExtractor {
  private readonly logger = new Logger(GraphDataExtractor.name);

  /**
   * Extract graph data from Neo4j query result
   * Handles both node/relationship results and path results
   */
  extractGraphData(records: any[]): Neo4jGraphData | null {
    if (!records || records.length === 0) {
      return null;
    }

    const nodesMap = new Map<string, GraphNode>();
    const linksMap = new Map<string, GraphLink>();

    for (const record of records) {
      // Iterate through all fields in the record
      record.keys.forEach((key: string) => {
        const value = record.get(key);

        if (this.isNode(value)) {
          this.addNode(value, nodesMap);
        } else if (this.isRelationship(value)) {
          this.addRelationship(value, linksMap);
        } else if (this.isPath(value)) {
          this.extractPath(value, nodesMap, linksMap);
        } else if (Array.isArray(value)) {
          // Handle arrays of nodes/relationships
          value.forEach((item) => {
            if (this.isNode(item)) {
              this.addNode(item, nodesMap);
            } else if (this.isRelationship(item)) {
              this.addRelationship(item, linksMap);
            }
          });
        }
      });
    }

    // Convert maps to arrays
    const nodes = Array.from(nodesMap.values());
    const links = Array.from(linksMap.values());

    if (nodes.length === 0) {
      return null;
    }

    this.logger.debug(
      `Extracted ${nodes.length} nodes and ${links.length} relationships`,
    );

    return { nodes, links };
  }

  /**
   * Check if value is a Neo4j Node
   */
  private isNode(value: any): boolean {
    return (
      value && (value.labels || value.identity !== undefined || value.elementId)
    );
  }

  /**
   * Check if value is a Neo4j Relationship
   */
  private isRelationship(value: any): boolean {
    return (
      value &&
      value.type &&
      (value.start !== undefined || value.startNodeElementId)
    );
  }

  /**
   * Check if value is a Neo4j Path
   */
  private isPath(value: any): boolean {
    return value && value.segments && Array.isArray(value.segments);
  }

  /**
   * Add node to nodes map
   */
  private addNode(node: any, nodesMap: Map<string, GraphNode>): void {
    // Use elementId (Neo4j 5+) or identity (Neo4j 4)
    const id = node.elementId || node.identity?.toString() || node.id;

    if (!id || nodesMap.has(id)) {
      return; // Skip if already added
    }

    const labels = node.labels || [];
    const properties = node.properties || {};

    // Determine node label (display name)
    const label =
      properties.ten ||
      properties.name ||
      properties.tenCongTy ||
      properties.tenPhongBan ||
      properties.tenDuAn ||
      labels[0] ||
      'Unknown';

    // Determine node type for coloring
    const type = this.normalizeNodeType(labels[0] || 'unknown');

    // Node size based on type
    const val = this.getNodeSize(type);

    nodesMap.set(id, {
      id,
      label,
      type,
      val,
      properties, // Include for tooltips
    });
  }

  /**
   * Add relationship to links map
   */
  private addRelationship(rel: any, linksMap: Map<string, GraphLink>): void {
    const id = rel.elementId || rel.identity?.toString() || rel.id;

    if (!id || linksMap.has(id)) {
      return; // Skip if already added
    }

    // Get start and end node IDs (Neo4j 5+ vs Neo4j 4)
    const source =
      rel.startNodeElementId || rel.start?.toString() || rel.startNode;
    const target = rel.endNodeElementId || rel.end?.toString() || rel.endNode;

    if (!source || !target) {
      return; // Invalid relationship
    }

    const relationship = rel.type || 'RELATED_TO';

    linksMap.set(id, {
      source,
      target,
      relationship,
      value: 1,
      properties: rel.properties || {},
    });
  }

  /**
   * Extract nodes and relationships from a path
   */
  private extractPath(
    path: any,
    nodesMap: Map<string, GraphNode>,
    linksMap: Map<string, GraphLink>,
  ): void {
    if (!path.segments || !Array.isArray(path.segments)) {
      return;
    }

    // Add start node
    if (path.start) {
      this.addNode(path.start, nodesMap);
    }

    // Process each segment (relationship + end node)
    for (const segment of path.segments) {
      if (segment.relationship) {
        this.addRelationship(segment.relationship, linksMap);
      }
      if (segment.end) {
        this.addNode(segment.end, nodesMap);
      }
    }

    // Add end node
    if (path.end) {
      this.addNode(path.end, nodesMap);
    }
  }

  /**
   * Normalize node type for consistent coloring
   */
  private normalizeNodeType(label: string): string {
    const labelLower = label.toLowerCase();

    // Map Vietnamese labels to English types
    const typeMap: { [key: string]: string } = {
      nhansu: 'employee',
      employee: 'employee',

      phongban: 'department',
      department: 'department',

      kynangtechstacks: 'skill',
      skill: 'skill',
      technology: 'skill',

      duan: 'project',
      project: 'project',

      chucvu: 'position',
      position: 'position',

      congty: 'company',
      company: 'company',

      diadiem: 'location',
      location: 'location',
    };

    for (const [key, value] of Object.entries(typeMap)) {
      if (labelLower.includes(key)) {
        return value;
      }
    }

    return label.toLowerCase();
  }

  /**
   * Get node size based on type
   */
  private getNodeSize(type: string): number {
    const sizeMap: { [key: string]: number } = {
      company: 20,
      department: 15,
      project: 15,
      employee: 10,
      position: 12,
      skill: 8,
      location: 12,
    };

    return sizeMap[type] || 10;
  }

  /**
   * Check if query result should generate graph visualization
   * Returns true if results contain nodes/relationships
   */
  shouldGenerateGraph(records: any[]): boolean {
    if (!records || records.length === 0) {
      return false;
    }

    // Check if any record contains nodes or relationships
    for (const record of records) {
      for (const key of record.keys) {
        const value = record.get(key);
        if (
          this.isNode(value) ||
          this.isRelationship(value) ||
          this.isPath(value)
        ) {
          return true;
        }
        if (
          Array.isArray(value) &&
          value.some((v) => this.isNode(v) || this.isRelationship(v))
        ) {
          return true;
        }
      }
    }

    return false;
  }
}
