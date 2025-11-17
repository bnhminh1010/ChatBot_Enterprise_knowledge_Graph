import 'dotenv/config';
import neo4j, { Driver } from 'neo4j-driver';
import fs from 'fs';
import path from 'path';

async function runCypherFile(driver: Driver, filePath: string) {
  const session = driver.session({ database: 'neo4j' });
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const statements = content
      .split(/;\s*\n?/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('//'));
    
    console.log(`📝 Running ${statements.length} statements from ${path.basename(filePath)}`);
    
    for (const stmt of statements) {
      try {
        await session.run(stmt);
        console.log(`✅ Success: ${stmt.substring(0, 50)}...`);
      } catch (err) {
        console.error(`❌ Error in statement: ${stmt.substring(0, 50)}...`);
        console.error(`   Error: ${err}`);
      }
    }
    console.log(`✅ Completed cypher file: ${path.basename(filePath)}`);
  } finally {
    await session.close();
  }
}

async function main() {
  const uri = process.env.NEO4J_URI!;
  const user = process.env.NEO4J_USER!;
  const password = process.env.NEO4J_PASSWORD!;
  
  console.log(`🔌 Connecting to Neo4j at ${uri}`);
  
  const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  
  try {
    // Test connection
    const session = driver.session();
    await session.run('RETURN 1');
    await session.close();
    console.log('✅ Connected to Neo4j successfully');
    
    // Run seed files
    const constraintsPath = path.resolve(__dirname, 'cypher', 'constraints.cypher');
    const seedCorePath = path.resolve(__dirname, 'cypher', 'seed-core.cypher');
    const seedUsersPath = path.resolve(__dirname, 'cypher', 'seed-users.cypher');
    const seedAdditionalPath = path.resolve(__dirname, 'cypher', 'seed-additional.cypher');
    
    await runCypherFile(driver, constraintsPath);
    await runCypherFile(driver, seedCorePath);
    await runCypherFile(driver, seedUsersPath);
    await runCypherFile(driver, seedAdditionalPath);
    
    console.log('🌱 All seed data completed successfully');
    
    // Show summary
    const summarySession = driver.session();
    const result = await summarySession.run(`
      MATCH (n) 
      RETURN labels(n) as type, count(*) as count 
      ORDER BY type
    `);
    
    console.log('\n📊 Database Summary:');
    for (const record of result.records) {
      console.log(`   ${record.get('type').join(', ')}: ${record.get('count')} records`);
    }
    
    await summarySession.close();
    
  } catch (err) {
    console.error('❌ Seed error:', err);
    process.exitCode = 1;
  } finally {
    await driver.close();
  }
}

main();