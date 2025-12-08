import { ProjectsService } from '../../projects/projects.service';
import { DepartmentsService } from '../../departments/departments.service';
import { ChatResponse } from '../dto/chat-response.dto';
export declare class UploadIntentHandlerService {
    private readonly projectsService;
    private readonly departmentsService;
    private readonly logger;
    constructor(projectsService: ProjectsService, departmentsService: DepartmentsService);
    handleUploadIntent(message: string): Promise<ChatResponse | null>;
    private findTargetNode;
    private getTargetLabel;
    private isHelpQuery;
    hasUploadIntent(message: string): boolean;
}
