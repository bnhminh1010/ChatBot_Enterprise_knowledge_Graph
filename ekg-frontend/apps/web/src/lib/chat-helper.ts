/**
 * Chat Helper
 * Các hàm hỗ trợ xử lý chat queries
 */

import {
  searchGlobal,
  searchEmployees,
  searchSkills,
  searchDepartments,
} from "@/server/services/search";
import {
  getEmployees,
  getEmployee,
  addSkillToEmployee,
} from "@/server/services/employees";
import { getDepartments, getDepartment } from "@/server/services/departments";
import { getSkills, getSkill } from "@/server/services/skills";
import { getProjects } from "@/server/services/projects";

export type QueryType =
  | "list-employees"
  | "list-departments"
  | "list-skills"
  | "list-projects"
  | "search-employees"
  | "search-skills"
  | "search-departments"
  | "search-global"
  | "get-employee"
  | "get-department"
  | "unknown";

interface QueryDetectionResult {
  type: QueryType;
  keywords: string[];
  value?: string;
}

/**
 * Phát hiện loại query từ tin nhắn
 */
export function detectQueryType(message: string): QueryDetectionResult {
  const lower = message.toLowerCase().trim();

  // List queries
  if (
    /danh sách|list|tất cả|all/i.test(lower) &&
    /nhân viên|employee|staff/i.test(lower)
  ) {
    return {
      type: "list-employees",
      keywords: ["list", "employees"],
    };
  }

  if (
    /danh sách|list|tất cả|all/i.test(lower) &&
    /phòng ban|department|dept/i.test(lower)
  ) {
    return {
      type: "list-departments",
      keywords: ["list", "departments"],
    };
  }

  if (/danh sách|list|tất cả|all/i.test(lower) && /kỹ năng|skill/i.test(lower)) {
    return {
      type: "list-skills",
      keywords: ["list", "skills"],
    };
  }

  if (
    /danh sách|list|tất cả|all/i.test(lower) &&
    /dự án|project/i.test(lower)
  ) {
    return {
      type: "list-projects",
      keywords: ["list", "projects"],
    };
  }

  // Search queries
  if (
    (/tìm|search|find/i.test(lower) || /nhân viên|employee|staff/i.test(lower)) &&
    !/danh sách|list/i.test(lower)
  ) {
    const match = message.match(
      /(?:tìm|search|find)?\s+(?:nhân viên|employee|staff)?\s*(.+?)(?:\?|$)/i
    );
    if (match) {
      return {
        type: "search-employees",
        keywords: ["search", "employees"],
        value: match[1]?.trim(),
      };
    }
  }

  if (/tìm|search|find/i.test(lower) && /kỹ năng|skill/i.test(lower)) {
    const match = message.match(
      /(?:tìm|search|find)?\s+(?:kỹ năng|skill)?\s*(.+?)(?:\?|$)/i
    );
    if (match) {
      return {
        type: "search-skills",
        keywords: ["search", "skills"],
        value: match[1]?.trim(),
      };
    }
  }

  if (/tìm|search|find/i.test(lower) && /phòng ban|department/i.test(lower)) {
    const match = message.match(
      /(?:tìm|search|find)?\s+(?:phòng ban|department)?\s*(.+?)(?:\?|$)/i
    );
    if (match) {
      return {
        type: "search-departments",
        keywords: ["search", "departments"],
        value: match[1]?.trim(),
      };
    }
  }

  // Default to global search
  if (/tìm|search|find/i.test(lower) || message.length > 3) {
    return {
      type: "search-global",
      keywords: ["search"],
      value: message,
    };
  }

  return {
    type: "unknown",
    keywords: [],
  };
}

/**
 * Xử lý query và trả về response
 */
export async function handleQuery(
  queryType: QueryType,
  value?: string
): Promise<string> {
  try {
    switch (queryType) {
      case "list-employees": {
        const employees = await getEmployees();
        if (employees.length === 0) {
          return "Không có nhân viên nào trong hệ thống.";
        }
        const list = employees
          .map((emp) => `• ${emp.name} - ${emp.position || "Chưa xác định"}`)
          .join("\n");
        return `Danh sách nhân viên (${employees.length}):\n${list}`;
      }

      case "list-departments": {
        const departments = await getDepartments();
        if (departments.length === 0) {
          return "Không có phòng ban nào trong hệ thống.";
        }
        const list = departments
          .map((dept) => `• ${dept.name}${dept.description ? ` - ${dept.description}` : ""}`)
          .join("\n");
        return `Danh sách phòng ban (${departments.length}):\n${list}`;
      }

      case "list-skills": {
        const skills = await getSkills();
        if (skills.length === 0) {
          return "Không có kỹ năng nào trong hệ thống.";
        }
        const list = skills
          .map((skill) => `• ${skill.name}${skill.category ? ` (${skill.category})` : ""}`)
          .join("\n");
        return `Danh sách kỹ năng (${skills.length}):\n${list}`;
      }

      case "list-projects": {
        const projects = await getProjects();
        if (projects.length === 0) {
          return "Không có dự án nào trong hệ thống.";
        }
        const list = projects
          .map((proj) => `• ${proj.name} - ${proj.status || "Chưa xác định"}`)
          .join("\n");
        return `Danh sách dự án (${projects.length}):\n${list}`;
      }

      case "search-global": {
        const results = await searchGlobal({ query: value || "" });
        if (results.length === 0) {
          return `Không tìm thấy kết quả cho "${value}".`;
        }
        const list = results
          .slice(0, 10)
          .map((result) => `• ${result.name} (${result.type})`)
          .join("\n");
        return `Kết quả tìm kiếm cho "${value}" (${results.length}):\n${list}`;
      }

      case "search-employees": {
        const results = await searchEmployees(value || "");
        if (results.length === 0) {
          return `Không tìm thấy nhân viên nào khớp với "${value}".`;
        }
        const list = results
          .slice(0, 10)
          .map((result) => `• ${result.name}`)
          .join("\n");
        return `Nhân viên tìm được cho "${value}":\n${list}`;
      }

      case "search-skills": {
        const results = await searchSkills(value || "");
        if (results.length === 0) {
          return `Không tìm thấy kỹ năng nào khớp với "${value}".`;
        }
        const list = results
          .slice(0, 10)
          .map((result) => `• ${result.name}`)
          .join("\n");
        return `Kỹ năng tìm được cho "${value}":\n${list}`;
      }

      case "search-departments": {
        const results = await searchDepartments(value || "");
        if (results.length === 0) {
          return `Không tìm thấy phòng ban nào khớp với "${value}".`;
        }
        const list = results
          .slice(0, 10)
          .map((result) => `• ${result.name}`)
          .join("\n");
        return `Phòng ban tìm được cho "${value}":\n${list}`;
      }

      default:
        return "Xin lỗi, tôi không hiểu yêu cầu của bạn. Hãy thử các lệnh:\n• Danh sách nhân viên\n• Danh sách phòng ban\n• Danh sách kỹ năng\n• Danh sách dự án\n• Tìm [tên hoặc từ khóa]";
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Lỗi không xác định";
    console.error(`Query error [${queryType}]:`, errorMsg);
    throw error;
  }
}
