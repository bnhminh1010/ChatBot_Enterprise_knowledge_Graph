import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import { Neo4jService } from '../core/neo4j/neo4j.service';
import { GraphDataExtractor } from '../chat/services/graph-data-extractor.service';
import * as neo4j from 'neo4j-driver';

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    private neo: Neo4jService,
    private graphExtractor: GraphDataExtractor,
  ) {}

  async list() {
    try {
      const rows = await this.neo.run(
        `MATCH (p:DuAn)
         OPTIONAL MATCH (p)-[:SU_DUNG_CONG_NGHE]->(c:CongNghe)
         WITH p, collect(DISTINCT c.ten) AS techs
         RETURN {
           id: p.id,
           key: p.ma,
           name: p.ten,
           status: COALESCE(p.trang_thai, 'Active'),
           technologies: techs
         } AS prj
         ORDER BY p.ten`,
      );
      return rows.map((r) => r.prj);
    } catch (e) {
      throw new ServiceUnavailableException('Database connection error');
    }
  }

  async getFull(key: string) {
    try {
      const rows = await this.neo.run(
        `MATCH (p:DuAn {id:$key})
         OPTIONAL MATCH (p)-[:SU_DUNG_CONG_NGHE]->(tech:CongNghe)
         OPTIONAL MATCH (e:NhanSu)-[:LAM_DU_AN]->(p)
         OPTIONAL MATCH (pb:PhongBan)-[:CO_NHAN_SU]->(e)
         RETURN {
           id: p.id,
           key: p.ma,
           name: p.ten,
           status: COALESCE(p.trang_thai, 'Active'),
           technologies: collect(DISTINCT tech.ten),
           employees: collect(DISTINCT e{ id: e.id, empId: e.id, name: e.ho_ten, position: e.chucDanh }),
           departments: collect(DISTINCT pb{ id: pb.id, code: pb.ma, name: pb.ten })
         } AS full`,
        { key },
      );
      if (!rows[0]) throw new NotFoundException('Project not found');
      return rows[0].full;
    } catch (e) {
      if (e instanceof NotFoundException) throw e;
      throw new ServiceUnavailableException('Database connection error');
    }
  }

  async create(dto: { key: string; ten: string; trang_thai?: string }) {
    try {
      await this.neo.run(
        `MERGE (p:DuAn {ma:$key})
         ON CREATE SET p.ten=$ten, p.trang_thai=coalesce($trang_thai,'Active')`,
        { key: dto.key, ten: dto.ten, trang_thai: dto.trang_thai },
      );
      return { ok: true };
    } catch (e) {
      throw new ServiceUnavailableException('Database connection error');
    }
  }

  // TOOL: search_projects_by_client
  async searchByClient(client: string) {
    try {
      const rows = await this.neo.run(
        `MATCH (p:DuAn)
         WHERE toLower(p.khach_hang) CONTAINS toLower($client)
         RETURN {
           id: p.id,
           key: p.ma,
           name: p.ten,
           client: p.khach_hang,
           field: p.linh_vuc,
           type: p.loai,
           startDate: toString(p.start_date),
           status: p.trang_thai
         } AS prj
         ORDER BY p.ten`,
        { client },
      );
      return rows.map((r) => r.prj);
    } catch (e) {
      throw new ServiceUnavailableException('Database connection error');
    }
  }

  // TOOL: search_projects_by_field
  async searchByField(field: string) {
    try {
      const rows = await this.neo.run(
        `MATCH (p:DuAn)
         WHERE toLower(p.linh_vuc) CONTAINS toLower($field)
         RETURN {
           id: p.id,
           key: p.ma,
           name: p.ten,
           client: p.khach_hang,
           field: p.linh_vuc,
           type: p.loai,
           startDate: toString(p.start_date),
           status: p.trang_thai
         } AS prj
         ORDER BY p.ten`,
        { field },
      );
      return rows.map((r) => r.prj);
    } catch (e) {
      throw new ServiceUnavailableException('Database connection error');
    }
  }

  // TOOL: search_projects_by_type
  async searchByType(type: string) {
    try {
      const rows = await this.neo.run(
        `MATCH (p:DuAn)
         WHERE toLower(p.loai) CONTAINS toLower($type)
         RETURN {
           id: p.id,
           key: p.ma,
           name: p.ten,
           client: p.khach_hang,
           field: p.linh_vuc,
           type: p.loai,
           startDate: toString(p.start_date),
           status: p.trang_thai
         } AS prj
         ORDER BY p.ten`,
        { type },
      );
      return rows.map((r) => r.prj);
    } catch (e) {
      throw new ServiceUnavailableException('Database connection error');
    }
  }

  // TOOL: search_projects_by_code
  async searchByCode(code: string) {
    try {
      const rows = await this.neo.run(
        `MATCH (p:DuAn)
         WHERE toLower(p.ma) CONTAINS toLower($code)
         RETURN {
           id: p.id,
           key: p.ma,
           name: p.ten,
           client: p.khach_hang,
           field: p.linh_vuc,
           type: p.loai,
           startDate: toString(p.start_date),
           status: p.trang_thai
         } AS prj
         ORDER BY p.ten`,
        { code },
      );
      return rows.map((r) => r.prj);
    } catch (e) {
      throw new ServiceUnavailableException('Database connection error');
    }
  }

  // TOOL: search_projects_by_start_date
  async searchByStartDate(startDate: string) {
    try {
      const rows = await this.neo.run(
        `MATCH (p:DuAn)
         WHERE date(p.start_date) = date($startDate)
         RETURN {
           id: p.id,
           key: p.ma,
           name: p.ten,
           client: p.khach_hang,
           field: p.linh_vuc,
           type: p.loai,
           startDate: toString(p.start_date),
           status: p.trang_thai
         } AS prj
         ORDER BY p.ten`,
        { startDate },
      );
      return rows.map((r) => r.prj);
    } catch (e) {
      throw new ServiceUnavailableException('Database connection error');
    }
  }

  // TOOL: search_projects_by_status
  async searchByStatus(status: string) {
    try {
      const rows = await this.neo.run(
        `MATCH (p:DuAn)
         WHERE toLower(p.trang_thai) = toLower($status)
         RETURN {
           id: p.id,
           key: p.ma,
           name: p.ten,
           client: p.khach_hang,
           field: p.linh_vuc,
           type: p.loai,
           startDate: toString(p.start_date),
           status: p.trang_thai
         } AS prj
         ORDER BY p.ten`,
        { status },
      );
      return rows.map((r) => r.prj);
    } catch (e) {
      throw new ServiceUnavailableException('Database connection error');
    }
  }

  /**
   * TOOL: search_projects_by_name
   * Tìm dự án theo tên - hỗ trợ fuzzy matching cho natural language queries
   * NOW WITH GRAPH DATA for visualization!
   */
  async searchByName(name: string, skip = 0, limit = 20) {
    try {
      // Use runRaw to get actual Neo4j records for graph extraction
      const result = await this.neo.runRaw(
        `MATCH (p:DuAn)
         WHERE toLower(p.ten) CONTAINS toLower($name) OR toLower(p.ma) CONTAINS toLower($name)
         OPTIONAL MATCH (p)-[r1:SU_DUNG_CONG_NGHE]->(tech:CongNghe)
         OPTIONAL MATCH (e:NhanSu)-[r2:LAM_DU_AN]->(p)
         OPTIONAL MATCH (pb:PhongBan)-[r3:CO_NHAN_SU]-(e)
         RETURN p, tech, e, pb, r1, r2, r3
         ORDER BY p.ten
         SKIP $skip LIMIT $limit`,
        { name, skip: neo4j.int(skip), limit: neo4j.int(limit) },
      );

      const records = result.records;

      // DEBUG: Check what we got from Neo4j
      this.logger.debug(`Got ${records.length} records from Neo4j`);

      // Count non-null relationships
      let r1Count = 0,
        r2Count = 0,
        r3Count = 0;
      records.forEach((record) => {
        if (record.get('r1')) r1Count++;
        if (record.get('r2')) r2Count++;
        if (record.get('r3')) r3Count++;
      });

      this.logger.debug(
        `Relationships found: r1=${r1Count}, r2=${r2Count}, r3=${r3Count}`,
      );

      // Extract projects for response
      const projectsMap = new Map();

      records.forEach((record) => {
        const project = record.get('p');
        if (!project) return;

        const projectId = project.properties.id || project.properties.ma;

        if (!projectsMap.has(projectId)) {
          projectsMap.set(projectId, {
            id: project.properties.id,
            key: project.properties.ma,
            name: project.properties.ten,
            client: project.properties.khach_hang,
            field: project.properties.linh_vuc,
            type: project.properties.loai,
            startDate: project.properties.start_date?.toString(),
            status: project.properties.trang_thai,
            technologies: [],
            employees: [],
          });
        }

        const proj = projectsMap.get(projectId);

        // Add tech if exists
        const tech = record.get('tech');
        if (tech && tech.properties.ten) {
          if (!proj.technologies.includes(tech.properties.ten)) {
            proj.technologies.push(tech.properties.ten);
          }
        }

        // Add employee if exists
        const emp = record.get('e');
        if (emp) {
          const empId = emp.properties.id;
          if (!proj.employees.find((e: any) => e.id === empId)) {
            proj.employees.push({
              id: empId,
              name: emp.properties.ho_ten,
            });
          }
        }
      });

      const projects = Array.from(projectsMap.values());

      // Extract graph data for visualization
      let graphData: any = null;
      if (this.graphExtractor.shouldGenerateGraph(records)) {
        graphData = this.graphExtractor.extractGraphData(records);
        this.logger.debug(
          `Extracted graph: ${graphData.nodes.length} nodes, ${graphData.links.length} links`,
        );
      }

      return { projects, graphData };
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : 'Database connection error';
      this.logger.error('Search projects by name error:', errorMessage);
      throw new ServiceUnavailableException(errorMessage);
    }
  }

  // TOOL: get_project_by_id
  async getById(id: string) {
    try {
      const rows = await this.neo.run(
        `MATCH (p:DuAn {id: $id})
         OPTIONAL MATCH (p)-[:SU_DUNG_CONG_NGHE]->(tech:CongNghe)
         OPTIONAL MATCH (e:NhanSu)-[:LAM_DU_AN]->(p)
         RETURN {
           id: p.id,
           key: p.ma,
           name: p.ten,
           client: p.khach_hang,
           field: p.linh_vuc,
           type: p.loai,
           startDate: toString(p.start_date),
           status: p.trang_thai,
           technologies: collect(DISTINCT tech.ten),
           employees: collect(DISTINCT {id: e.id, name: e.ho_ten})
         } AS prj`,
        { id },
      );
      if (!rows[0]) throw new NotFoundException('Project not found');
      return rows[0].prj;
    } catch (e) {
      if (e instanceof NotFoundException) throw e;
      throw new ServiceUnavailableException('Database connection error');
    }
  }

  /**
   * TOOL: count_projects
   */
  async count(): Promise<number> {
    try {
      const rows = await this.neo.run(
        `MATCH (p:DuAn)
         RETURN count(p) AS total`,
      );
      return rows[0]?.total?.toNumber() || 0;
    } catch (e) {
      throw new ServiceUnavailableException('Database connection error');
    }
  }

  /**
   * TOOL: get_project_manager
   */
  async getProjectManager(projectName: string) {
    try {
      const rows = await this.neo.run(
        `MATCH (p:DuAn)<-[:QUAN_LY]-(e:NhanSu)
         WHERE toLower(p.ten) CONTAINS toLower($projectName) OR toLower(p.ma) CONTAINS toLower($projectName)
         RETURN {
           id: e.id,
           empId: e.id,
           name: e.ho_ten,
           position: e.chucDanh,
           email: e.email_cong_ty,
           project: p.ten
         } AS manager
         LIMIT 1`,
        { projectName },
      );
      if (!rows[0]) return null;
      return rows[0].manager;
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : 'Database connection error';
      throw new ServiceUnavailableException(errorMessage);
    }
  }
}
