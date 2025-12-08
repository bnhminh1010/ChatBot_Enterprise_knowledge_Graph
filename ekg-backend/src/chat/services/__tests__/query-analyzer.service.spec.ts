import { Test, TestingModule } from '@nestjs/testing';
import { QueryAnalyzerService } from '../query-analyzer.service';
import { GeminiService } from '../../../ai/gemini.service';
import { IntentType, EntityType } from '../../../core/interfaces/query-analysis.interface';

describe('QueryAnalyzerService', () => {
  let service: QueryAnalyzerService;
  let geminiService: jest.Mocked<GeminiService>;

  beforeEach(async () => {
    const mockGeminiService = {
      generateResponse: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueryAnalyzerService,
        {
          provide: GeminiService,
          useValue: mockGeminiService,
        },
      ],
    }).compile();

    service = module.get<QueryAnalyzerService>(QueryAnalyzerService);
    geminiService = module.get(GeminiService);
  });

  describe('Quick Analysis (Pattern Matching)', () => {
    it('should detect greetings without calling Gemini', async () => {
      const result = await service.analyzeQuery('xin chào');

      expect(result.mainIntent.type).toBe(IntentType.GREETING);
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.metadata?.geminiUsed).toBe(false);
      expect(geminiService.generateResponse).not.toHaveBeenCalled();
    });

    it('should detect count intent quickly', async () => {
      const result = await service.analyzeQuery('có bao nhiêu nhân viên?');

      expect(result.mainIntent.type).toBe(IntentType.COUNT);
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.metadata?.geminiUsed).toBe(false);
    });

    it('should detect list intent quickly', async () => {
      const result = await service.analyzeQuery('danh sách tất cả dự án');

      expect(result.mainIntent.type).toBe(IntentType.LIST);
      expect(result.metadata?.geminiUsed).toBe(false);
    });

    it('should detect search intent with entities', async () => {
      const result = await service.analyzeQuery('tìm nhân viên biết React');

      expect(result.mainIntent.type).toBe(IntentType.SEARCH);
      expect(result.entities.length).toBeGreaterThan(0);
      expect(result.entities.some(e => e.type === EntityType.SKILL && e.value === 'react')).toBe(true);
    });
  });

  describe('Deep Analysis (Gemini)', () => {
    it('should use Gemini for complex queries', async () => {
      const mockGeminiResponse = JSON.stringify({
        intents: [
          {
            type: 'count',
            confidence: 0.95,
            entities: [
              { type: 'skill', value: 'React', normalizedValue: 'React', confidence: 0.9 },
              { type: 'department', value: 'frontend', normalizedValue: 'Frontend', confidence: 0.9 }
            ],
            requiredTools: ['search_employees_advanced'],
            priority: 1
          }
        ],
        entities: [
          { type: 'skill', value: 'React', normalizedValue: 'React', confidence: 0.9 },
          { type: 'department', value: 'frontend', normalizedValue: 'Frontend', confidence: 0.9 }
        ],
        suggestedTools: ['search_employees_advanced', 'count_employees'],
        needsContext: false,
        confidence: 0.95
      });

      geminiService.generateResponse.mockResolvedValue(mockGeminiResponse);

      const result = await service.analyzeQuery(
        'Có bao nhiêu nhân viên biết React ở phòng Frontend?'
      );

      expect(geminiService.generateResponse).toHaveBeenCalled();
      expect(result.mainIntent.type).toBe(IntentType.COUNT);
      expect(result.entities.length).toBe(2);
      expect(result.complexity.level).toBe('medium');
      expect(result.metadata?.geminiUsed).toBe(true);
    });

    it('should detect multi-intent queries', async () => {
      const mockGeminiResponse = JSON.stringify({
        intents: [
          {
            type: 'search',
            confidence: 0.9,
            entities: [{ type: 'skill', value: 'Python', normalizedValue: 'Python', confidence: 0.95 }],
            priority: 1
          },
          {
            type: 'compare',
            confidence: 0.85,
            entities: [],
            priority: 2
          }
        ],
        entities: [
          { type: 'skill', value: 'Python', normalizedValue: 'Python', confidence: 0.95 }
        ],
        suggestedTools: ['search_employees_advanced'],
        needsContext: false,
        confidence: 0.88
      });

      geminiService.generateResponse.mockResolvedValue(mockGeminiResponse);

      const result = await service.analyzeQuery(
        'Tìm nhân viên biết Python và so sánh với những người biết Java'
      );

      expect(result.intents.length).toBe(2);
      expect(result.complexity.factors.multiIntent).toBe(true);
      expect(result.complexity.level).toBe('complex');
    });
  });

  describe('Entity Extraction', () => {
    it('should extract department entities', async () => {
      const result = await service.analyzeQuery('nhân viên phòng Backend');

      expect(result.entities.some(e => 
        e.type === EntityType.DEPARTMENT && e.value === 'backend'
      )).toBe(true);
    });

    it('should extract skill entities', async () => {
      const result = await service.analyzeQuery('ai biết Python?');

      expect(result.entities.some(e => 
        e.type === EntityType.SKILL && e.value === 'python'
      )).toBe(true);
    });
  });

  describe('Complexity Assessment', () => {
    it('should mark simple queries as simple', async () => {
      const result = await service.analyzeQuery('danh sách nhân viên');

      expect(result.complexity.level).toBe('simple');
      expect(result.complexity.score).toBeLessThan(30);
    });

    it('should mark multi-intent queries as complex', async () => {
      // Mock complex query
      geminiService.generateResponse.mockResolvedValue(JSON.stringify({
        intents: [
          { type: 'count', confidence: 0.9, entities: [], priority: 1 },
          { type: 'compare', confidence: 0.85, entities: [], priority: 2 }
        ],
        entities: [
          { type: 'skill', value: 'React', normalizedValue: 'React', confidence: 0.9 },
          { type: 'skill', value: 'Python', normalizedValue: 'Python', confidence: 0.9 }
        ],
        suggestedTools: [],
        needsContext: false,
        confidence: 0.85
      }));

      const result = await service.analyzeQuery('complex query');

      expect(result.complexity.level).toBe('complex');
      expect(result.complexity.factors.multiIntent).toBe(true);
    });
  });

  describe('Fallback Handling', () => {
    it('should fallback gracefully on Gemini errors', async () => {
      geminiService.generateResponse.mockRejectedValue(new Error('API Error'));

      const result = await service.analyzeQuery('some failing query');

      expect(result.mainIntent.type).toBe(IntentType.SEARCH);
      expect(result.confidence).toBe(0.5);
      expect(result.metadata?.fallbackUsed).toBe(true);
    });
  });

  describe('Query Normalization', () => {
    it('should normalize Vietnamese queries', async () => {
      const result = await service.analyzeQuery('  Có   BAO  NHIÊU   nhân viên?  ');

      expect(result.normalizedQuery).toBe('có bao nhiêu nhân viên?');
    });
  });
});
