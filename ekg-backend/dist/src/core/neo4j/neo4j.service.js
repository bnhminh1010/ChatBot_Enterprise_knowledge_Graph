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
    async verifyConnection() {
        try {
            this.ensureDriver();
            const session = this.getSession();
            try {
                await session.run('RETURN 1 as test');
                return true;
            }
            finally {
                await session.close();
            }
        }
        catch (err) {
            this.logger.error('Neo4j connection verification failed:', err?.message || err);
            return false;
        }
    }
    async run(cypher, params = {}) {
        this.ensureDriver();
        const session = this.getSession();
        try {
            const res = await session.run(cypher, params);
            return res.records.map((r) => r.toObject());
        }
        catch (err) {
            const errorMessage = err?.message || 'Unknown error';
            const errorCode = err?.code || 'UNKNOWN';
            this.logger.error('Neo4j query error:', {
                message: errorMessage,
                code: errorCode,
                query: cypher.substring(0, 100),
                stack: err?.stack,
            });
            if (errorCode === 'ServiceUnavailable' || errorMessage.includes('ECONNREFUSED')) {
                throw new Error(`Không thể kết nối đến Neo4j database. ` +
                    `Vui lòng kiểm tra:\n` +
                    `1. Neo4j có đang chạy không? (docker-compose up -d)\n` +
                    `2. NEO4J_URI trong .env có đúng không? (${process.env.NEO4J_URI || 'chưa cấu hình'})\n` +
                    `3. Port 7687 có bị chặn không?`);
            }
            else if (errorCode === 'Neo.ClientError.Security.Unauthorized') {
                throw new Error(`Lỗi xác thực Neo4j. ` +
                    `Vui lòng kiểm tra NEO4J_USER và NEO4J_PASSWORD trong file .env`);
            }
            else {
                throw new Error(`Database error: ${errorMessage}`);
            }
        }
        finally {
            await session.close();
        }
    }
    async runRaw(cypher, params = {}) {
        this.ensureDriver();
        const session = this.getSession();
        try {
            return await session.run(cypher, params);
        }
        catch (err) {
            const errorMessage = err?.message || 'Unknown error';
            this.logger.error('Neo4j query error:', errorMessage);
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