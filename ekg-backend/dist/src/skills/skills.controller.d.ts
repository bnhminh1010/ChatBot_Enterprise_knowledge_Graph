import { SkillsService } from './skills.service';
import { AddSkillToEmployeeDto } from './dto/add-skill-to-employee.dto';
export declare class SkillsController {
    private svc;
    constructor(svc: SkillsService);
    top(limit?: string): Promise<any[]>;
    add(dto: AddSkillToEmployeeDto): Promise<{
        ok: boolean;
    }>;
    related(ten: string, limit?: string): Promise<any[]>;
}
