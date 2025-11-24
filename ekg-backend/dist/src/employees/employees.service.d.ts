import { Neo4jService } from '../core/neo4j/neo4j.service';
export declare class EmployeesService {
    private neo;
    private readonly logger;
    constructor(neo: Neo4jService);
    list(skip?: number, limit?: number): Promise<any[]>;
    get(empId: string): Promise<any>;
    create(dto: {
        empId: string;
        ten: string;
        chucDanh?: string;
        phongBanCode: string;
    }): Promise<{
        ok: boolean;
    }>;
    topSkills(limit?: number): Promise<any[]>;
    findByDepartment(deptName: string, skip?: number, limit?: number): Promise<any[]>;
    findBySkill(skillName: string, skip?: number, limit?: number): Promise<any[]>;
    findByPosition(position: string, skip?: number, limit?: number): Promise<any[]>;
    findByProject(projectKey: string, skip?: number, limit?: number): Promise<any[]>;
}
