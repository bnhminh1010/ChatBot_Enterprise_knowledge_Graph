import { Neo4jService } from '../core/neo4j/neo4j.service';
export declare class EmployeesService {
    private neo;
    private readonly logger;
    constructor(neo: Neo4jService);
    list(skip?: number, limit?: number): Promise<any[]>;
    findByName(name: string, skip?: number, limit?: number): Promise<any[]>;
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
    searchByLevel(level: string, skip?: number, limit?: number): Promise<any[]>;
    searchByEmail(email: string, skip?: number, limit?: number): Promise<any[]>;
    searchByPhone(phone: string, skip?: number, limit?: number): Promise<any[]>;
    searchByBirthDate(birthDate: string, skip?: number, limit?: number): Promise<any[]>;
    searchByJoinDate(joinDate: string, skip?: number, limit?: number): Promise<any[]>;
    searchByStatus(status: string, skip?: number, limit?: number): Promise<any[]>;
    findByCriteria(criteria: {
        department?: string;
        position?: string;
        skill?: string;
        level?: string;
        project?: string;
    }, skip?: number, limit?: number): Promise<any[]>;
    count(): Promise<number>;
    getById(id: string): Promise<any>;
}
