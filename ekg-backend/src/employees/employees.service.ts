// src/employees/employees.service.ts
import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import neo4j from 'neo4j-driver';
import { Neo4jService } from '../core/neo4j/neo4j.service';

@Injectable()
export class EmployeesService {
  private readonly logger = new Logger(EmployeesService.name);

  constructor(private neo: Neo4jService) {}

  async list(skip = 0, limit = 20) {
    try {
      const rows = await this.neo.run(
        `MATCH (e:NhanSu)
         OPTIONAL MATCH (e)-[r:CO_KY_NANG]->(k:KyNang)
         WITH e, collect({name:k.ten, level:r.level}) AS skills
         RETURN {
           id: e.id,
           empId: e.id,
           name: e.ho_ten,
           position: e.chucDanh,
           skills: skills
         } AS emp
         ORDER BY e.ho_ten
         SKIP $skip LIMIT $limit`,
        { skip: neo4j.int(skip), limit: neo4j.int(limit) },
      );
      return rows.map((r) => r.emp);
    } catch (e) {
      if (e instanceof NotFoundException) throw e;
      const errorMessage =
        e instanceof Error ? e.message : 'Database connection error';
      this.logger.error('Employees list error:', errorMessage);
      throw new ServiceUnavailableException(errorMessage);
    }
  }

  async findByName(name: string, skip = 0, limit = 0) {
    try {
      const cypherQuery = `MATCH (e:NhanSu)
         WHERE toLower(e.ho_ten) CONTAINS toLower($name)
         OPTIONAL MATCH (e)-[r:CO_KY_NANG]->(k:KyNang)
         OPTIONAL MATCH (pb:PhongBan)-[:CO_NHAN_SU]-(e)
         WITH e, pb, collect({name:k.ten, level:r.level}) AS skills
         RETURN {
           id: e.id,
           empId: e.id,
           name: e.ho_ten,
           position: e.chucDanh,
           department: COALESCE(pb.ten, 'N/A'),
           skills: skills
         } AS emp
         ORDER BY e.ho_ten
         SKIP $skip ${limit > 0 ? 'LIMIT $limit' : ''}`;

      const rows = await this.neo.run(cypherQuery, {
        name,
        skip: neo4j.int(skip),
        ...(limit > 0 && { limit: neo4j.int(limit) }),
      });
      return rows.map((r) => r.emp);
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : 'Database connection error';
      this.logger.error('Find employees by name error:', errorMessage);
      throw new ServiceUnavailableException(errorMessage);
    }
  }

  async get(empId: string) {
    try {
      const rows = await this.neo.run(
        `MATCH (e:NhanSu {id:$empId})
         OPTIONAL MATCH (pb:PhongBan)-[:CO_NHAN_SU]-(e)
         OPTIONAL MATCH (e)-[r:CO_KY_NANG]->(k:KyNang)
         OPTIONAL MATCH (e)-[:LAM_DU_AN]->(p:DuAn)
         WITH e, pb, 
              collect({name:k.ten, level:r.level}) AS skills,
              collect(DISTINCT p) AS projects
         RETURN {
           id: e.id,
           empId: e.id,
           name: e.ho_ten,
           position: e.chucDanh,
           department: pb.ten,
           skills: skills,
           projects: [proj IN projects | {key: proj.key, name: proj.ten}]
         } AS emp`,
        { empId },
      );
      if (!rows[0]) throw new NotFoundException('Employee not found');
      return rows[0].emp;
    } catch (e) {
      if (e instanceof NotFoundException) throw e;
      const errorMessage =
        e instanceof Error ? e.message : 'Database connection error';
      this.logger.error('Get employee error:', errorMessage);
      throw new ServiceUnavailableException(errorMessage);
    }
  }

  async create(dto: {
    empId: string;
    ten: string;
    chucDanh?: string;
    phongBanCode: string;
  }) {
    try {
      await this.neo.run(
        `MATCH (pb:PhongBan {code:$phongBanCode})
         MERGE (e:NhanSu {empId:$empId})
         ON CREATE SET e.ten=$ten, e.chucDanh=$chucDanh
         MERGE (pb)-[:CO_NHAN_SU]->(e)`,
        dto,
      );
      return { ok: true };
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : 'Database connection error';
      this.logger.error('Create employee error:', errorMessage);
      throw new ServiceUnavailableException(errorMessage);
    }
  }

  async topSkills(limit = 10) {
    try {
      const rows = await this.neo.run(
        `MATCH (:NhanSu)-[r:CO_KY_NANG]->(k:KyNang)
         RETURN k.ten AS skill, count(r) AS freq
         ORDER BY freq DESC
         LIMIT $limit`,
        { limit: neo4j.int(limit) },
      );
      return rows;
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : 'Database connection error';
      this.logger.error('Top skills error:', errorMessage);
      throw new ServiceUnavailableException(errorMessage);
    }
  }

  /**
   * NEW: Find employees by department (using undirected relationship)
   */
  async findByDepartment(deptName: string, skip = 0, limit = 50) {
    try {
      const rows = await this.neo.run(
        `MATCH (pb:PhongBan)-[:CO_NHAN_SU]-(e:NhanSu)
         WHERE toLower(pb.ten) CONTAINS toLower($deptName) OR toLower(pb.code) CONTAINS toLower($deptName)
         OPTIONAL MATCH (e)-[r:CO_KY_NANG]->(k:KyNang)
         WITH e, pb, collect({name:k.ten, level:r.level}) AS skills
         RETURN {
           id: e.empId,
           empId: e.empId,
           name: e.ten,
           position: e.chucDanh,
           department: pb.ten,
           skills: skills
         } AS emp
         ORDER BY e.ten
         SKIP $skip LIMIT $limit`,
        { deptName, skip: neo4j.int(skip), limit: neo4j.int(limit) },
      );
      return rows.map((r) => r.emp);
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : 'Database connection error';
      this.logger.error('Find employees by department error:', errorMessage);
      throw new ServiceUnavailableException(errorMessage);
    }
  }

  /**
   * NEW: Find employees by skill
   */
  async findBySkill(skillName: string, skip = 0, limit = 50) {
    try {
      const rows = await this.neo.run(
        `MATCH (e:NhanSu)-[r:CO_KY_NANG]->(k:KyNang)
         WHERE toLower(k.ten) CONTAINS toLower($skillName)
         OPTIONAL MATCH (pb:PhongBan)-[:CO_NHAN_SU]-(e)
         WITH e, pb, collect({name:k.ten, level:r.level}) AS skills
         RETURN {
           id: e.empId,
           empId: e.empId,
           name: e.ten,
           position: e.chucDanh,
           department: COALESCE(pb.ten, 'N/A'),
           skills: skills
         } AS emp
         ORDER BY e.ten
         SKIP $skip LIMIT $limit`,
        { skillName, skip: neo4j.int(skip), limit: neo4j.int(limit) },
      );
      return rows.map((r) => r.emp);
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : 'Database connection error';
      this.logger.error('Find employees by skill error:', errorMessage);
      throw new ServiceUnavailableException(errorMessage);
    }
  }

  /**
   * NEW: Find employees by position
   */
  async findByPosition(position: string, skip = 0, limit = 50) {
    try {
      const rows = await this.neo.run(
        `MATCH (e:NhanSu)
         WHERE toLower(e.chucDanh) CONTAINS toLower($position)
         OPTIONAL MATCH (pb:PhongBan)-[:CO_NHAN_SU]-(e)
         OPTIONAL MATCH (e)-[r:CO_KY_NANG]->(k:KyNang)
         WITH e, pb, collect({name:k.ten, level:r.level}) AS skills
         RETURN {
           id: e.empId,
           empId: e.empId,
           name: e.ten,
           position: e.chucDanh,
           department: COALESCE(pb.ten, 'N/A'),
           skills: skills
         } AS emp
         ORDER BY e.ten
         SKIP $skip LIMIT $limit`,
        { position, skip: neo4j.int(skip), limit: neo4j.int(limit) },
      );
      return rows.map((r) => r.emp);
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : 'Database connection error';
      this.logger.error('Find employees by position error:', errorMessage);
      throw new ServiceUnavailableException(errorMessage);
    }
  }

  /**
   * NEW: Find employees by project
   */
  async findByProject(projectKey: string, skip = 0, limit = 50) {
    try {
      const rows = await this.neo.run(
        `MATCH (e:NhanSu)-[:LAM_DU_AN]->(p:DuAn)
         WHERE toLower(p.key) CONTAINS toLower($projectKey) OR toLower(p.ten) CONTAINS toLower($projectKey)
         OPTIONAL MATCH (pb:PhongBan)-[:CO_NHAN_SU]-(e)
         OPTIONAL MATCH (e)-[r:CO_KY_NANG]->(k:KyNang)
         WITH e, pb, p, collect({name:k.ten, level:r.level}) AS skills
         RETURN {
           id: e.empId,
           empId: e.empId,
           name: e.ten,
           position: e.chucDanh,
           department: COALESCE(pb.ten, 'N/A'),
           project: p.ten,
           skills: skills
         } AS emp
         ORDER BY e.ten
         SKIP $skip LIMIT $limit`,
        { projectKey, skip: neo4j.int(skip), limit: neo4j.int(limit) },
      );
      return rows.map((r) => r.emp);
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : 'Database connection error';
      this.logger.error('Find employees by project error:', errorMessage);
      throw new ServiceUnavailableException(errorMessage);
    }
  }

  /**
   * TOOL: search_employees_by_level
   */
  async searchByLevel(level: string, skip = 0, limit = 20) {
    try {
      const rows = await this.neo.run(
        `MATCH (e:NhanSu)
         WHERE toLower(e.cap_bac_hien_tai) = toLower($level)
         OPTIONAL MATCH (e)-[r:CO_KY_NANG]->(k:KyNang)
         OPTIONAL MATCH (pb:PhongBan)-[:CO_NHAN_SU]-(e)
         WITH e, pb, collect({name:k.ten, level:r.level}) AS skills
         RETURN {
           id: e.id,
           empId: e.id,
           name: e.ho_ten,
           level: e.cap_bac_hien_tai,
           email: e.email_cong_ty,
           phone: e.so_dien_thoai,
           department: COALESCE(pb.ten, 'N/A'),
           status: e.trang_thai_lam_viec,
           skills: skills
         } AS emp
         ORDER BY e.ho_ten
         SKIP $skip LIMIT $limit`,
        { level, skip: neo4j.int(skip), limit: neo4j.int(limit) },
      );
      return rows.map((r) => r.emp);
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : 'Database connection error';
      this.logger.error('Search employees by level error:', errorMessage);
      throw new ServiceUnavailableException(errorMessage);
    }
  }

  /**
   * TOOL: search_employees_by_email
   */
  async searchByEmail(email: string, skip = 0, limit = 20) {
    try {
      const rows = await this.neo.run(
        `MATCH (e:NhanSu)
         WHERE toLower(e.email_cong_ty) CONTAINS toLower($email)
         OPTIONAL MATCH (e)-[r:CO_KY_NANG]->(k:KyNang)
         OPTIONAL MATCH (pb:PhongBan)-[:CO_NHAN_SU]-(e)
         WITH e, pb, collect({name:k.ten, level:r.level}) AS skills
         RETURN {
           id: e.id,
           empId: e.id,
           name: e.ho_ten,
           level: e.cap_bac_hien_tai,
           email: e.email_cong_ty,
           phone: e.so_dien_thoai,
           department: COALESCE(pb.ten, 'N/A'),
           status: e.trang_thai_lam_viec,
           skills: skills
         } AS emp
         ORDER BY e.ho_ten
         SKIP $skip LIMIT $limit`,
        { email, skip: neo4j.int(skip), limit: neo4j.int(limit) },
      );
      return rows.map((r) => r.emp);
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : 'Database connection error';
      this.logger.error('Search employees by email error:', errorMessage);
      throw new ServiceUnavailableException(errorMessage);
    }
  }

  /**
   * TOOL: search_employees_by_phone
   */
  async searchByPhone(phone: string, skip = 0, limit = 20) {
    try {
      const rows = await this.neo.run(
        `MATCH (e:NhanSu)
         WHERE e.so_dien_thoai CONTAINS $phone
         OPTIONAL MATCH (e)-[r:CO_KY_NANG]->(k:KyNang)
         OPTIONAL MATCH (pb:PhongBan)-[:CO_NHAN_SU]-(e)
         WITH e, pb, collect({name:k.ten, level:r.level}) AS skills
         RETURN {
           id: e.id,
           empId: e.id,
           name: e.ho_ten,
           level: e.cap_bac_hien_tai,
           email: e.email_cong_ty,
           phone: e.so_dien_thoai,
           department: COALESCE(pb.ten, 'N/A'),
           status: e.trang_thai_lam_viec,
           skills: skills
         } AS emp
         ORDER BY e.ho_ten
         SKIP $skip LIMIT $limit`,
        { phone, skip: neo4j.int(skip), limit: neo4j.int(limit) },
      );
      return rows.map((r) => r.emp);
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : 'Database connection error';
      this.logger.error('Search employees by phone error:', errorMessage);
      throw new ServiceUnavailableException(errorMessage);
    }
  }

  /**
   * TOOL: search_employees_by_birth_date
   */
  async searchByBirthDate(birthDate: string, skip = 0, limit = 20) {
    try {
      const rows = await this.neo.run(
        `MATCH (e:NhanSu)
         WHERE date(e.ngay_sinh) = date($birthDate)
         OPTIONAL MATCH (e)-[r:CO_KY_NANG]->(k:KyNang)
         OPTIONAL MATCH (pb:PhongBan)-[:CO_NHAN_SU]-(e)
         WITH e, pb, collect({name:k.ten, level:r.level}) AS skills
         RETURN {
           id: e.id,
           empId: e.id,
           name: e.ho_ten,
           level: e.cap_bac_hien_tai,
           email: e.email_cong_ty,
           phone: e.so_dien_thoai,
           birthDate: toString(e.ngay_sinh),
           department: COALESCE(pb.ten, 'N/A'),
           status: e.trang_thai_lam_viec,
           skills: skills
         } AS emp
         ORDER BY e.ho_ten
         SKIP $skip LIMIT $limit`,
        { birthDate, skip: neo4j.int(skip), limit: neo4j.int(limit) },
      );
      return rows.map((r) => r.emp);
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : 'Database connection error';
      this.logger.error('Search employees by birth date error:', errorMessage);
      throw new ServiceUnavailableException(errorMessage);
    }
  }

  /**
   * TOOL: search_employees_by_join_date
   */
  async searchByJoinDate(joinDate: string, skip = 0, limit = 20) {
    try {
      const rows = await this.neo.run(
        `MATCH (e:NhanSu)
         WHERE date(e.ngay_vao_cong_ty) = date($joinDate)
         OPTIONAL MATCH (e)-[r:CO_KY_NANG]->(k:KyNang)
         OPTIONAL MATCH (pb:PhongBan)-[:CO_NHAN_SU]-(e)
         WITH e, pb, collect({name:k.ten, level:r.level}) AS skills
         RETURN {
           id: e.id,
           empId: e.id,
           name: e.ho_ten,
           level: e.cap_bac_hien_tai,
           email: e.email_cong_ty,
           joinDate: toString(e.ngay_vao_cong_ty),
           department: COALESCE(pb.ten, 'N/A'),
           status: e.trang_thai_lam_viec,
           skills: skills
         } AS emp
         ORDER BY e.ho_ten
         SKIP $skip LIMIT $limit`,
        { joinDate, skip: neo4j.int(skip), limit: neo4j.int(limit) },
      );
      return rows.map((r) => r.emp);
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : 'Database connection error';
      this.logger.error('Search employees by join date error:', errorMessage);
      throw new ServiceUnavailableException(errorMessage);
    }
  }

  /**
   * TOOL: search_employees_by_status
   */
  async searchByStatus(status: string, skip = 0, limit = 20) {
    try {
      const rows = await this.neo.run(
        `MATCH (e:NhanSu)
         WHERE toLower(e.trang_thai_lam_viec) = toLower($status)
         OPTIONAL MATCH (e)-[r:CO_KY_NANG]->(k:KyNang)
         OPTIONAL MATCH (pb:PhongBan)-[:CO_NHAN_SU]-(e)
         WITH e, pb, collect({name:k.ten, level:r.level}) AS skills
         RETURN {
           id: e.id,
           empId: e.id,
           name: e.ho_ten,
           level: e.cap_bac_hien_tai,
           email: e.email_cong_ty,
           phone: e.so_dien_thoai,
           department: COALESCE(pb.ten, 'N/A'),
           status: e.trang_thai_lam_viec,
           skills: skills
         } AS emp
         ORDER BY e.ho_ten
         SKIP $skip LIMIT $limit`,
        { status, skip: neo4j.int(skip), limit: neo4j.int(limit) },
      );
      return rows.map((r) => r.emp);
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : 'Database connection error';
      this.logger.error('Search employees by status error:', errorMessage);
      throw new ServiceUnavailableException(errorMessage);
    }
  }

  /**
   * TOOL: search_employees_advanced (Multi-criteria search)
   */
  async findByCriteria(
    criteria: {
      department?: string;
      position?: string;
      skill?: string;
      level?: string;
      project?: string;
    },
    skip = 0,
    limit = 20,
  ) {
    try {
      let query = 'MATCH (e:NhanSu)';
      const params: any = { skip: neo4j.int(skip), limit: neo4j.int(limit) };
      const whereClauses: string[] = [];

      // 1. Department
      if (criteria.department) {
        query += ' MATCH (pb:PhongBan)-[:CO_NHAN_SU]-(e)';
        whereClauses.push(
          '(toLower(pb.ten) CONTAINS toLower($department) OR toLower(pb.code) CONTAINS toLower($department))',
        );
        params.department = criteria.department;
      } else {
        query += ' OPTIONAL MATCH (pb:PhongBan)-[:CO_NHAN_SU]-(e)';
      }

      // 2. Project
      if (criteria.project) {
        query += ' MATCH (e)-[:LAM_DU_AN]->(p:DuAn)';
        whereClauses.push(
          '(toLower(p.ten) CONTAINS toLower($project) OR toLower(p.ma) CONTAINS toLower($project))',
        );
        params.project = criteria.project;
      }

      // 3. Skill
      if (criteria.skill) {
        query += ' MATCH (e)-[r:CO_KY_NANG]->(k:KyNang)';
        whereClauses.push('toLower(k.ten) CONTAINS toLower($skill)');
        params.skill = criteria.skill;
      } else {
        query += ' OPTIONAL MATCH (e)-[r:CO_KY_NANG]->(k:KyNang)';
      }

      // 4. Position
      if (criteria.position) {
        whereClauses.push(
          'toLower(e.chucDanh) CONTAINS toLower($position)',
        );
        params.position = criteria.position;
      }

      // 5. Level
      if (criteria.level) {
        whereClauses.push(
          'toLower(e.cap_bac_hien_tai) CONTAINS toLower($level)',
        );
        params.level = criteria.level;
      }

      if (whereClauses.length > 0) {
        query += ' WHERE ' + whereClauses.join(' AND ');
      }

      query += `
         WITH e, pb, collect(DISTINCT {name:k.ten, level:r.level}) AS skills
         RETURN {
           id: e.id,
           empId: e.id,
           name: e.ho_ten,
           level: e.cap_bac_hien_tai,
           position: e.chucDanh,
           email: e.email_cong_ty,
           phone: e.so_dien_thoai,
           department: COALESCE(pb.ten, 'N/A'),
           status: e.trang_thai_lam_viec,
           skills: skills
         } AS emp
         ORDER BY e.ho_ten
         SKIP $skip LIMIT $limit`;

      const rows = await this.neo.run(query, params);
      return rows.map((r) => r.emp);
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : 'Database connection error';
      this.logger.error('Find employees by criteria error:', errorMessage);
      throw new ServiceUnavailableException(errorMessage);
    }
  }

  /**
   * TOOL: count_employees
   */
  async count(): Promise<number> {
    try {
      const rows = await this.neo.run(
        `MATCH (e:NhanSu)
         RETURN count(e) AS total`,
      );
      return rows[0]?.total?.toNumber() || 0;
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : 'Database connection error';
      this.logger.error('Count employees error:', errorMessage);
      throw new ServiceUnavailableException(errorMessage);
    }
  }

  /**
   * TOOL: get_employee_by_id
   */
  async getById(id: string) {
    try {
      const rows = await this.neo.run(
        `MATCH (e:NhanSu {id: $id})
         OPTIONAL MATCH (e)-[r:CO_KY_NANG]->(k:KyNang)
         OPTIONAL MATCH (pb:PhongBan)-[:CO_NHAN_SU]-(e)
         OPTIONAL MATCH (e)-[:LAM_DU_AN]->(p:DuAn)
         WITH e, pb, 
              collect(DISTINCT {name:k.ten, level:r.level}) AS skills,
              collect(DISTINCT {id: p.id, name: p.ten, key: p.ma}) AS projects
         RETURN {
           id: e.id,
           empId: e.id,
           name: e.ho_ten,
           level: e.cap_bac_hien_tai,
           email: e.email_cong_ty,
           phone: e.so_dien_thoai,
           birthDate: toString(e.ngay_sinh),
           joinDate: toString(e.ngay_vao_cong_ty),
           status: e.trang_thai_lam_viec,
           department: COALESCE(pb.ten, 'N/A'),
           skills: skills,
           projects: projects
         } AS emp`,
        { id },
      );
      if (!rows[0]) throw new NotFoundException('Employee not found');
      return rows[0].emp;
    } catch (e) {
      if (e instanceof NotFoundException) throw e;
      const errorMessage =
        e instanceof Error ? e.message : 'Database connection error';
      this.logger.error('Get employee by ID error:', errorMessage);
      throw new ServiceUnavailableException(errorMessage);
    }
  }
}
