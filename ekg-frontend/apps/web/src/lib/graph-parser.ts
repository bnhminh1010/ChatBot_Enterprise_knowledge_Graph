import { GraphData, GraphNode, GraphLink } from "@/components/graph/GraphView";

/**
 * Graph Parser - Extract structured graph data from text responses
 *
 * Strategies:
 * 1. Parse JSON if backend sends structured data
 * 2. Detect employee info pattern and create employee-centric graph
 * 3. Detect list patterns (list of employees, skills, etc.)
 */
export function parseGraphFromResponse(response: string): GraphData | null {
  try {
    // Strategy 1: Try to parse as JSON first
    const parsed = JSON.parse(response);
    if (parsed.nodes && parsed.links) {
      return parsed as GraphData;
    }
  } catch {
    // Not JSON, extract from text
  }

  // Strategy 2: Detect and parse different response types

  // Check if this is employee info response
  if (isEmployeeInfoResponse(response)) {
    return parseEmployeeInfo(response);
  }

  // Check if this is a list of employees
  if (isEmployeeListResponse(response)) {
    return parseEmployeeList(response);
  }

  // Fallback: Extract general entities
  return extractGeneralEntities(response);
}

/**
 * Check if response contains employee information
 */
function isEmployeeInfoResponse(text: string): boolean {
  const employeeInfoPatterns = [
    /thông tin.*nhân viên/i,
    /nhân viên.*:.*mã/i,
    /họ tên|ho ten/i,
    /mã nhân viên/i,
    /phòng ban.*:.*\n/i,
    /chức danh|chức vụ/i,
  ];
  return employeeInfoPatterns.some((p) => p.test(text));
}

/**
 * Check if response is a list of employees
 */
function isEmployeeListResponse(text: string): boolean {
  // Vietnamese name pattern appearing multiple times with skill levels
  const namePattern =
    /[A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ][a-zàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]+\s+[A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ][a-zàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]+/g;
  const matches = text.match(namePattern);
  return matches !== null && matches.length >= 3;
}

/**
 * Parse employee information response into graph
 * Response format:
 * - Họ tên: X
 * - Mã: Y
 * - Phòng ban: Z
 * - Kỹ năng: A, B, C
 * - Dự án: P
 */
function parseEmployeeInfo(text: string): GraphData | null {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];

  // Extract employee name
  const nameMatch =
    text.match(/(?:họ tên|tên|nhân viên)[:\s]*([^\n,•]+)/i) ||
    text.match(
      /(?:anh|chị)\s+([A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ][a-zàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]+(?:\s+[A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ][a-zàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]+){1,2})/
    );

  let employeeName = "Unknown";
  if (nameMatch) {
    employeeName = nameMatch[1].replace(/[:\*\-]/g, "").trim();
  } else {
    // Try to find Vietnamese name pattern
    const vnNameMatch = text.match(
      /([A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ][a-zàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]+(?:\s+[A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ][a-zàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]+){2})/
    );
    if (vnNameMatch) {
      employeeName = vnNameMatch[1];
    }
  }

  // Create employee node (center)
  const employeeId = "emp-0";
  nodes.push({
    id: employeeId,
    label: employeeName,
    type: "employee",
    val: 10, // Central node
  });

  // Extract employee code
  const codeMatch = text.match(/(?:mã|code|id)[:\s]*([A-Z]{2,4}[_\-]?\d+)/i);
  if (codeMatch) {
    // Add as part of employee label instead of separate node
    const empNode = nodes.find((n) => n.id === employeeId);
    if (empNode) {
      empNode.label = `${employeeName}\n(${codeMatch[1]})`;
    }
  }

  // Extract department
  const deptMatch = text.match(
    /(?:phòng ban|phòng|department|team)[:\s]*([^\n,•]+)/i
  );
  if (deptMatch) {
    const deptName = deptMatch[1].replace(/[:\*\-]/g, "").trim();
    if (deptName.length > 2 && deptName.length < 50) {
      const deptId = "dept-0";
      nodes.push({
        id: deptId,
        label: deptName,
        type: "department",
        val: 8,
      });
      links.push({
        source: employeeId,
        target: deptId,
        relationship: "WORKS_IN",
        value: 2,
      });
    }
  }

  // Extract position/role
  const positionMatch = text.match(
    /(?:chức danh|chức vụ|vị trí|vai trò|position|role)[:\s]*([^\n,•]+)/i
  );
  if (positionMatch) {
    const posName = positionMatch[1].replace(/[:\*\-]/g, "").trim();
    if (posName.length > 2 && posName.length < 50) {
      const posId = "pos-0";
      nodes.push({
        id: posId,
        label: posName,
        type: "position",
        val: 6,
      });
      links.push({
        source: employeeId,
        target: posId,
        relationship: "HAS_POSITION",
        value: 1,
      });
    }
  }

  // Extract skills
  const skillsMatch = text.match(/(?:kỹ năng|skills?)[:\s]*([^\n]+)/i);
  if (skillsMatch) {
    const skillsText = skillsMatch[1];
    const skillNames = skillsText.split(/[,;]/);
    skillNames.forEach((skill, idx) => {
      const skillName = skill.replace(/[:\*\-\(\)]/g, "").trim();
      if (
        skillName.length > 1 &&
        skillName.length < 30 &&
        !/^\d+$/.test(skillName)
      ) {
        const skillId = `skill-${idx}`;
        nodes.push({
          id: skillId,
          label: skillName,
          type: "skill",
          val: 5,
        });
        links.push({
          source: employeeId,
          target: skillId,
          relationship: "HAS_SKILL",
          value: 1,
        });
      }
    });
  }

  // Extract project(s)
  const projectMatches = text.matchAll(/(?:dự án|project)[:\s]*([^\n,•]+)/gi);
  let projIdx = 0;
  for (const match of projectMatches) {
    const projName = match[1].replace(/[:\*\-]/g, "").trim();
    // Filter out labels like "Dự án đang tham gia"
    if (
      projName.length > 3 &&
      projName.length < 60 &&
      !/đang tham gia|tham gia|hiện tại|đang làm/i.test(projName)
    ) {
      const projId = `proj-${projIdx}`;
      nodes.push({
        id: projId,
        label: projName.substring(0, 40) + (projName.length > 40 ? "..." : ""),
        type: "project",
        val: 7,
      });
      links.push({
        source: employeeId,
        target: projId,
        relationship: "WORKS_ON",
        value: 2,
      });
      projIdx++;
    }
  }

  // Extract location
  const locationMatch = text.match(
    /(?:chi nhánh|location|địa điểm|văn phòng)[:\s]*([^\n,•]+)/i
  );
  if (locationMatch) {
    const locName = locationMatch[1].replace(/[:\*\-]/g, "").trim();
    if (locName.length > 1 && locName.length < 30) {
      const locId = "loc-0";
      nodes.push({
        id: locId,
        label: locName,
        type: "location",
        val: 5,
      });
      links.push({
        source: employeeId,
        target: locId,
        relationship: "LOCATED_AT",
        value: 1,
      });
    }
  }

  // Only return if we have meaningful data
  if (nodes.length > 1) {
    return { nodes, links };
  }

  // Return single node graph if we have employee but no connections
  if (nodes.length === 1) {
    return { nodes, links };
  }

  return null;
}

/**
 * Parse list of employees (e.g., "employees with React skill")
 */
function parseEmployeeList(text: string): GraphData | null {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];

  // Extract skill/department context from query
  const contextMatch =
    text.match(/(?:biết|có skill|kỹ năng)\s+([A-Za-z.#+]+)/i) ||
    text.match(/(?:phòng|department)\s+([A-Za-z]+)/i);

  let contextNode: GraphNode | null = null;
  if (contextMatch) {
    const contextName = contextMatch[1];
    const isSkill = /skill|kỹ năng|biết/i.test(text);
    contextNode = {
      id: isSkill ? "skill-0" : "dept-0",
      label: contextName,
      type: isSkill ? "skill" : "department",
      val: 18,
    };
    nodes.push(contextNode);
  }

  // Extract Vietnamese names with optional level in parentheses
  const namePattern =
    /([A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ][a-zàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]+(?:\s+[A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ][a-zàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]+){1,3})(?:\s*\(([^)]+)\))?/g;

  const matches = [...text.matchAll(namePattern)];
  const seenNames = new Set<string>();

  matches.forEach((match, idx) => {
    const name = match[1].trim();
    const level = match[2]?.trim();

    // Filter out common non-name phrases
    const blacklist =
      /thông tin|nhân viên|phòng ban|kỹ năng|dự án|hệ thống|trạng thái|chi nhánh|ngày|tháng|năm|mã|vai trò/i;
    if (
      blacklist.test(name) ||
      name.length < 5 ||
      seenNames.has(name.toLowerCase())
    ) {
      return;
    }

    seenNames.add(name.toLowerCase());
    const empId = `emp-${idx}`;
    nodes.push({
      id: empId,
      label: level ? `${name}\n(${level})` : name,
      type: "employee",
      val: 12,
    });

    // Link to context if exists
    if (contextNode) {
      links.push({
        source: empId,
        target: contextNode.id,
        relationship: contextNode.type === "skill" ? "HAS_SKILL" : "WORKS_IN",
        value: 1,
      });
    }
  });

  return nodes.length > 0 ? { nodes, links } : null;
}

/**
 * Extract general entities (fallback)
 */
function extractGeneralEntities(text: string): GraphData | null {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];

  // Only extract clearly labeled entities
  const patterns: { regex: RegExp; type: string; relationship: string }[] = [
    {
      regex: /(?:nhân viên|employee)[:\s]+([^\n,•]+)/gi,
      type: "employee",
      relationship: "",
    },
    {
      regex: /(?:phòng ban|department)[:\s]+([^\n,•]+)/gi,
      type: "department",
      relationship: "WORKS_IN",
    },
    {
      regex: /(?:kỹ năng|skill)[:\s]+([^\n,•]+)/gi,
      type: "skill",
      relationship: "HAS_SKILL",
    },
    {
      regex: /(?:dự án|project)[:\s]+([^\n,•]+)/gi,
      type: "project",
      relationship: "WORKS_ON",
    },
  ];

  let firstEmployee: string | null = null;

  patterns.forEach(({ regex, type, relationship }) => {
    const matches = [...text.matchAll(regex)];
    matches.forEach((match, idx) => {
      const label = match[1].replace(/[:\*\-\(\)]/g, "").trim();
      if (label.length > 2 && label.length < 50) {
        const id = `${type}-${nodes.length}`;
        nodes.push({ id, label, type, val: type === "department" ? 15 : 12 });

        if (type === "employee" && !firstEmployee) {
          firstEmployee = id;
        } else if (firstEmployee && relationship) {
          links.push({
            source: firstEmployee,
            target: id,
            relationship,
            value: 1,
          });
        }
      }
    });
  });

  return nodes.length > 0 ? { nodes, links } : null;
}

/**
 * Create sample graph data for demonstration
 */
export function createSampleGraphData(): GraphData {
  const nodes: GraphNode[] = [
    { id: "emp1", label: "Nguyễn Văn A", type: "employee", val: 15 },
    { id: "dept1", label: "Phòng IT", type: "department", val: 18 },
    { id: "skill1", label: "React", type: "skill", val: 12 },
    { id: "skill2", label: "TypeScript", type: "skill", val: 12 },
    { id: "proj1", label: "EKG Project", type: "project", val: 14 },
  ];

  const links: GraphLink[] = [
    { source: "emp1", target: "dept1", relationship: "WORKS_IN", value: 2 },
    { source: "emp1", target: "skill1", relationship: "HAS_SKILL", value: 1 },
    { source: "emp1", target: "skill2", relationship: "HAS_SKILL", value: 1 },
    { source: "emp1", target: "proj1", relationship: "WORKS_ON", value: 2 },
  ];

  return { nodes, links };
}

/**
 * Check if we should show graph visualization
 */
export function shouldShowGraph(message: string): boolean {
  // Show graph for responses with employee/project/department mentions
  const graphPatterns = [
    /nhân viên|employee/i,
    /phòng ban|department/i,
    /dự án|project/i,
    /kỹ năng|skill/i,
    /danh sách/i,
  ];
  return message.length > 50 && graphPatterns.some((p) => p.test(message));
}
