import { ChromaDBService } from '../../ai/chroma-db.service';
import { EmployeesService } from '../../employees/employees.service';
import { DepartmentsService } from '../../departments/departments.service';
import { ProjectsService } from '../../projects/projects.service';
import { SkillsService } from '../../skills/skills.service';
import { DocumentsService } from '../../documents/documents.service';
export declare class ChromaIndexingService {
    private readonly chromaDBService;
    private readonly employeesService;
    private readonly departmentsService;
    private readonly projectsService;
    private readonly skillsService;
    private readonly documentsService;
    private readonly logger;
    constructor(chromaDBService: ChromaDBService, employeesService: EmployeesService, departmentsService: DepartmentsService, projectsService: ProjectsService, skillsService: SkillsService, documentsService: DocumentsService);
    indexAll(): Promise<{
        success: boolean;
        message: string;
        details: any;
    }>;
}
