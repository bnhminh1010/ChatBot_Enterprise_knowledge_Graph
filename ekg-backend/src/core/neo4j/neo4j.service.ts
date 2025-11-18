// ekg-backend/src/core/neo4j/neo4j.service.ts
import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import neo4j, { Driver, Session } from 'neo4j-driver';

@Injectable()
export class Neo4jService implements OnModuleDestroy {
  private driver: Driver | null = null;
  private readonly logger = new Logger(Neo4jService.name);

  private ensureDriver(): void {
    if (this.driver) return;

    const uri = process.env.NEO4J_URI;
    const user = process.env.NEO4J_USER;
    const password = process.env.NEO4J_PASSWORD;

    if (!uri || !user || !password) {
      const msg =
        'Neo4j is not configured. Set NEO4J_URI, NEO4J_USER and NEO4J_PASSWORD environment variables.';
      this.logger.error(msg);
      throw new Error(msg);
    }

    try {
      this.driver = neo4j.driver(uri, neo4j.auth.basic(user, password), {
        connectionTimeout: 10000,
        maxConnectionPoolSize: 50,
      });
    } catch (err) {
      this.logger.error('Failed to create Neo4j driver', err);
      throw err;
    }
  }

  getSession(database = 'neo4j'): Session {
    this.ensureDriver();
    const db = process.env.NEO4J_DATABASE ?? database;
    return this.driver!.session({ database: db });
  }

  async run<T = any>(cypher: string, params: Record<string, any> = {}) {
    this.ensureDriver();
    const session = this.getSession();
    try {
      const res = await session.run(cypher, params);
      return res.records.map((r) => r.toObject()) as T[];
    } catch (err) {
      this.logger.error('Neo4j query error:', err);
      throw err;
    } finally {
      await session.close();
    }
  }

  async onModuleDestroy() {
    try {
      await this.driver?.close();
    } catch (err) {
      this.logger.error('Error closing Neo4j driver', err);
    }
  }
}
