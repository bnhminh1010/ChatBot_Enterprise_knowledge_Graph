"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GroupsService = void 0;
const common_1 = require("@nestjs/common");
const neo4j_service_1 = require("../core/neo4j/neo4j.service");
let GroupsService = class GroupsService {
    neo;
    constructor(neo) {
        this.neo = neo;
    }
    async list() {
        try {
            const rows = await this.neo.run(`MATCH (n:Nhom)
         RETURN {
           id: n.id,
           code: n.ma,
           name: n.ten,
           description: COALESCE(n.mo_ta, ''),
           type: n.loai_nhom,
           memberCount: n.so_nhan_su
         } AS group
         ORDER BY n.ten`);
            return rows.map(r => r.group);
        }
        catch (e) {
            throw new common_1.ServiceUnavailableException('Database connection error');
        }
    }
    async findByName(name) {
        try {
            const rows = await this.neo.run(`MATCH (n:Nhom)
         WHERE toLower(n.ten) CONTAINS toLower($name) OR toLower(n.ma) CONTAINS toLower($name)
         RETURN {
           id: n.id,
           code: n.ma,
           name: n.ten,
           description: COALESCE(n.mo_ta, ''),
           type: n.loai_nhom,
           memberCount: n.so_nhan_su
         } AS group
         LIMIT 1`, { name });
            if (!rows[0])
                throw new common_1.NotFoundException(`Group "${name}" not found`);
            return rows[0].group;
        }
        catch (e) {
            if (e instanceof common_1.NotFoundException)
                throw e;
            throw new common_1.ServiceUnavailableException('Database connection error');
        }
    }
};
exports.GroupsService = GroupsService;
exports.GroupsService = GroupsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [neo4j_service_1.Neo4jService])
], GroupsService);
//# sourceMappingURL=groups.service.js.map