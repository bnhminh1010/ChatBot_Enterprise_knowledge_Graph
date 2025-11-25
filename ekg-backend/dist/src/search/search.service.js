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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchService = void 0;
const common_1 = require("@nestjs/common");
const neo4j_service_1 = require("../core/neo4j/neo4j.service");
const neo4j_driver_1 = __importDefault(require("neo4j-driver"));
let SearchService = class SearchService {
    neo;
    constructor(neo) {
        this.neo = neo;
    }
    async search(params) {
        const q = params.query ?? '';
        const page = params.page ?? 1;
        const limit = params.limit ?? 20;
        const skip = (page - 1) * limit;
        const unionBlock = `CALL {
      MATCH (e:NhanSu) WHERE toLower(e.ho_ten) CONTAINS toLower($q)
      RETURN 'Employee' AS type, e.id AS id, e.ho_ten AS name, e.chucDanh AS extra
      UNION
      MATCH (k:KyNang) WHERE toLower(k.ten) CONTAINS toLower($q)
      RETURN 'Skill' AS type, k.ten AS id, k.ten AS name, COALESCE(k.category, '') AS extra
      UNION
      MATCH (p:DuAn) WHERE toLower(p.ten) CONTAINS toLower($q) OR toLower(p.ma) CONTAINS toLower($q)
      RETURN 'Project' AS type, p.id AS id, p.ten AS name, p.trang_thai AS extra
      UNION
      MATCH (d:PhongBan) WHERE toLower(d.ten) CONTAINS toLower($q)
      RETURN 'Department' AS type, d.id AS id, d.ten AS name, COALESCE(d.description, '') AS extra
    }`;
        try {
            const rows = await this.neo.run(`${unionBlock}
         RETURN {type: type, id: id, name: name} AS res 
         SKIP $skip LIMIT $limit`, { q, skip: neo4j_driver_1.default.int(skip), limit: neo4j_driver_1.default.int(limit) });
            return rows.map((r) => r.res);
        }
        catch (error) {
            throw new Error(`Search failed: ${error}`);
        }
    }
};
exports.SearchService = SearchService;
exports.SearchService = SearchService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [neo4j_service_1.Neo4jService])
], SearchService);
//# sourceMappingURL=search.service.js.map