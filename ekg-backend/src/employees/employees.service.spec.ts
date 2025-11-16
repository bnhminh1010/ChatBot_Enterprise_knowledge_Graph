import { Test, TestingModule } from '@nestjs/testing';
import { EmployeesService } from './employees.service';
import { Neo4jService } from '../core/neo4j/neo4j.service';
import { neo4jMock } from '../../test/utils/mocks';

describe('EmployeesService', () => {
  let service: EmployeesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeesService,
        { provide: Neo4jService, useValue: neo4jMock },
      ],
    }).compile();

    service = module.get<EmployeesService>(EmployeesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
