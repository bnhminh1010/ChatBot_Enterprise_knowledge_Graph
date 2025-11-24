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

  /**
   * Verify Neo4j connection
   */
  async verifyConnection(): Promise<boolean> {
    try {
      this.ensureDriver();
      const session = this.getSession();
      try {
        await session.run('RETURN 1 as test');
        return true;
      } finally {
        await session.close();
      }
    } catch (err: any) {
      this.logger.error('Neo4j connection verification failed:', err?.message || err);
      return false;
    }
  }

  async run<T = any>(cypher: string, params: Record<string, any> = {}) {
    this.ensureDriver();
    const session = this.getSession();
    try {
      const res = await session.run(cypher, params);
      return res.records.map((r) => r.toObject()) as T[];
    } catch (err: any) {
      // Log chi tiết lỗi
      const errorMessage = err?.message || 'Unknown error';
      const errorCode = err?.code || 'UNKNOWN';
      
      this.logger.error('Neo4j query error:', {
        message: errorMessage,
        code: errorCode,
        query: cypher.substring(0, 100), // Log một phần query để debug
        stack: err?.stack,
      });

      // Tạo error message chi tiết hơn
      if (errorCode === 'ServiceUnavailable' || errorMessage.includes('ECONNREFUSED')) {
        throw new Error(
          `Không thể kết nối đến Neo4j database. ` +
          `Vui lòng kiểm tra:\n` +
          `1. Neo4j có đang chạy không? (docker-compose up -d)\n` +
          `2. NEO4J_URI trong .env có đúng không? (${process.env.NEO4J_URI || 'chưa cấu hình'})\n` +
          `3. Port 7687 có bị chặn không?`
        );
      } else if (errorCode === 'Neo.ClientError.Security.Unauthorized') {
        throw new Error(
          `Lỗi xác thực Neo4j. ` +
          `Vui lòng kiểm tra NEO4J_USER và NEO4J_PASSWORD trong file .env`
        );
      } else {
        throw new Error(`Database error: ${errorMessage}`);
      }
    } finally {
      await session.close();
    }
  }

  /**
   * Run query and return raw Neo4j result (for services that need access to records)
   */
  async runRaw(cypher: string, params: Record<string, any> = {}) {
    this.ensureDriver();
    const session = this.getSession();
    try {
      return await session.run(cypher, params);
    } catch (err: any) {
      const errorMessage = err?.message || 'Unknown error';
      this.logger.error('Neo4j query error:', errorMessage);
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
