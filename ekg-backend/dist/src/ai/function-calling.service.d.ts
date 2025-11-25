import { EmployeesService } from '../employees/employees.service';
import { DepartmentsService } from '../departments/departments.service';
import { ProjectsService } from '../projects/projects.service';
import { SkillsService } from '../skills/skills.service';
import { CompaniesService } from '../companies/companies.service';
import { PositionsService } from '../positions/positions.service';
import { TechnologiesService } from '../technologies/technologies.service';
import { LocationsService } from '../locations/locations.service';
import { UnitsService } from '../units/units.service';
export declare class FunctionCallingService {
    private employeesService;
    private departmentsService;
    private projectsService;
    private skillsService;
    private companiesService;
    private positionsService;
    private technologiesService;
    private locationsService;
    private unitsService;
    private readonly logger;
    constructor(employeesService: EmployeesService, departmentsService: DepartmentsService, projectsService: ProjectsService, skillsService: SkillsService, companiesService: CompaniesService, positionsService: PositionsService, technologiesService: TechnologiesService, locationsService: LocationsService, unitsService: UnitsService);
    executeFunctionCall(functionName: string, args: any): Promise<any>;
    searchEmployees(args: {
        name?: string;
        department?: string;
        skill?: string;
        position?: string;
        project?: string;
        limit?: number;
    }): Promise<any[]>;
    getEmployeeDetails(args: {
        empId: string;
    }): Promise<any>;
    listDepartments(args: {
        limit?: number;
    }): Promise<any[]>;
    listProjects(args: {
        limit?: number;
    }): Promise<any[]>;
    listSkills(args: {
        limit?: number;
    }): Promise<any[]>;
    getAggregateStats(): Promise<{
        totalEmployees: number;
        totalDepartments: number;
        totalProjects: number;
        totalSkills: number;
        departments: {
            name: any;
            code: any;
        }[];
    }>;
    findEmployeesBySkill(args: {
        skill: string;
        limit?: number;
    }): Promise<any[]>;
    findEmployeesByDepartment(args: {
        department: string;
        limit?: number;
    }): Promise<any[]>;
    findCompany(args: {
        name: string;
    }): Promise<any>;
    findPosition(args: {
        name: string;
    }): Promise<any>;
    findTechnology(args: {
        name: string;
    }): Promise<any>;
    findLocation(args: {
        name: string;
    }): Promise<any>;
    findUnit(args: {
        name: string;
    }): Promise<any>;
    static getToolDefinitions(): ({
        name: string;
        description: string;
        parameters: {
            type: string;
            properties: {
                name: {
                    type: string;
                    description: string;
                };
                department: {
                    type: string;
                    description: string;
                };
                skill: {
                    type: string;
                    description: string;
                };
                position: {
                    type: string;
                    description: string;
                };
                project: {
                    type: string;
                    description: string;
                };
                limit: {
                    type: string;
                    description: string;
                };
                empId?: undefined;
            };
            required?: undefined;
        };
    } | {
        name: string;
        description: string;
        parameters: {
            type: string;
            properties: {
                empId: {
                    type: string;
                    description: string;
                };
                name?: undefined;
                department?: undefined;
                skill?: undefined;
                position?: undefined;
                project?: undefined;
                limit?: undefined;
            };
            required: string[];
        };
    } | {
        name: string;
        description: string;
        parameters: {
            type: string;
            properties: {
                limit: {
                    type: string;
                    description: string;
                };
                name?: undefined;
                department?: undefined;
                skill?: undefined;
                position?: undefined;
                project?: undefined;
                empId?: undefined;
            };
            required?: undefined;
        };
    } | {
        name: string;
        description: string;
        parameters: {
            type: string;
            properties: {
                name?: undefined;
                department?: undefined;
                skill?: undefined;
                position?: undefined;
                project?: undefined;
                limit?: undefined;
                empId?: undefined;
            };
            required?: undefined;
        };
    } | {
        name: string;
        description: string;
        parameters: {
            type: string;
            properties: {
                name: {
                    type: string;
                    description: string;
                };
                department?: undefined;
                skill?: undefined;
                position?: undefined;
                project?: undefined;
                limit?: undefined;
                empId?: undefined;
            };
            required: string[];
        };
    })[];
}
