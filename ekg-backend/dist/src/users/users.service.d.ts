import { Neo4jService } from '../core/neo4j/neo4j.service';
export interface User {
    email: string;
    username?: string;
    hoTen: string;
    trangThai: string;
    password?: string;
    role?: string;
}
export declare class UsersService {
    private readonly neo4j;
    constructor(neo4j: Neo4jService);
    findByEmail(email: string): Promise<User | null>;
    findByUsername(username: string): Promise<User | null>;
    validatePassword(plainPassword: string, hashedPassword: string | undefined): Promise<boolean>;
    hashPassword(password: string): Promise<string>;
}
