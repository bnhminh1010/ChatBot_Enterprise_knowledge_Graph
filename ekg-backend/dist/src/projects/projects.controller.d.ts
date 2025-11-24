import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
export declare class ProjectsController {
    private svc;
    constructor(svc: ProjectsService);
    list(): Promise<any[]>;
    full(key: string): Promise<any>;
    create(dto: CreateProjectDto): Promise<{
        ok: boolean;
    }>;
}
