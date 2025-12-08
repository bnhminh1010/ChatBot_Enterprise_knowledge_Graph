import { GraphData, GraphNode, GraphLink } from "@/components/graph/GraphView";

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

  // Pattern 1: Extract ALL Vietnamese names (works for "Name (Level), Name (Level)" format)
  const vietnameseNamePattern =
    /([A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ][a-zàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]+(?:\s+[A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ][a-zàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]+){1,3})\s*\(([^)]+)\)/g;

  const nameMatches = [...text.matchAll(vietnameseNamePattern)];

  if (nameMatches.length > 0) {
    // Found names with levels (e.g., "Hoàng Yến Nhi (Junior)")
    nameMatches.forEach((match, idx) => {
      const name = match[1].trim();
      const level = match[2].trim();

      if (name.length >= 5) {
        // Valid name
        const id = `emp-${idx}`;
        nodes.push({
          id,
          label: name,
          type: "employee",
          val: 10,
        });
      }
    });
  }

  // Pattern 2: Extract bullet point items (documents, list items)
  const bulletPattern = /[•\-\*]\s*([^\n•\-\*]+)/g;
  const bulletMatches = [...text.matchAll(bulletPattern)];

  // Extract project name from text (e.g., "Dự án X có các tài liệu")
  const projectMatch = text.match(/[Dd]ự án\s*[""]?([^""]+?)[""]?\s*(?:có|có các|của)/);
  const projectName = projectMatch ? projectMatch[1].trim() : null;

  if (bulletMatches.length > 0 && nodes.length === 0) {
    // If no employee names found, create nodes from bullet points
    const docKeywords = /tài liệu|document|hướng dẫn|báo cáo|file/i.test(text);

    // Add project node first if found
    if (projectName) {
      nodes.push({
        id: "proj-0",
        label: projectName.substring(0, 30),
        type: "project",
        val: 15,
      });
    }

    bulletMatches.forEach((match, idx) => {
      // Clean up label - remove everything in parentheses
      let label = match[1].trim();
      label = label.replace(/\s*\([^)]*\)/g, "").trim(); // Remove (xxx)
      
      if (label.length > 3 && label.length < 100) {
        const id = docKeywords ? `doc-${idx}` : `item-${idx}`;
        nodes.push({
          id,
          label: label.substring(0, 35) + (label.length > 35 ? "..." : ""),
          type: docKeywords ? "document" : "skill",
          val: 8,
        });

        // Link document to project if exists
        if (projectName) {
          links.push({
            source: "proj-0",
            target: id,
            relationship: "HAS_DOC",
            value: 2,
          });
        }
      }
    });
  }

  // Pattern 3: Extract context (skill, department, project)
  const contextInfo = extractContextFromText(text);

  // Add context nodes
  if (contextInfo.skill) {
    const skillId = "skill-0";
    nodes.push({
      id: skillId,
      label: contextInfo.skill,
      type: "skill",
      val: 12,
    });

    // Link ALL employees to this skill
    nodes
      .filter((n) => n.type === "employee")
      .forEach((emp) => {
        links.push({
          source: emp.id,
          target: skillId,
          relationship: "HAS_SKILL",
          value: 1,
        });
      });
  }

  if (contextInfo.department) {
    const deptId = "dept-0";
    nodes.push({
      id: deptId,
      label: contextInfo.department,
      type: "department",
      val: 15,
    });

    // Link ALL employees to department
    nodes
      .filter((n) => n.type === "employee")
      .forEach((emp) => {
        links.push({
          source: emp.id,
          target: deptId,
          relationship: "WORKS_IN",
          value: 2,
        });
      });
  }

  if (contextInfo.project) {
    const projId = "proj-0";
    nodes.push({
      id: projId,
      label: contextInfo.project,
      type: "project",
      val: 15,
    });

    // Link documents/items to project
    nodes
      .filter((n) => n.type === "document" || n.type === "employee")
      .forEach((item) => {
        links.push({
          source: projId,
          target: item.id,
          relationship: item.type === "document" ? "HAS_DOC" : "WORKS_ON",
          value: 1,
        });
      });
  }

  // If no names found, try original patterns
  if (nodes.length === 0) {
    return extractWithOriginalPatterns(text);
  }

  return nodes.length > 0 ? { nodes, links } : null;
}

/**
 * Extract context information (skill, department, project) from text
 */
function extractContextFromText(text: string): {
  skill?: string;
  department?: string;
  project?: string;
} {
  const info: any = {};

  // Extract skill - check both "có skill X" and "biết X"
  const skillMatch = text.match(
    /(?:có skill|skill|kỹ năng|biết)\s+([A-Za-z.+#]+)/i
  );
  if (skillMatch) {
    info.skill = skillMatch[1];
  }

  // Extract department
  const deptMatch = text.match(
    /phòng\s+([A-Za-z]+)|([A-Za-z]+)\s+(?:team|phòng)/i
  );
  if (deptMatch) {
    info.department = deptMatch[1] || deptMatch[2];
  }

  // Extract project
  const projMatch = text.match(
    /dự án\s+([A-ZĐ][a-zàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]+)|project\s+([A-Za-z]+)/i
  );
  if (projMatch) {
    info.project = projMatch[1] || projMatch[2];
  }

  return info;
}

/**
 * Original pattern-based extraction (fallback)
 */
function extractWithOriginalPatterns(text: string): GraphData | null {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  const nodeMap = new Map<string, GraphNode>();

  // Patterns to detect entities
  const patterns = {
    employee: /(?:nhân viên|employee)[\s:]*([^\n,•]+?)(?=\n|,|•|$|\(|\-)/gi,
    department: /(?:phòng ban|department)[\s:]*([^\n,•]+?)(?=\n|,|•|$|\(|\-)/gi,
    skill: /(?:kỹ năng|skill)[\s:]*([^\n,•]+?)(?=\n|,|•|$|\(|\-)/gi,
    project: /(?:dự án|project)[\s:]*([^\n,•]+?)(?=\n|,|•|$|\(|\-)/gi,
    position:
      /(?:vị trí|chức danh|position)[\s:]*([^\n,•]+?)(?=\n|,|•|$|\(|\-)/gi,
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
          val: type === "department" || type === "project" ? 15 : 10,
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
        let type = "employee";
        if (metadata) {
          if (/frontend|backend|phòng|department/i.test(metadata)) {
            type = "department";
          } else if (/react|java|python|skill/i.test(metadata)) {
            type = "skill";
          } else if (/project|dự án/i.test(metadata)) {
            type = "project";
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
          const metaType = type === "employee" ? "department" : "skill";
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
            relationship: type === "employee" ? "WORKS_IN" : "HAS_SKILL",
            value: 1,
          });
        }
      }
    });
  }

  // Create some default links between nodes if they're mentioned together
  if (nodes.length >= 2) {
    // Link employees to departments/projects mentioned in same context
    const employees = nodes.filter((n) => n.type === "employee");
    const departments = nodes.filter((n) => n.type === "department");
    const skills = nodes.filter((n) => n.type === "skill");

    employees.forEach((emp) => {
      if (departments.length > 0 && Math.random() > 0.3) {
        links.push({
          source: emp.id,
          target: departments[0].id,
          relationship: "WORKS_IN",
          value: 2,
        });
      }
      if (skills.length > 0 && Math.random() > 0.5) {
        links.push({
          source: emp.id,
          target: skills[Math.floor(Math.random() * skills.length)].id,
          relationship: "HAS_SKILL",
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
    { id: "emp1", label: "Nguyễn Văn A", type: "employee", val: 10 },
    { id: "emp2", label: "Trần Thị B", type: "employee", val: 10 },
    { id: "emp3", label: "Lê Văn C", type: "employee", val: 10 },
    { id: "dept1", label: "Frontend", type: "department", val: 15 },
    { id: "dept2", label: "Backend", type: "department", val: 15 },
    { id: "skill1", label: "React", type: "skill", val: 8 },
    { id: "skill2", label: "TypeScript", type: "skill", val: 8 },
    { id: "skill3", label: "NestJS", type: "skill", val: 8 },
    { id: "proj1", label: "EKG Project", type: "project", val: 12 },
  ];

  const links: GraphLink[] = [
    { source: "emp1", target: "dept1", relationship: "WORKS_IN", value: 2 },
    { source: "emp2", target: "dept1", relationship: "WORKS_IN", value: 2 },
    { source: "emp3", target: "dept2", relationship: "WORKS_IN", value: 2 },
    { source: "emp1", target: "skill1", relationship: "HAS_SKILL", value: 1 },
    { source: "emp1", target: "skill2", relationship: "HAS_SKILL", value: 1 },
    { source: "emp2", target: "skill1", relationship: "HAS_SKILL", value: 1 },
    { source: "emp3", target: "skill2", relationship: "HAS_SKILL", value: 1 },
    { source: "emp3", target: "skill3", relationship: "HAS_SKILL", value: 1 },
    { source: "emp1", target: "proj1", relationship: "WORKS_ON", value: 1 },
    { source: "emp2", target: "proj1", relationship: "WORKS_ON", value: 1 },
    { source: "emp3", target: "proj1", relationship: "WORKS_ON", value: 1 },
  ];

  return { nodes, links };
}

/**
 * Check if we should show graph visualization
 * Always show for any assistant response with content
 */
export function shouldShowGraph(message: string): boolean {
  // Always show graph button if message has meaningful content (> 20 chars)
  return !!(message && message.trim().length > 20);
}
