require('dotenv').config();
const neo4j = require('neo4j-driver');

(async () => {
  const URI = process.env.NEO4J_URI;
  const USER = process.env.NEO4J_USER;
  const PASSWORD = process.env.NEO4J_PASSWORD;

  console.log('URI  :', URI);
  console.log('USER :', USER);
  console.log('PASS length:', PASSWORD ? PASSWORD.length : 'undefined');

  const driver = neo4j.driver(URI, neo4j.auth.basic(USER, PASSWORD));

  try {
    const serverInfo = await driver.getServerInfo();
    console.log('🔥 CONNECTED TO NEO4J AURA!');
    console.log(serverInfo);
  } catch (error) {
    console.error('❌ Connection failed:', error);
  } finally {
    await driver.close();
  }
})();
