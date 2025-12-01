import { PositionsService } from '../positions/positions.service';
import { TechnologiesService } from '../technologies/technologies.service';
import { EmployeesService } from '../employees/employees.service';
import { DepartmentsService } from '../departments/departments.service';
import { ProjectsService } from '../projects/projects.service';
import { SkillsService } from '../skills/skills.service';
import { DocumentsService } from '../documents/documents.service';
import { ChromaDBService } from './chroma-db.service';
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
    private readonly documentsService;
    private readonly chromaDBService;
    private readonly logger;
    constructor(positionsService: PositionsService, technologiesService: TechnologiesService, employeesService: EmployeesService, departmentsService: DepartmentsService, projectsService: ProjectsService, skillsService: SkillsService, documentsService: DocumentsService, chromaDBService: ChromaDBService);
    getTools(): ToolDefinition[];
    private getUniversalTools;
    private getEmployeeTools;
    private getPositionTools;
    private getDepartmentTools;
    private getProjectTools;
    private getTechnologyTools;
    private getSkillTools;
    private getDocumentTools;
    executeTool(name: string, args: any): Promise<any>;
}
