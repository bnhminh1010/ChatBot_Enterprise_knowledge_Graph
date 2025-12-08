import { Injectable, Logger } from '@nestjs/common';
import { Neo4jService } from '../../core/neo4j/neo4j.service';
import * as neo4j from 'neo4j-driver';

export interface EmployeeRecommendation {
  employee: {
    id: string;
    name: string;
    position: string;
    department: string;
    level: string;
  };
  matchScore: number; // 0-100
  matchingSkills: string[];
  currentWorkload: 'low' | 'medium' | 'high';
  projectCount: number;
  reason: string;
}

export interface TrainingSuggestion {
  skill: string;
  priority: 'high' | 'medium' | 'low';
  reason: string;
  relatedProjects: string[];
}

export interface ProjectRecommendation {
  project: {
    id: string;
    name: string;
    client: string;
    status: string;
  };
  matchScore: number;
  matchingSkills: string[];
  reason: string;
}

@Injectable()
export class RecommendationService {
  private readonly logger = new Logger(RecommendationService.name);

  constructor(private readonly neo4jService: Neo4jService) {}

  /**
   * Gợi ý nhân viên phù hợp cho dự án dựa trên:
   * - Skill matching với technologies của project
   * - Workload hiện tại (số dự án đang làm)
   * - Level/experience phù hợp
   */
  async recommendEmployeesForProject(
    projectName: string,
    requiredSkills?: string[],
    limit = 5,
  ): Promise<{ recommendations: EmployeeRecommendation[]; projectInfo: any }> {
    this.logger.log(`🎯 Recommending employees for project: ${projectName}`);

    try {
      // Step 1: Get project info and its technologies
      const projectResult = await this.neo4jService.run(
        `MATCH (p:DuAn)
         WHERE toLower(p.ten) CONTAINS toLower($projectName) OR toLower(p.ma) CONTAINS toLower($projectName)
         OPTIONAL MATCH (p)-[:SU_DUNG_CONG_NGHE]->(tech:CongNghe)
         RETURN p, collect(DISTINCT tech.ten) AS technologies
         LIMIT 1`,
        { projectName },
      );

      if (projectResult.length === 0) {
        return {
          recommendations: [],
          projectInfo: null,
        };
      }

      const project = projectResult[0].p;
      const projectTechs: string[] =
        projectResult[0].technologies.filter(Boolean);

      // Combine project techs with required skills
      const targetSkills = [
        ...new Set([...projectTechs, ...(requiredSkills || [])]),
      ];

      this.logger.debug(
        `Target skills for matching: ${targetSkills.join(', ')}`,
      );

      // Step 2: Find employees with matching skills and calculate workload
      const employeesResult = await this.neo4jService.run(
        `MATCH (e:NhanSu)
         OPTIONAL MATCH (e)-[r:CO_KY_NANG]->(k:KyNang)
         OPTIONAL MATCH (pb:PhongBan)-[:CO_NHAN_SU]-(e)
         OPTIONAL MATCH (e)-[:LAM_DU_AN]->(activeProject:DuAn)
         WHERE activeProject.trang_thai IN ['In Progress', 'Active', 'Đang tiến hành'] OR activeProject IS NULL
         WITH e, pb, 
              collect(DISTINCT k.ten) AS skills,
              count(DISTINCT activeProject) AS projectCount
         WHERE size([s IN $targetSkills WHERE s IN skills]) > 0 OR size($targetSkills) = 0
         RETURN {
           id: e.id,
           name: e.ho_ten,
           position: e.chucDanh,
           level: e.cap_bac_hien_tai,
           department: COALESCE(pb.ten, 'N/A'),
           skills: skills,
           projectCount: projectCount
         } AS employee
         ORDER BY projectCount ASC
         LIMIT $limit`,
        {
          targetSkills,
          limit: neo4j.int(limit * 2), // Get more to filter
        },
      );

      // Step 3: Calculate match scores and rank
      const recommendations: EmployeeRecommendation[] = employeesResult
        .map((row: any) => {
          const emp = row.employee;
          const empSkills: string[] = emp.skills.filter(Boolean);
          // Convert BigInt to Number for calculations
          const projectCount =
            typeof emp.projectCount === 'bigint'
              ? Number(emp.projectCount)
              : (emp.projectCount?.toNumber?.() ??
                Number(emp.projectCount) ??
                0);

          // Calculate matching skills
          const matchingSkills = targetSkills.filter((skill) =>
            empSkills.some(
              (es: string) =>
                es && skill && es.toLowerCase().includes(skill.toLowerCase()),
            ),
          );

          // Calculate match score (0-100)
          const skillMatchScore =
            targetSkills.length > 0
              ? (matchingSkills.length / targetSkills.length) * 60
              : 30; // Base score if no specific skills required

          // Workload bonus (less projects = higher score)
          const workloadScore = Math.max(0, 30 - projectCount * 10);

          // Experience bonus based on level
          const levelScore = this.getLevelScore(emp.level);

          const totalScore = Math.min(
            100,
            Math.round(skillMatchScore + workloadScore + levelScore),
          );

          // Determine workload level
          const workload: 'low' | 'medium' | 'high' =
            projectCount <= 1 ? 'low' : projectCount <= 3 ? 'medium' : 'high';

          // Generate reason
          const reason = this.generateRecommendationReason(
            matchingSkills,
            projectCount,
            emp.level,
          );

          return {
            employee: {
              id: emp.id,
              name: emp.name,
              position: emp.position,
              department: emp.department,
              level: emp.level,
            },
            matchScore: totalScore,
            matchingSkills,
            currentWorkload: workload,
            projectCount: projectCount,
            reason,
          };
        })
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, limit);

      return {
        recommendations,
        projectInfo: {
          id: project.id,
          name: project.ten,
          technologies: projectTechs,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to recommend employees: ${error}`);
      throw error;
    }
  }

  /**
   * Đề xuất đào tạo dựa trên skill gaps
   * So sánh skills của nhân viên với trending skills trong công ty
   */
  async recommendTrainingForEmployee(
    employeeId?: string,
    employeeName?: string,
  ): Promise<{ suggestions: TrainingSuggestion[]; employee: any }> {
    this.logger.log(
      `📚 Recommending training for: ${employeeId || employeeName}`,
    );

    try {
      // Step 1: Get employee's current skills
      const employeeResult = await this.neo4jService.run(
        `MATCH (e:NhanSu)
         WHERE ($employeeId IS NOT NULL AND e.id = $employeeId) 
            OR ($employeeName IS NOT NULL AND toLower(e.ho_ten) CONTAINS toLower($employeeName))
         OPTIONAL MATCH (e)-[:CO_KY_NANG]->(k:KyNang)
         OPTIONAL MATCH (pb:PhongBan)-[:CO_NHAN_SU]-(e)
         RETURN e, pb.ten AS department, collect(DISTINCT k.ten) AS skills
         LIMIT 1`,
        { employeeId: employeeId || null, employeeName: employeeName || null },
      );

      if (employeeResult.length === 0) {
        return { suggestions: [], employee: null };
      }

      const emp = employeeResult[0].e;
      const currentSkills: string[] = employeeResult[0].skills.filter(Boolean);
      const department = employeeResult[0].department;

      // Step 2: Get trending skills in the company (used in many projects)
      const trendingResult = await this.neo4jService.run(
        `MATCH (p:DuAn)-[:SU_DUNG_CONG_NGHE]->(tech:CongNghe)
         WHERE p.trang_thai IN ['In Progress', 'Active', 'Đang tiến hành']
         RETURN tech.ten AS skill, count(DISTINCT p) AS projectCount
         ORDER BY projectCount DESC
         LIMIT 10`,
      );

      // Step 3: Get skills used by colleagues in same department (skip if no department)
      let deptSkillsResult: any[] = [];
      if (department && emp.id) {
        deptSkillsResult = await this.neo4jService.run(
          `MATCH (pb:PhongBan {ten: $department})-[:CO_NHAN_SU]-(colleague:NhanSu)
           WHERE colleague.id <> $empId
           MATCH (colleague)-[:CO_KY_NANG]->(k:KyNang)
           RETURN k.ten AS skill, count(DISTINCT colleague) AS colleagueCount
           ORDER BY colleagueCount DESC
           LIMIT 10`,
          { department: department, empId: emp.id },
        );
      }

      // Step 4: Calculate skill gaps
      const suggestions: TrainingSuggestion[] = [];

      // Check trending skills not possessed
      for (const row of trendingResult) {
        const skill = row.skill;
        if (
          skill &&
          !currentSkills.some((s) => s?.toLowerCase() === skill?.toLowerCase())
        ) {
          suggestions.push({
            skill,
            priority: row.projectCount > 3 ? 'high' : 'medium',
            reason: `Được sử dụng trong ${row.projectCount} dự án đang hoạt động`,
            relatedProjects: [],
          });
        }
      }

      // Check department skills not possessed
      for (const row of deptSkillsResult) {
        const skill = row.skill;
        if (
          skill &&
          !currentSkills.some(
            (s) => s?.toLowerCase() === skill?.toLowerCase(),
          ) &&
          !suggestions.some(
            (s) => s.skill?.toLowerCase() === skill?.toLowerCase(),
          )
        ) {
          suggestions.push({
            skill,
            priority: row.colleagueCount > 2 ? 'medium' : 'low',
            reason: `${row.colleagueCount} đồng nghiệp trong phòng ban có kỹ năng này`,
            relatedProjects: [],
          });
        }
      }

      return {
        suggestions: suggestions.slice(0, 5),
        employee: {
          id: emp.id,
          name: emp.ho_ten,
          department,
          currentSkills,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to recommend training: ${error}`);
      throw error;
    }
  }

  /**
   * Gợi ý dự án phù hợp với nhân viên
   */
  async recommendProjectsForEmployee(
    employeeId?: string,
    employeeName?: string,
    limit = 3,
  ): Promise<{ recommendations: ProjectRecommendation[]; employee: any }> {
    this.logger.log(
      `🚀 Recommending projects for: ${employeeId || employeeName}`,
    );

    try {
      // Get employee's skills
      const employeeResult = await this.neo4jService.run(
        `MATCH (e:NhanSu)
         WHERE ($employeeId IS NOT NULL AND e.id = $employeeId) 
            OR ($employeeName IS NOT NULL AND toLower(e.ho_ten) CONTAINS toLower($employeeName))
         OPTIONAL MATCH (e)-[:CO_KY_NANG]->(k:KyNang)
         OPTIONAL MATCH (e)-[:LAM_DU_AN]->(currentProject:DuAn)
         RETURN e, 
                collect(DISTINCT k.ten) AS skills,
                collect(DISTINCT currentProject.id) AS currentProjectIds
         LIMIT 1`,
        { employeeId: employeeId || null, employeeName: employeeName || null },
      );

      if (employeeResult.length === 0) {
        return { recommendations: [], employee: null };
      }

      const emp = employeeResult[0].e;
      const empSkills: string[] = employeeResult[0].skills.filter(Boolean);
      const currentProjectIds: string[] =
        employeeResult[0].currentProjectIds.filter(Boolean);

      // Find projects with matching technologies that employee is not already in
      const projectsResult = await this.neo4jService.run(
        `MATCH (p:DuAn)
         WHERE p.trang_thai IN ['In Progress', 'Active', 'Đang tiến hành', 'Planning']
           AND NOT p.id IN $currentProjectIds
         OPTIONAL MATCH (p)-[:SU_DUNG_CONG_NGHE]->(tech:CongNghe)
         RETURN p, collect(DISTINCT tech.ten) AS technologies
         LIMIT 20`,
        { currentProjectIds },
      );

      const recommendations: ProjectRecommendation[] = projectsResult
        .map((row: any) => {
          const project = row.p;
          const projectTechs: string[] = row.technologies.filter(Boolean);

          // Calculate matching skills
          const matchingSkills = empSkills.filter((skill) =>
            projectTechs.some(
              (tech: string) =>
                tech &&
                skill &&
                tech.toLowerCase().includes(skill.toLowerCase()),
            ),
          );

          const matchScore =
            projectTechs.length > 0
              ? Math.round((matchingSkills.length / projectTechs.length) * 100)
              : 50;

          return {
            project: {
              id: project.id,
              name: project.ten,
              client: project.khach_hang || 'N/A',
              status: project.trang_thai,
            },
            matchScore,
            matchingSkills,
            reason:
              matchingSkills.length > 0
                ? `Có ${matchingSkills.length} kỹ năng phù hợp: ${matchingSkills.join(', ')}`
                : 'Dự án mới có thể phát triển thêm kỹ năng',
          };
        })
        .filter((r) => r.matchScore > 0)
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, limit);

      return {
        recommendations,
        employee: {
          id: emp.id,
          name: emp.ho_ten,
          skills: empSkills,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to recommend projects: ${error}`);
      throw error;
    }
  }

  // Helper methods
  private getLevelScore(level: string): number {
    const levelMap: Record<string, number> = {
      senior: 10,
      lead: 10,
      principal: 10,
      mid: 7,
      junior: 5,
      intern: 3,
    };
    const lowerLevel = level?.toLowerCase() || '';
    for (const [key, score] of Object.entries(levelMap)) {
      if (lowerLevel.includes(key)) return score;
    }
    return 5;
  }

  private generateRecommendationReason(
    matchingSkills: string[],
    projectCount: number,
    level: string,
  ): string {
    const parts: string[] = [];

    if (matchingSkills.length > 0) {
      parts.push(
        `Có ${matchingSkills.length} kỹ năng phù hợp (${matchingSkills.slice(0, 3).join(', ')})`,
      );
    }

    if (projectCount <= 1) {
      parts.push('Workload thấp, sẵn sàng nhận dự án mới');
    } else if (projectCount <= 3) {
      parts.push('Workload vừa phải');
    }

    if (level) {
      parts.push(`Level: ${level}`);
    }

    return parts.join('. ') || 'Ứng viên tiềm năng';
  }

  /**
   * Tìm nhân viên cần đào tạo bổ sung dựa trên skill gaps
   * So sánh skills của từng nhân viên với trending skills
   */
  async findEmployeesNeedingTraining(limit = 10): Promise<{
    employees: Array<{
      employee: {
        id: string;
        name: string;
        position: string;
        department: string;
      };
      missingSkills: string[];
      skillGapCount: number;
      priority: 'high' | 'medium' | 'low';
      reason: string;
    }>;
    trendingSkills: string[];
  }> {
    this.logger.log(`📚 Finding all employees needing training...`);

    try {
      // Step 1: Get trending skills (technologies used in active projects)
      const trendingResult = await this.neo4jService.run(
        `MATCH (p:DuAn)-[:SU_DUNG_CONG_NGHE]->(tech:CongNghe)
         WHERE p.trang_thai IN ['In Progress', 'Active', 'Đang tiến hành']
         RETURN tech.ten AS skill, count(DISTINCT p) AS projectCount
         ORDER BY projectCount DESC
         LIMIT 10`,
      );

      const trendingSkills = trendingResult
        .map((r: any) => r.skill)
        .filter(Boolean);

      if (trendingSkills.length === 0) {
        return { employees: [], trendingSkills: [] };
      }

      // Step 2: Get all employees and their skills
      const employeesResult = await this.neo4jService.run(
        `MATCH (e:NhanSu)
         OPTIONAL MATCH (e)-[:CO_KY_NANG]->(k:KyNang)
         OPTIONAL MATCH (pb:PhongBan)-[:CO_NHAN_SU]-(e)
         RETURN e,
                pb.ten AS department,
                collect(DISTINCT k.ten) AS skills`,
      );

      // Step 3: Calculate skill gaps for each employee
      const employeesWithGaps = employeesResult
        .map((row: any) => {
          const emp = row.e;
          const currentSkills: string[] = (row.skills || []).filter(Boolean);
          const department = row.department;

          // Find missing trending skills
          const missingSkills = trendingSkills.filter(
            (trendingSkill: string) =>
              !currentSkills.some(
                (s) =>
                  s &&
                  trendingSkill &&
                  s.toLowerCase().includes(trendingSkill.toLowerCase()),
              ),
          );

          const skillGapCount = missingSkills.length;

          // Determine priority based on gap count
          const priority: 'high' | 'medium' | 'low' =
            skillGapCount >= 5 ? 'high' : skillGapCount >= 3 ? 'medium' : 'low';

          const reason =
            skillGapCount > 0
              ? `Thiếu ${skillGapCount} kỹ năng trending: ${missingSkills.slice(0, 3).join(', ')}${missingSkills.length > 3 ? '...' : ''}`
              : 'Đã có đầy đủ kỹ năng trending';

          return {
            employee: {
              id: emp.id,
              name: emp.ho_ten,
              position: emp.chucDanh || 'N/A',
              department: department || 'N/A',
            },
            missingSkills,
            skillGapCount,
            priority,
            reason,
          };
        })
        .filter((e: any) => e.skillGapCount > 0) // Only include those with gaps
        .sort((a: any, b: any) => b.skillGapCount - a.skillGapCount)
        .slice(0, limit);

      return {
        employees: employeesWithGaps,
        trendingSkills,
      };
    } catch (error) {
      this.logger.error(`Failed to find employees needing training: ${error}`);
      throw error;
    }
  }
}
