"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const cache_manager_1 = require("@nestjs/cache-manager");
const neo4j_module_1 = require("./core/neo4j/neo4j.module");
const redis_module_1 = require("./core/redis/redis.module");
const employees_module_1 = require("./employees/employees.module");
const projects_module_1 = require("./projects/projects.module");
const departments_module_1 = require("./departments/departments.module");
const skills_module_1 = require("./skills/skills.module");
const search_controller_1 = require("./search/search.controller");
const chat_module_1 = require("./chat/chat.module");
const ai_module_1 = require("./ai/ai.module");
const auth_module_1 = require("./auth/auth.module");
const users_module_1 = require("./users/users.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            cache_manager_1.CacheModule.register({
                isGlobal: true,
                ttl: 600,
                max: 100,
            }),
            neo4j_module_1.Neo4jModule,
            redis_module_1.RedisModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            employees_module_1.EmployeesModule,
            projects_module_1.ProjectsModule,
            departments_module_1.DepartmentsModule,
            skills_module_1.SkillsModule,
            ai_module_1.AiModule,
            chat_module_1.ChatModule,
        ],
        controllers: [search_controller_1.SearchController],
        providers: [],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map