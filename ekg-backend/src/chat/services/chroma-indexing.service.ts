import { Injectable, Logger } from '@nestjs/common';
import { ChromaDBService } from '../../ai/chroma-db.service';
import { EmployeesService } from '../../employees/employees.service';
import { DepartmentsService } from '../../departments/departments.service';
import { ProjectsService } from '../../projects/projects.service';
import { SkillsService } from '../../skills/skills.service';
import { DocumentsService } from '../../documents/documents.service';

/**
 * ChromaDB Indexing Service
 * Index Neo4j data to ChromaDB for vector search
 */
@Injectable()
export class ChromaIndexingService {
  private readonly logger = new Logger(ChromaIndexingService.name);

  constructor(
    private readonly chromaDBService: ChromaDBService,
    private readonly employeesService: EmployeesService,
    private readonly departmentsService: DepartmentsService,
    private readonly projectsService: ProjectsService,
    private readonly skillsService: SkillsService,
    private readonly documentsService: DocumentsService,
  ) {}

  /**
   * Index all entities to ChromaDB
   */
  async indexAll(): Promise<{
    success: boolean;
    message: string;
    details: any;
  }> {
    this.logger.log('🔄 Starting ChromaDB indexing...');

    const details: {
      indexed: Record<string, number>;
      errors: Array<{ entity: string; error: string }>;
    } = {
      indexed: {},
      errors: [],
    };

    // 1. Index Employees
    try {
      this.logger.log('📝 Indexing employees...');
      const employees = await this.employeesService.list(0, 1000);

      if (employees.length > 0) {
        const docs = employees.map((emp: any) => ({
          id: emp.id || emp.empId,
          content: `${emp.name || 'Unknown'} - ${emp.position || ''} (${emp.level || 'N/A'}). Department: ${emp.department || 'N/A'}. Email: ${emp.email || ''}, Phone: ${emp.phone || ''}`,
          metadata: {
            type: 'employee',
            id: emp.id || emp.empId,
            name: emp.name || '',
            position: emp.position || '',
            level: emp.level || '',
            department: emp.department || '',
          },
        }));

        await this.chromaDBService.addDocuments('employees', docs);
        details.indexed['employees'] = docs.length;
        this.logger.log(`✅ Indexed ${docs.length} employees`);
      }
    } catch (error) {
      this.logger.error(`❌ Failed to index employees: ${error.message}`);
      details.errors.push({ entity: 'employees', error: error.message });
    }

    // 2. Index Departments
    try {
      this.logger.log('📝 Indexing departments...');
      const departments = await this.departmentsService.list();

      if (departments.length > 0) {
        const docs = departments.map((dept: any) => ({
          id: dept.id || dept.code,
          content: `${dept.name || 'Unknown'} - Code: ${dept.code || 'N/A'}. Description: ${dept.description || 'No description'}`,
          metadata: {
            type: 'department',
            id: dept.id || dept.code,
            name: dept.name || '',
            code: dept.code || '',
            description: dept.description || '',
          },
        }));

        await this.chromaDBService.addDocuments('departments', docs);
        details.indexed['departments'] = docs.length;
        this.logger.log(`✅ Indexed ${docs.length} departments`);
      }
    } catch (error) {
      this.logger.error(`❌ Failed to index departments: ${error.message}`);
      details.errors.push({ entity: 'departments', error: error.message });
    }

    // 3. Index Projects
    try {
      this.logger.log('📝 Indexing projects...');
      const projects = await this.projectsService.list();

      if (projects.length > 0) {
        const docs = projects.map((proj: any) => ({
          id: proj.id || proj.key,
          content: `${proj.name || 'Unknown'} - Key: ${proj.key || 'N/A'}. Status: ${proj.status || 'Active'}. Technologies: ${(proj.technologies || []).join(', ')}`,
          metadata: {
            type: 'project',
            id: proj.id || proj.key,
            name: proj.name || '',
            key: proj.key || '',
            status: proj.status || '',
            technologies: proj.technologies || [],
          },
        }));

        await this.chromaDBService.addDocuments('projects', docs);
        details.indexed['projects'] = docs.length;
        this.logger.log(`✅ Indexed ${docs.length} projects`);
      }
    } catch (error) {
      this.logger.error(`❌ Failed to index projects: ${error.message}`);
      details.errors.push({ entity: 'projects', error: error.message });
    }

    // 4. Index Skills
    try {
      this.logger.log('📝 Indexing skills...');
      const skills = await this.skillsService.list();

      if (skills.length > 0) {
        const docs = skills.map((skill: any) => ({
          id: skill.id || skill.name,
          content: `${skill.name || 'Unknown'} - Category: ${skill.category || 'General'}`,
          metadata: {
            type: 'skill',
            id: skill.id || skill.name,
            name: skill.name || '',
            category: skill.category || '',
          },
        }));

        await this.chromaDBService.addDocuments('skills', docs);
        details.indexed['skills'] = docs.length;
        this.logger.log(`✅ Indexed ${docs.length} skills`);
      }
    } catch (error) {
      this.logger.error(`❌ Failed to index skills: ${error.message}`);
      details.errors.push({ entity: 'skills', error: error.message });
    }

    // 5. Index Documents
    try {
      this.logger.log('📝 Indexing documents...');

      // Get all projects first, then get documents for each
      const projects = await this.projectsService.list();
      let allDocuments: any[] = [];

      for (const project of projects) {
        try {
          const result: any =
            await this.documentsService.getProjectDocuments(
              project.id || project.key,
            );

          // Extract documents array from result object
          const projectDocs = result?.documents || [];

          if (
            projectDocs &&
            Array.isArray(projectDocs) &&
            projectDocs.length > 0
          ) {
            // Map documents with project info
            const mappedDocs = projectDocs.map((doc: any) => ({
              ...doc,
              projectName: project.name,
              projectKey: project.key || project.id,
            }));
            allDocuments = allDocuments.concat(mappedDocs);
          }
        } catch (err) {
          this.logger.warn(
            `Could not get documents for project ${project.name}: ${err.message}`,
          );
        }
      }

      if (allDocuments.length > 0) {
        const docs = allDocuments.map((doc: any) => ({
          id: doc.id,
          content: `${doc.name || doc.ten || 'Untitled'} - ${doc.description || doc.mo_ta || 'No description'}. File type: ${doc.type || doc.loai_file || 'N/A'}. Project: ${doc.projectName || 'N/A'}`,
          metadata: {
            type: 'document',
            id: doc.id,
            name: doc.name || doc.ten || '',
            duong_dan: doc.path || doc.duong_dan || '', // ← QUAN TRỌNG cho download!
            loai_file: doc.type || doc.loai_file || '',
            mo_ta: doc.description || doc.mo_ta || '',
            projectId: doc.projectId || doc.projectKey || '',
            projectName: doc.projectName || '',
          },
        }));

        await this.chromaDBService.addDocuments('documents', docs);
        details.indexed['documents'] = docs.length;
        this.logger.log(`✅ Indexed ${docs.length} documents`);
      }
    } catch (error) {
      this.logger.error(`❌ Failed to index documents: ${error.message}`);
      details.errors.push({ entity: 'documents', error: error.message });
    }

    // Summary
    const totalIndexed = Object.values(details.indexed).reduce(
      (sum: number, count: any) => sum + count,
      0,
    );

    this.logger.log(
      `✅ Indexing completed: ${totalIndexed} total documents indexed`,
    );

    return {
      success: totalIndexed > 0,
      message:
        totalIndexed > 0
          ? `Successfully indexed ${totalIndexed} documents`
          : 'No documents indexed',
      details,
    };
  }
}
