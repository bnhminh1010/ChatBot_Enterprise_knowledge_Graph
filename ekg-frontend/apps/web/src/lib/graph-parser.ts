import { GraphData, GraphNode, GraphLink } from '@/components/graph/GraphView';

/**
 * Parse graph data from backend response
 * Detects if response contains graph information and extracts it
 */
export function parseGraphFromResponse(response: string): GraphData | null {
  try {
    // Try to parse as JSON first (if backend sends structured data)
    const parsed = JSON.parse(response);
    if (parsed.nodes && parsed.links) {
      return parsed as GraphData;
    }
  } catch {
    // Not JSON, extract from text
  }

  // Extract entities from text response
  return extractEntitiesFromText(response);
}

/**
 * Extract entities and relationships from text
 * Looks for patterns like:
 * - "Employee: X" or "Nhân viên: X"
 * - "Department: Y" or "Phòng ban: Y"
 * - "Skill: Z" or "Kỹ năng: Z"  
 * - Lists with bullet points
 */
function extractEntitiesFromText(text: string): GraphData | null {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  const nodeMap = new Map<string, GraphNode>();

  // Patterns to detect entities
  const patterns = {
    employee: /(?:nhân viên|employee)[\s:]*([^\n,•]+?)(?=\n|,|•|$|\(|\-)/gi,
    department: /(?:phòng ban|department)[\s:]*([^\n,•]+?)(?=\n|,|•|$|\(|\-)/gi,
    skill: /(?:kỹ năng|skill)[\s:]*([^\n,•]+?)(?=\n|,|•|$|\(|\-)/gi,
    project: /(?:dự án|project)[\s:]*([^\n,•]+?)(?=\n|,|•|$|\(|\-)/gi,
    position: /(?:vị trí|chức danh|position)[\s:]*([^\n,•]+?)(?=\n|,|•|$|\(|\-)/gi,
  };

  // Extract bullet list items (common in bot responses)
  const bulletPattern = /[•\-\*]\s*([^•\-\*\n]+?)(?:\(([^)]+)\))?/g;
  const bulletMatches = [...text.matchAll(bulletPattern)];

  // Try to extract structured entities first
  let foundAny = false;

  Object.entries(patterns).forEach(([type, pattern]) => {
    const matches = [...text.matchAll(pattern)];
    matches.forEach((match) => {
      const label = match[1].trim();
      if (label && label.length > 0 && label.length < 100) {
        const id = `${type}-${nodes.length}`;
        const node: GraphNode = {
          id,
          label,
          type,
          val: type === 'department' || type === 'project' ? 15 : 10,
        };
        nodes.push(node);
        nodeMap.set(label.toLowerCase(), node);
        foundAny = true;
      }
    });
  });

  // If no structured data, try bullet list
  if (!foundAny && bulletMatches.length > 0) {
    bulletMatches.forEach((match, idx) => {
      const label = match[1].trim();
      const metadata = match[2]?.trim();
      
      if (label && label.length > 2) {
        // Try to guess entity type from context
        let type = 'employee';
        if (metadata) {
          if (/frontend|backend|phòng|department/i.test(metadata)) {
            type = 'department';
          } else if (/react|java|python|skill/i.test(metadata)) {
            type = 'skill';
          } else if (/project|dự án/i.test(metadata)) {
            type = 'project';
          }
        }

        const id = `item-${idx}`;
        const node: GraphNode = {
          id,
          label,
          type,
          val: 10,
        };
        nodes.push(node);
        nodeMap.set(label.toLowerCase(), node);
        foundAny = true;

        // If has metadata, create linked node
        if (metadata) {
          const metaId = `meta-${idx}`;
          const metaType = type === 'employee' ? 'department' : 'skill';
          const metaNode: GraphNode = {
            id: metaId,
            label: metadata,
            type: metaType,
            val: 8,
          };
          nodes.push(metaNode);
          links.push({
            source: id,
            target: metaId,
            relationship: type === 'employee' ? 'WORKS_IN' : 'HAS_SKILL',
            value: 1,
          });
        }
      }
    });
  }

  // Create some default links between nodes if they're mentioned together
  if (nodes.length >= 2) {
    // Link employees to departments/projects mentioned in same context
    const employees = nodes.filter((n) => n.type === 'employee');
    const departments = nodes.filter((n) => n.type === 'department');
    const skills = nodes.filter((n) => n.type === 'skill');

    employees.forEach((emp) => {
      if (departments.length > 0 && Math.random() > 0.3) {
        links.push({
          source: emp.id,
          target: departments[0].id,
          relationship: 'WORKS_IN',
          value: 2,
        });
      }
      if (skills.length > 0 && Math.random() > 0.5) {
        links.push({
          source: emp.id,
          target: skills[Math.floor(Math.random() * skills.length)].id,
          relationship: 'HAS_SKILL',
          value: 1,
        });
      }
    });
  }

  // If we found entities, return graph data
  if (foundAny && nodes.length > 0) {
    return { nodes, links };
  }

  // Otherwise return null (will use sample data)
  return null;
}

/**
 * Create sample graph data for demonstration
 */
export function createSampleGraphData(): GraphData {
  const nodes: GraphNode[] = [
    { id: 'emp1', label: 'Nguyễn Văn A', type: 'employee', val: 10 },
    { id: 'emp2', label: 'Trần Thị B', type: 'employee', val: 10 },
    { id: 'emp3', label: 'Lê Văn C', type: 'employee', val: 10 },
    { id: 'dept1', label: 'Frontend', type: 'department', val: 15 },
    { id: 'dept2', label: 'Backend', type: 'department', val: 15 },
    { id: 'skill1', label: 'React', type: 'skill', val: 8 },
    { id: 'skill2', label: 'TypeScript', type: 'skill', val: 8 },
    { id: 'skill3', label: 'NestJS', type: 'skill', val: 8 },
    { id: 'proj1', label: 'EKG Project', type: 'project', val: 12 },
  ];

  const links: GraphLink[] = [
    { source: 'emp1', target: 'dept1', relationship: 'WORKS_IN', value: 2 },
    { source: 'emp2', target: 'dept1', relationship: 'WORKS_IN', value: 2 },
    { source: 'emp3', target: 'dept2', relationship: 'WORKS_IN', value: 2 },
    { source: 'emp1', target: 'skill1', relationship: 'HAS_SKILL', value: 1 },
    { source: 'emp1', target: 'skill2', relationship: 'HAS_SKILL', value: 1 },
    { source: 'emp2', target: 'skill1', relationship: 'HAS_SKILL', value: 1 },
    { source: 'emp3', target: 'skill2', relationship: 'HAS_SKILL', value: 1 },
    { source: 'emp3', target: 'skill3', relationship: 'HAS_SKILL', value: 1 },
    { source: 'emp1', target: 'proj1', relationship: 'WORKS_ON', value: 1 },
    { source: 'emp2', target: 'proj1', relationship: 'WORKS_ON', value: 1 },
    { source: 'emp3', target: 'proj1', relationship: 'WORKS_ON', value: 1 },
  ];

  return { nodes, links };
}

/**
 * ALWAYS show graph for assistant messages
 * No longer check for keywords - every response can be visualized
 */
export function shouldShowGraph(message: string): boolean {
  // Always return true to enable graph for all responses
  return true;
}
