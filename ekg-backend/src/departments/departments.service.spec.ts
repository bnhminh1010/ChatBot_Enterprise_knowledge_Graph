import { Test, TestingModule } from '@nestjs/testing';
import { DepartmentsService } from './departments.service';
import { Neo4jService } from '../core/neo4j/neo4j.service';
import { neo4jMock } from '../../test/utils/mocks';

describe('DepartmentsService', () => {
  let service: DepartmentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DepartmentsService,
        { provide: Neo4jService, useValue: neo4jMock },
      ],
    }).compile();

    service = module.get<DepartmentsService>(DepartmentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
