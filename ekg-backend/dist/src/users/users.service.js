"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const neo4j_service_1 = require("../core/neo4j/neo4j.service");
const bcrypt = __importStar(require("bcrypt"));
let UsersService = class UsersService {
    neo4j;
    constructor(neo4j) {
        this.neo4j = neo4j;
    }
    async findByEmail(email) {
        const cypher = `
      MATCH (u:NguoiDung {email: $email})-[:CO_VAI_TRO]->(r:VaiTro)
      RETURN u.email AS email,
             u.username AS username,
             u.ho_ten AS hoTen, 
             u.trang_thai AS trangThai,
             u.mat_khau AS password,
             r.ma AS role
    `;
        const result = await this.neo4j.run(cypher, { email });
        if (result.length === 0) {
            return null;
        }
        const record = result[0];
        return {
            email: record.email,
            username: record.username,
            hoTen: record.hoTen,
            trangThai: record.trangThai,
            password: record.password,
            role: record.role,
        };
    }
    async findByUsername(username) {
        const cypher = `
      MATCH (u:NguoiDung {username: $username})-[:CO_VAI_TRO]->(r:VaiTro)
      RETURN u.username AS username, 
             u.ho_ten AS hoTen, 
             u.trang_thai AS trangThai,
             u.mat_khau AS password,
             r.ma AS role
    `;
        const result = await this.neo4j.run(cypher, { username });
        if (result.length === 0) {
            return null;
        }
        const record = result[0];
        return {
            email: record.username,
            username: record.username,
            hoTen: record.hoTen,
            trangThai: record.trangThai,
            password: record.password,
            role: record.role,
        };
    }
    async validatePassword(plainPassword, hashedPassword) {
        if (!hashedPassword) {
            return false;
        }
        return bcrypt.compare(plainPassword, hashedPassword);
    }
    async hashPassword(password) {
        const saltRounds = 10;
        return bcrypt.hash(password, saltRounds);
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [neo4j_service_1.Neo4jService])
], UsersService);
//# sourceMappingURL=users.service.js.map