import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
export declare class DepartmentsController {
    private svc;
    constructor(svc: DepartmentsService);
    list(): Promise<any[]>;
    get(code: string): Promise<any>;
    create(dto: CreateDepartmentDto): Promise<{
        ok: boolean;
    }>;
    update(code: string, dto: UpdateDepartmentDto): Promise<any>;
    remove(code: string): Promise<{
        ok: boolean;
    }>;
}
