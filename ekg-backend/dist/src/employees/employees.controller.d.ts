import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
export declare class EmployeesController {
    private svc;
    constructor(svc: EmployeesService);
    list(skip: number, limit: number): Promise<any[]>;
    top(limit: number): Promise<any[]>;
    get(empId: string): Promise<any>;
    create(dto: CreateEmployeeDto): Promise<{
        ok: boolean;
    }>;
}
