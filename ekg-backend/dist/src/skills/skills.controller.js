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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkillsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const skills_service_1 = require("./skills.service");
const add_skill_to_employee_dto_1 = require("./dto/add-skill-to-employee.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
let SkillsController = class SkillsController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    top(limit) {
        return this.svc.top(Number(limit ?? 10));
    }
    add(dto) {
        return this.svc.addToEmployee(dto);
    }
    related(ten, limit) {
        return this.svc.related(ten, Number(limit ?? 5));
    }
};
exports.SkillsController = SkillsController;
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Top kỹ năng theo tần suất xuất hiện' }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, example: 10 }),
    (0, common_1.Get)('top'),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SkillsController.prototype, "top", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Gán kỹ năng cho nhân sự' }),
    (0, common_1.Post)('add-to-employee'),
    (0, roles_decorator_1.Roles)('ADMIN'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [add_skill_to_employee_dto_1.AddSkillToEmployeeDto]),
    __metadata("design:returntype", void 0)
], SkillsController.prototype, "add", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Kỹ năng liên quan (đồng xuất hiện với kỹ năng đầu vào)' }),
    (0, swagger_1.ApiQuery)({ name: 'ten', required: true, example: 'Node.js' }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, example: 5 }),
    (0, common_1.Get)('related'),
    __param(0, (0, common_1.Query)('ten')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], SkillsController.prototype, "related", null);
exports.SkillsController = SkillsController = __decorate([
    (0, swagger_1.ApiTags)('Skills'),
    (0, common_1.Controller)('skills'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [skills_service_1.SkillsService])
], SkillsController);
//# sourceMappingURL=skills.controller.js.map