"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var Neo4jService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Neo4jService = void 0;
const common_1 = require("@nestjs/common");
const neo4j_driver_1 = __importDefault(require("neo4j-driver"));
let Neo4jService = Neo4jService_1 = class Neo4jService {
    driver = null;
    logger = new common_1.Logger(Neo4jService_1.name);
    ensureDriver() {
        if (this.driver)
            return;
        const uri = process.env.NEO4J_URI;
        const user = process.env.NEO4J_USER;
        const password = process.env.NEO4J_PASSWORD;
        if (!uri || !user || !password) {
            const msg = 'Neo4j is not configured. Set NEO4J_URI, NEO4J_USER and NEO4J_PASSWORD environment variables.';
            this.logger.error(msg);
            throw new Error(msg);
        }
        try {
            this.driver = neo4j_driver_1.default.driver(uri, neo4j_driver_1.default.auth.basic(user, password), {
                connectionTimeout: 10000,
                maxConnectionPoolSize: 50,
            });
        }
        catch (err) {
            this.logger.error('Failed to create Neo4j driver', err);
            throw err;
        }
    }
    getSession(database = 'neo4j') {
        this.ensureDriver();
        const db = process.env.NEO4J_DATABASE ?? database;
        return this.driver.session({ database: db });
    }
    async run(cypher, params = {}) {
        this.ensureDriver();
        const session = this.getSession();
        try {
            const res = await session.run(cypher, params);
            return res.records.map((r) => r.toObject());
        }
        catch (err) {
            this.logger.error('Neo4j query error:', err);
            throw err;
        }
        finally {
            await session.close();
        }
    }
    async onModuleDestroy() {
        try {
            await this.driver?.close();
        }
        catch (err) {
            this.logger.error('Error closing Neo4j driver', err);
        }
    }
};
exports.Neo4jService = Neo4jService;
exports.Neo4jService = Neo4jService = Neo4jService_1 = __decorate([
    (0, common_1.Injectable)()
], Neo4jService);
//# sourceMappingURL=neo4j.service.js.map