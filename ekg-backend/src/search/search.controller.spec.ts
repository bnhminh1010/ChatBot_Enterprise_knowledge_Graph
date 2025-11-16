import { Test, TestingModule } from '@nestjs/testing';
import { SearchController } from './search.controller';
import { Neo4jService } from '../core/neo4j/neo4j.service';
import { neo4jMock } from '../../test/utils/mocks';

describe('SearchController', () => {
  let controller: SearchController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SearchController],
      providers: [{ provide: Neo4jService, useValue: neo4jMock }],
    }).compile();

    controller = module.get<SearchController>(SearchController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
