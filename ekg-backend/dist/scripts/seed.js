"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const neo4j_driver_1 = __importDefault(require("neo4j-driver"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
async function runCypherFile(driver, filePath) {
    const session = driver.session({
        database: process.env.NEO4J_DATABASE || 'neo4j',
    });
    try {
        const content = fs_1.default.readFileSync(filePath, 'utf-8');
        const statements = content
            .split(/;\s*\n?/)
            .map((s) => s.trim())
            .filter((s) => s.length > 0 && !s.startsWith('//'));
        for (const stmt of statements) {
            await session.run(stmt);
        }
        console.log(`✅ Executed cypher file: ${path_1.default.basename(filePath)} (${statements.length} statements)`);
    }
    finally {
        await session.close();
    }
}
async function main() {
    const uri = process.env.NEO4J_URI;
    const user = process.env.NEO4J_USER;
    const password = process.env.NEO4J_PASSWORD;
    const driver = neo4j_driver_1.default.driver(uri, neo4j_driver_1.default.auth.basic(user, password));
    try {
        const constraintsPath = path_1.default.resolve(__dirname, 'cypher', 'constraints.cypher');
        const seedCorePath = path_1.default.resolve(__dirname, 'cypher', 'seed-core.cypher');
        await runCypherFile(driver, constraintsPath);
        await runCypherFile(driver, seedCorePath);
        console.log('🌱 Seed completed');
    }
    catch (err) {
        console.error('Seed error:', err);
        process.exitCode = 1;
    }
    finally {
        await driver.close();
    }
}
main();
//# sourceMappingURL=seed.js.map