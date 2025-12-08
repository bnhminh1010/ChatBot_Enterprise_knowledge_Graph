import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Neo4jService } from '../../core/neo4j/neo4j.service';

/**
 * Schema context for agent
 */
interface NodeTypeInfo {
  label: string;
  displayNameVi: string;
  count: number;
  properties: string[];
  sampleData: Record<string, any>[];
}

interface RelationshipInfo {
  type: string;
  fromLabel: string;
  toLabel: string;
  descriptionVi: string;
  count: number;
}

interface DatabaseSchema {
  nodeTypes: NodeTypeInfo[];
  relationships: RelationshipInfo[];
  lastUpdated: Date;
}

interface DatabaseStats {
  employees: { total: number; byDepartment: Record<string, number> };
  departments: { total: number; names: string[] };
  projects: { total: number; byStatus: Record<string, number> };
  skills: { total: number; topSkills: string[] };
  documents: { total: number };
  lastUpdated: Date;
}

/**
 * Service để load và cache database context cho agent
 * Giúp agent hiểu cấu trúc database và reasoning tốt hơn
 * 
 * Features:
 * - Load Neo4j schema (node types, relationships, properties)
 * - Load statistics (counts, distributions)
 * - Load sample data (3-5 samples per node type)
 * - Cache với TTL để giảm load
 * - Format thành context string cho agent prompt
 */
@Injectable()
export class DatabaseContextService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseContextService.name);
  
  // Cache
  private schemaCache: DatabaseSchema | null = null;
  private statsCache: DatabaseStats | null = null;
  private contextStringCache: string | null = null;
  
  // Cache TTL
  private readonly SCHEMA_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
  private readonly STATS_TTL_MS = 5 * 60 * 1000; // 5 minutes
  
  private schemaLastLoaded: Date | null = null;
  private statsLastLoaded: Date | null = null;

  // Node type mappings (Vietnamese display names)
  private readonly nodeTypeMap: Record<string, string> = {
    NhanSu: 'Nhân viên',
    PhongBan: 'Phòng ban',
    DuAn: 'Dự án',
    KyNang: 'Kỹ năng',
    TaiLieu: 'Tài liệu',
    ChucDanh: 'Chức danh',
    CongNghe: 'Công nghệ',
    ViTri: 'Vị trí',
    CongTy: 'Công ty',
  };

  // Relationship mappings
  private readonly relationshipMap: Record<string, string> = {
    LAM_VIEC_TAI: 'làm việc tại',
    CO_KY_NANG: 'có kỹ năng',
    THAM_GIA: 'tham gia dự án',
    QUAN_LY: 'quản lý',
    DINH_KEM_TAI_LIEU: 'đính kèm tài liệu',
    GIU_CHUC_VU: 'giữ chức vụ',
    SU_DUNG_CONG_NGHE: 'sử dụng công nghệ',
  };

  constructor(private readonly neo4j: Neo4jService) {}

  /**
   * Load context on module init
   */
  async onModuleInit() {
    try {
      this.logger.log('Loading database context for agent...');
      await this.loadFullContext();
      this.logger.log('Database context loaded successfully');
    } catch (error) {
      this.logger.warn(`Failed to load initial context: ${error}`);
    }
  }

  /**
   * Load full context (schema + stats + samples)
   */
  async loadFullContext(): Promise<void> {
    await Promise.all([
      this.loadSchema(),
      this.loadStatistics(),
    ]);
    this.buildContextString();
  }

  /**
   * Load schema từ Neo4j
   */
  private async loadSchema(): Promise<void> {
    try {
      const nodeTypes: NodeTypeInfo[] = [];

      // Load each node type with properties and sample data
      for (const [label, displayName] of Object.entries(this.nodeTypeMap)) {
        try {
          // Get count
          const countResult = await this.neo4j.run(
            `MATCH (n:${label}) RETURN count(n) as count`,
          );
          const count = (countResult[0] as any)?.count?.toNumber?.() || 0;

          if (count === 0) continue;

          // Get properties và sample data
          const sampleResult = await this.neo4j.run(
            `MATCH (n:${label}) 
             RETURN n 
             LIMIT 3`,
          );

          const samples = sampleResult.map((r: any) => {
            const node = r.n?.properties || {};
            // Sanitize - chỉ lấy các field quan trọng
            return this.sanitizeNodeData(label, node);
          });

          // Get property keys
          const properties = samples.length > 0 
            ? Object.keys(samples[0])
            : [];

          nodeTypes.push({
            label,
            displayNameVi: displayName,
            count,
            properties,
            sampleData: samples,
          });
        } catch (error) {
          this.logger.warn(`Failed to load schema for ${label}: ${error}`);
        }
      }

      // Load relationships
      const relationships: RelationshipInfo[] = [];
      
      for (const [relType, description] of Object.entries(this.relationshipMap)) {
        try {
          const relResult = await this.neo4j.run(
            `MATCH (a)-[r:${relType}]->(b)
             RETURN labels(a)[0] as fromLabel, labels(b)[0] as toLabel, count(r) as count
             LIMIT 1`,
          );

          if (relResult.length > 0) {
            const row = relResult[0] as any;
            relationships.push({
              type: relType,
              fromLabel: row.fromLabel || 'Unknown',
              toLabel: row.toLabel || 'Unknown',
              descriptionVi: description,
              count: row.count?.toNumber?.() || 0,
            });
          }
        } catch (error) {
          // Skip if relationship doesn't exist
        }
      }

      this.schemaCache = {
        nodeTypes,
        relationships,
        lastUpdated: new Date(),
      };
      this.schemaLastLoaded = new Date();

      this.logger.debug(`Schema loaded: ${nodeTypes.length} node types, ${relationships.length} relationships`);
    } catch (error) {
      this.logger.error(`Failed to load schema: ${error}`);
    }
  }

  /**
   * Load statistics
   */
  private async loadStatistics(): Promise<void> {
    try {
      // Employees by department
      const empByDeptResult = await this.neo4j.run(
        `MATCH (n:NhanSu)-[:LAM_VIEC_TAI]->(p:PhongBan)
         RETURN p.ten as dept, count(n) as count
         ORDER BY count DESC`,
      );
      const byDepartment: Record<string, number> = {};
      let totalEmployees = 0;
      for (const row of empByDeptResult) {
        const r = row as any;
        byDepartment[r.dept] = r.count?.toNumber?.() || 0;
        totalEmployees += byDepartment[r.dept];
      }

      // Departments
      const deptResult = await this.neo4j.run(
        `MATCH (p:PhongBan) RETURN p.ten as name ORDER BY name`,
      );
      const deptNames = deptResult.map((r: any) => r.name).filter(Boolean);

      // Projects by status
      const projectResult = await this.neo4j.run(
        `MATCH (d:DuAn)
         RETURN d.trang_thai as status, count(d) as count`,
      );
      const byStatus: Record<string, number> = {};
      let totalProjects = 0;
      for (const row of projectResult) {
        const r = row as any;
        const status = r.status || 'Unknown';
        byStatus[status] = r.count?.toNumber?.() || 0;
        totalProjects += byStatus[status];
      }

      // Top skills
      const skillResult = await this.neo4j.run(
        `MATCH (s:KyNang)<-[:CO_KY_NANG]-(n:NhanSu)
         RETURN s.ten as skill, count(n) as count
         ORDER BY count DESC
         LIMIT 10`,
      );
      const topSkills = skillResult.map((r: any) => r.skill).filter(Boolean);
      
      // Count all skills
      const skillCountResult = await this.neo4j.run(
        `MATCH (s:KyNang) RETURN count(s) as count`,
      );
      const totalSkills = (skillCountResult[0] as any)?.count?.toNumber?.() || 0;

      // Documents
      const docCountResult = await this.neo4j.run(
        `MATCH (t:TaiLieu) RETURN count(t) as count`,
      );
      const totalDocs = (docCountResult[0] as any)?.count?.toNumber?.() || 0;

      this.statsCache = {
        employees: { total: totalEmployees, byDepartment },
        departments: { total: deptNames.length, names: deptNames },
        projects: { total: totalProjects, byStatus },
        skills: { total: totalSkills, topSkills },
        documents: { total: totalDocs },
        lastUpdated: new Date(),
      };
      this.statsLastLoaded = new Date();

      this.logger.debug(`Stats loaded: ${totalEmployees} employees, ${deptNames.length} departments`);
    } catch (error) {
      this.logger.error(`Failed to load statistics: ${error}`);
    }
  }

  /**
   * Sanitize node data - chỉ giữ lại fields quan trọng
   */
  private sanitizeNodeData(label: string, node: Record<string, any>): Record<string, any> {
    const importantFields: Record<string, string[]> = {
      NhanSu: ['id', 'ten', 'email', 'so_dien_thoai'],
      PhongBan: ['id', 'ten', 'ma'],
      DuAn: ['id', 'ten', 'trang_thai', 'loai'],
      KyNang: ['id', 'ten', 'nhom'],
      TaiLieu: ['id', 'ten', 'loai'],
      ChucDanh: ['id', 'ten', 'cap_bac'],
      CongNghe: ['id', 'ten', 'loai'],
    };

    const fields = importantFields[label] || ['id', 'ten'];
    const sanitized: Record<string, any> = {};

    for (const field of fields) {
      if (node[field] !== undefined) {
        sanitized[field] = node[field];
      }
    }

    return sanitized;
  }

  /**
   * Build context string cho agent prompt (COMPACT version)
   */
  private buildContextString(): void {
    if (!this.schemaCache || !this.statsCache) {
      this.contextStringCache = '';
      return;
    }

    const lines: string[] = [];

    // Compact node types (one line each)
    lines.push('📊 DATABASE: Neo4j Knowledge Graph');
    lines.push('NODE TYPES: ' + this.schemaCache.nodeTypes
      .map(n => `${n.label}(${n.count})`)
      .join(', '));

    // Statistics  
    if (this.statsCache.departments.names.length > 0) {
      lines.push('PHÒNG BAN: ' + this.statsCache.departments.names.join(', '));
    }
    if (this.statsCache.skills.topSkills.length > 0) {
      lines.push('TOP KỸ NĂNG: ' + this.statsCache.skills.topSkills.slice(0, 5).join(', '));
    }

    this.contextStringCache = lines.join('\n');
    this.logger.debug(`Context string built: ${this.contextStringCache.length} chars`);
  }

  /**
   * Get context string cho agent prompt
   * Auto-refresh nếu cache expired
   */
  async getAgentContext(): Promise<string> {
    // Check if stats need refresh
    const now = new Date();
    
    if (!this.statsLastLoaded || 
        (now.getTime() - this.statsLastLoaded.getTime()) > this.STATS_TTL_MS) {
      await this.loadStatistics();
      this.buildContextString();
    }

    return this.contextStringCache || '';
  }

  /**
   * Get schema only (for debugging)
   */
  getSchema(): DatabaseSchema | null {
    return this.schemaCache;
  }

  /**
   * Get statistics only (for debugging)
   */
  getStatistics(): DatabaseStats | null {
    return this.statsCache;
  }

  /**
   * Force refresh all context
   */
  async forceRefresh(): Promise<void> {
    this.schemaCache = null;
    this.statsCache = null;
    this.contextStringCache = null;
    await this.loadFullContext();
  }
}
