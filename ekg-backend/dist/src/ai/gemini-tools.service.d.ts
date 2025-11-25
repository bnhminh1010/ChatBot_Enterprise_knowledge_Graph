import { PositionsService } from '../positions/positions.service';
import { TechnologiesService } from '../technologies/technologies.service';
import { EmployeesService } from '../employees/employees.service';
import { DepartmentsService } from '../departments/departments.service';
import { ProjectsService } from '../projects/projects.service';
import { SkillsService } from '../skills/skills.service';
export interface ToolDefinition {
    name: string;
    description: string;
    parameters: {
        type: string;
        properties: Record<string, any>;
        required?: string[];
    };
}
export declare class GeminiToolsService {
    private readonly positionsService;
    private readonly technologiesService;
    private readonly employeesService;
    private readonly departmentsService;
    private readonly projectsService;
    private readonly skillsService;
    private readonly logger;
    constructor(positionsService: PositionsService, technologiesService: TechnologiesService, employeesService: EmployeesService, departmentsService: DepartmentsService, projectsService: ProjectsService, skillsService: SkillsService);
    getTools(): ToolDefinition[];
    private getEmployeeTools;
    private getPositionTools;
    private getDepartmentTools;
    private getProjectTools;
    private getTechnologyTools;
    private getSkillTools;
    executeTool(name: string, args: any): Promise<any>;
}
