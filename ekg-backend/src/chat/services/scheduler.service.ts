import { Injectable, Logger } from '@nestjs/common';
import { Neo4jService } from '../../core/neo4j/neo4j.service';
import { v4 as uuidv4 } from 'uuid';
import * as neo4j from 'neo4j-driver';

export interface Task {
  id: string;
  title: string;
  description?: string;
  deadline?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'done';
  assignee?: {
    id: string;
    name: string;
  };
  project?: {
    id: string;
    name: string;
  };
  createdAt: string;
}

export interface CreateTaskDto {
  title: string;
  description?: string;
  deadline?: string;
  priority?: 'low' | 'medium' | 'high';
  projectName?: string;
  assigneeName?: string;
}

export interface MeetingSuggestion {
  suggestedTime: string;
  participants: { id: string; name: string; available: boolean }[];
  conflictCount: number;
  reason: string;
}

export interface TeamAvailability {
  employee: {
    id: string;
    name: string;
    position: string;
  };
  pendingTasks: number;
  activeTasks: number;
  workloadLevel: 'low' | 'medium' | 'high';
  availability: 'available' | 'busy' | 'overloaded';
}

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(private readonly neo4jService: Neo4jService) {}

  /**
   * Đề xuất thời gian họp cho một nhóm nhân viên
   * (Simplified: dựa trên workload, không có calendar integration)
   */
  async suggestMeetingTime(
    participantNames: string[],
    durationMinutes = 60,
    preferredDate?: string,
  ): Promise<MeetingSuggestion[]> {
    this.logger.log(`📅 Suggesting meeting time for: ${participantNames.join(', ')}`);

    try {
      // Get participants' workload
      const participantsResult = await this.neo4jService.run(
        `UNWIND $names AS name
         MATCH (e:NhanSu)
         WHERE toLower(e.ho_ten) CONTAINS toLower(name)
         OPTIONAL MATCH (e)-[:ASSIGNED_TO]->(t:Task)
         WHERE t.status IN ['pending', 'in_progress']
         OPTIONAL MATCH (e)-[:LAM_DU_AN]->(p:DuAn)
         WHERE p.trang_thai IN ['In Progress', 'Active']
         RETURN e, 
                count(DISTINCT t) AS taskCount,
                count(DISTINCT p) AS projectCount`,
        { names: participantNames },
      );

      const participants = participantsResult.map((row: any) => ({
        id: row.e.id,
        name: row.e.ho_ten,
        workload: row.taskCount + row.projectCount,
        available: row.taskCount + row.projectCount < 5,
      }));

      // Generate time suggestions based on workload
      const suggestions: MeetingSuggestion[] = [];
      const baseDate = preferredDate ? new Date(preferredDate) : new Date();

      // Morning slot (9:00 AM)
      const morningTime = new Date(baseDate);
      morningTime.setHours(9, 0, 0, 0);

      // Afternoon slot (2:00 PM)
      const afternoonTime = new Date(baseDate);
      afternoonTime.setHours(14, 0, 0, 0);

      // Next day morning
      const nextDayMorning = new Date(baseDate);
      nextDayMorning.setDate(nextDayMorning.getDate() + 1);
      nextDayMorning.setHours(9, 0, 0, 0);

      const availableCount = participants.filter((p) => p.available).length;
      const totalParticipants = participants.length;

      suggestions.push({
        suggestedTime: morningTime.toISOString(),
        participants: participants.map((p) => ({
          id: p.id,
          name: p.name,
          available: p.available,
        })),
        conflictCount: totalParticipants - availableCount,
        reason: availableCount === totalParticipants
          ? '✅ Tất cả thành viên đều rảnh buổi sáng'
          : `⚠️ ${availableCount}/${totalParticipants} thành viên rảnh`,
      });

      suggestions.push({
        suggestedTime: afternoonTime.toISOString(),
        participants: participants.map((p) => ({
          id: p.id,
          name: p.name,
          available: p.available,
        })),
        conflictCount: totalParticipants - availableCount,
        reason: 'Buổi chiều thường ít meeting hơn',
      });

      if (baseDate.getDay() >= 4) {
        // If Thursday or later, suggest Monday
        const nextMonday = new Date(baseDate);
        nextMonday.setDate(nextMonday.getDate() + ((8 - nextMonday.getDay()) % 7));
        nextMonday.setHours(9, 0, 0, 0);

        suggestions.push({
          suggestedTime: nextMonday.toISOString(),
          participants: participants.map((p) => ({
            id: p.id,
            name: p.name,
            available: true, // Assume available next week
          })),
          conflictCount: 0,
          reason: '📆 Đầu tuần sau - mọi người thường rảnh hơn',
        });
      } else {
        suggestions.push({
          suggestedTime: nextDayMorning.toISOString(),
          participants: participants.map((p) => ({
            id: p.id,
            name: p.name,
            available: p.available,
          })),
          conflictCount: totalParticipants - availableCount,
          reason: 'Thay thế nếu hôm nay không phù hợp',
        });
      }

      return suggestions;
    } catch (error) {
      this.logger.error(`Failed to suggest meeting time: ${error}`);
      throw error;
    }
  }

  /**
   * Tạo task mới trong Neo4j
   */
  async createTask(dto: CreateTaskDto): Promise<Task> {
    this.logger.log(`✅ Creating task: ${dto.title}`);

    try {
      const taskId = `TASK-${uuidv4().slice(0, 8).toUpperCase()}`;
      const now = new Date().toISOString();

      let query = `
        CREATE (t:Task {
          id: $taskId,
          title: $title,
          description: $description,
          deadline: $deadline,
          priority: $priority,
          status: 'pending',
          created_at: datetime($createdAt)
        })
      `;

      const params: any = {
        taskId,
        title: dto.title,
        description: dto.description || '',
        deadline: dto.deadline || null,
        priority: dto.priority || 'medium',
        createdAt: now,
      };

      // Link to project if specified
      if (dto.projectName) {
        query = `
          MATCH (p:DuAn)
          WHERE toLower(p.ten) CONTAINS toLower($projectName) OR toLower(p.ma) CONTAINS toLower($projectName)
          CREATE (t:Task {
            id: $taskId,
            title: $title,
            description: $description,
            deadline: $deadline,
            priority: $priority,
            status: 'pending',
            created_at: datetime($createdAt)
          })
          CREATE (t)-[:PART_OF]->(p)
          RETURN t, p
        `;
        params.projectName = dto.projectName;
      } else {
        query += ` RETURN t, null AS p`;
      }

      const result = await this.neo4jService.run(query, params);

      const task: Task = {
        id: taskId,
        title: dto.title,
        description: dto.description,
        deadline: dto.deadline,
        priority: dto.priority || 'medium',
        status: 'pending',
        createdAt: now,
      };

      if (result[0]?.p) {
        task.project = {
          id: result[0].p.id,
          name: result[0].p.ten,
        };
      }

      // Assign to employee if specified
      if (dto.assigneeName) {
        await this.assignTask(taskId, undefined, dto.assigneeName);
        const assigneeResult = await this.neo4jService.run(
          `MATCH (e:NhanSu)
           WHERE toLower(e.ho_ten) CONTAINS toLower($name)
           RETURN e LIMIT 1`,
          { name: dto.assigneeName },
        );
        if (assigneeResult[0]) {
          task.assignee = {
            id: assigneeResult[0].e.id,
            name: assigneeResult[0].e.ho_ten,
          };
        }
      }

      this.logger.log(`✅ Created task: ${taskId}`);
      return task;
    } catch (error) {
      this.logger.error(`Failed to create task: ${error}`);
      throw error;
    }
  }

  /**
   * Gán task cho nhân viên
   */
  async assignTask(
    taskId?: string,
    taskTitle?: string,
    employeeName?: string,
    employeeId?: string,
  ): Promise<{ success: boolean; task?: Task; employee?: any }> {
    this.logger.log(`👤 Assigning task to employee`);

    try {
      const result = await this.neo4jService.run(
        `MATCH (t:Task)
         WHERE ($taskId IS NOT NULL AND t.id = $taskId)
            OR ($taskTitle IS NOT NULL AND toLower(t.title) CONTAINS toLower($taskTitle))
         MATCH (e:NhanSu)
         WHERE ($employeeId IS NOT NULL AND e.id = $employeeId)
            OR ($employeeName IS NOT NULL AND toLower(e.ho_ten) CONTAINS toLower($employeeName))
         MERGE (e)-[:ASSIGNED_TO]->(t)
         SET t.status = 'in_progress'
         RETURN t, e`,
        {
          taskId: taskId || null,
          taskTitle: taskTitle || null,
          employeeId: employeeId || null,
          employeeName: employeeName || null,
        },
      );

      if (result.length === 0) {
        return { success: false };
      }

      return {
        success: true,
        task: {
          id: result[0].t.id,
          title: result[0].t.title,
          description: result[0].t.description,
          priority: result[0].t.priority,
          status: 'in_progress',
          createdAt: result[0].t.created_at?.toString() || '',
        },
        employee: {
          id: result[0].e.id,
          name: result[0].e.ho_ten,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to assign task: ${error}`);
      throw error;
    }
  }

  /**
   * Lấy danh sách task của nhân viên
   */
  async getEmployeeTasks(
    employeeId?: string,
    employeeName?: string,
  ): Promise<Task[]> {
    this.logger.log(`📋 Getting tasks for employee`);

    try {
      const result = await this.neo4jService.run(
        `MATCH (e:NhanSu)
         WHERE ($employeeId IS NOT NULL AND e.id = $employeeId)
            OR ($employeeName IS NOT NULL AND toLower(e.ho_ten) CONTAINS toLower($employeeName))
         OPTIONAL MATCH (e)-[:ASSIGNED_TO]->(t:Task)
         OPTIONAL MATCH (t)-[:PART_OF]->(p:DuAn)
         RETURN t, p, e
         ORDER BY t.deadline ASC`,
        {
          employeeId: employeeId || null,
          employeeName: employeeName || null,
        },
      );

      return result
        .filter((row: any) => row.t)
        .map((row: any) => ({
          id: row.t.id,
          title: row.t.title,
          description: row.t.description,
          deadline: row.t.deadline,
          priority: row.t.priority,
          status: row.t.status,
          createdAt: row.t.created_at?.toString() || '',
          assignee: {
            id: row.e.id,
            name: row.e.ho_ten,
          },
          project: row.p
            ? { id: row.p.id, name: row.p.ten }
            : undefined,
        }));
    } catch (error) {
      this.logger.error(`Failed to get employee tasks: ${error}`);
      throw error;
    }
  }

  /**
   * Lấy workload/availability của team
   */
  async getTeamAvailability(departmentName?: string): Promise<TeamAvailability[]> {
    this.logger.log(`📊 Getting team availability for: ${departmentName || 'all'}`);

    try {
      let query = `
        MATCH (e:NhanSu)
      `;

      if (departmentName) {
        query = `
          MATCH (pb:PhongBan)-[:CO_NHAN_SU]-(e:NhanSu)
          WHERE toLower(pb.ten) CONTAINS toLower($departmentName) 
             OR toLower(pb.code) CONTAINS toLower($departmentName)
        `;
      }

      query += `
        OPTIONAL MATCH (e)-[:ASSIGNED_TO]->(t:Task)
        WHERE t.status = 'pending'
        WITH e, count(t) AS pendingTasks
        OPTIONAL MATCH (e)-[:ASSIGNED_TO]->(t2:Task)
        WHERE t2.status = 'in_progress'
        WITH e, pendingTasks, count(t2) AS activeTasks
        OPTIONAL MATCH (e)-[:LAM_DU_AN]->(p:DuAn)
        WHERE p.trang_thai IN ['In Progress', 'Active', 'Đang tiến hành']
        RETURN {
          id: e.id,
          name: e.ho_ten,
          position: e.chucDanh
        } AS employee,
        pendingTasks,
        activeTasks,
        count(DISTINCT p) AS projectCount
        ORDER BY (pendingTasks + activeTasks) ASC
        LIMIT 20
      `;

      const result = await this.neo4jService.run(query, {
        departmentName: departmentName || null,
      });

      return result.map((row: any) => {
        const totalLoad = row.pendingTasks + row.activeTasks + row.projectCount;
        
        let workloadLevel: 'low' | 'medium' | 'high';
        let availability: 'available' | 'busy' | 'overloaded';

        if (totalLoad <= 2) {
          workloadLevel = 'low';
          availability = 'available';
        } else if (totalLoad <= 5) {
          workloadLevel = 'medium';
          availability = 'busy';
        } else {
          workloadLevel = 'high';
          availability = 'overloaded';
        }

        return {
          employee: row.employee,
          pendingTasks: row.pendingTasks,
          activeTasks: row.activeTasks,
          workloadLevel,
          availability,
        };
      });
    } catch (error) {
      this.logger.error(`Failed to get team availability: ${error}`);
      throw error;
    }
  }
}
