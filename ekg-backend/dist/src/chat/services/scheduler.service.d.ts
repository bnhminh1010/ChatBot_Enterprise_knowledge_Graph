import { Neo4jService } from '../../core/neo4j/neo4j.service';
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
    participants: {
        id: string;
        name: string;
        available: boolean;
    }[];
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
export declare class SchedulerService {
    private readonly neo4jService;
    private readonly logger;
    constructor(neo4jService: Neo4jService);
    suggestMeetingTime(participantNames: string[], durationMinutes?: number, preferredDate?: string): Promise<MeetingSuggestion[]>;
    createTask(dto: CreateTaskDto): Promise<Task>;
    assignTask(taskId?: string, taskTitle?: string, employeeName?: string, employeeId?: string): Promise<{
        success: boolean;
        task?: Task;
        employee?: any;
    }>;
    getEmployeeTasks(employeeId?: string, employeeName?: string): Promise<Task[]>;
    getTeamAvailability(departmentName?: string): Promise<TeamAvailability[]>;
}
