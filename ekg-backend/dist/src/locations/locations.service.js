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
exports.LocationsService = void 0;
const common_1 = require("@nestjs/common");
const neo4j_service_1 = require("../core/neo4j/neo4j.service");
let LocationsService = class LocationsService {
    neo;
    constructor(neo) {
        this.neo = neo;
    }
    async list() {
        try {
            const rows = await this.neo.run(`MATCH (l:DiaDiem)
         RETURN {
           id: l.id,
           code: l.id,
           name: l.ten,
           address: l.dia_chi,
           type: l.loai,
           description: COALESCE(l.mo_ta, ''),
           city: l.thanh_pho,
           country: l.quoc_gia,
           latitude: l.vi_do,
           longitude: l.kinh_do
         } AS location
         ORDER BY l.ten`);
            return rows.map(r => r.location);
        }
        catch (e) {
            throw new common_1.ServiceUnavailableException('Database connection error');
        }
    }
    async findByName(name) {
        try {
            const rows = await this.neo.run(`MATCH (l:DiaDiem)
         WHERE toLower(l.ten) CONTAINS toLower($name) OR toLower(l.id) CONTAINS toLower($name)
         RETURN {
           id: l.id,
           code: l.id,
           name: l.ten,
           address: l.dia_chi,
           type: l.loai,
           description: COALESCE(l.mo_ta, ''),
           city: l.thanh_pho,
           country: l.quoc_gia,
           latitude: l.vi_do,
           longitude: l.kinh_do
         } AS location
         LIMIT 1`, { name });
            if (!rows[0])
                throw new common_1.NotFoundException(`Location "${name}" not found`);
            return rows[0].location;
        }
        catch (e) {
            if (e instanceof common_1.NotFoundException)
                throw e;
            throw new common_1.ServiceUnavailableException('Database connection error');
        }
    }
};
exports.LocationsService = LocationsService;
exports.LocationsService = LocationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [neo4j_service_1.Neo4jService])
], LocationsService);
//# sourceMappingURL=locations.service.js.map