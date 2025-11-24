import 'dotenv/config';
import neo4j, { Driver } from 'neo4j-driver';
import fs from 'fs';
import path from 'path';

async function runCypherFile(driver: Driver, filePath: string) {
  const session = driver.session({
    database: process.env.NEO4J_DATABASE || 'neo4j',
  });
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const statements = content
      .split(/;\s*\n?/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('//'));
    for (const stmt of statements) {
      await session.run(stmt);
    }
    console.log(
      `✅ Executed cypher file: ${path.basename(filePath)} (${statements.length} statements)`,
    );
  } finally {
    await session.close();
  }
}

async function main() {
  const uri = process.env.NEO4J_URI!;
  const user = process.env.NEO4J_USER!;
  const password = process.env.NEO4J_PASSWORD!;
  const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  try {
    const constraintsPath = path.resolve(
      __dirname,
      'cypher',
      'constraints.cypher',
    );
    const seedCorePath = path.resolve(__dirname, 'cypher', 'seed-core.cypher');
    await runCypherFile(driver, constraintsPath);
    await runCypherFile(driver, seedCorePath);
    console.log('🌱 Seed completed');
  } catch (err) {
    console.error('Seed error:', err);
    process.exitCode = 1;
  } finally {
    await driver.close();
  }
}

main();
