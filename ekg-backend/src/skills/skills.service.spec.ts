import { Test, TestingModule } from '@nestjs/testing';
import { SkillsService } from './skills.service';
import { Neo4jService } from '../core/neo4j/neo4j.service';
import { neo4jMock } from '../../test/utils/mocks';

describe('SkillsService', () => {
  let service: SkillsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SkillsService, { provide: Neo4jService, useValue: neo4jMock }],
    }).compile();

    service = module.get<SkillsService>(SkillsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
