import { Test, TestingModule } from '@nestjs/testing';
import { GeminiQueryClassifierService } from './gemini-query-classifier.service';
import { GeminiService } from './gemini.service';

describe('GeminiQueryClassifierService', () => {
  let service: GeminiQueryClassifierService;
  let geminiService: GeminiService;

  const mockGeminiService = {
    classifyQuery: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeminiQueryClassifierService,
        {
          provide: GeminiService,
          useValue: mockGeminiService,
        },
      ],
    }).compile();

    service = module.get<GeminiQueryClassifierService>(GeminiQueryClassifierService);
    geminiService = module.get<GeminiService>(GeminiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should classify a simple query correctly', async () => {
    const mockResponse = JSON.stringify({
      level: 'simple',
      type: 'list-employees',
      normalizedQuery: 'Danh sách nhân viên',
      extractedEntities: {},
      confidence: 0.95,
      reasoning: 'User wants to list employees',
    });

    mockGeminiService.classifyQuery.mockResolvedValue(mockResponse);

    const result = await service.classifyQueryWithGemini('Cho tôi xem danh sách nhân viên');

    expect(result.level).toBe('simple');
    expect(result.type).toBe('list-employees');
    expect(result.normalizedQuery).toBe('Danh sách nhân viên');
    expect(geminiService.classifyQuery).toHaveBeenCalled();
  });

  it('should classify a medium query with entities correctly', async () => {
    const mockResponse = JSON.stringify({
      level: 'medium',
      type: 'filter-search',
      normalizedQuery: 'Tìm nhân viên phòng Frontend',
      extractedEntities: {
        department: 'Frontend',
      },
      confidence: 0.9,
      reasoning: 'User wants to filter employees by department',
    });

    mockGeminiService.classifyQuery.mockResolvedValue(mockResponse);

    const result = await service.classifyQueryWithGemini('Ai làm ở phòng Frontend?');

    expect(result.level).toBe('medium');
    expect(result.type).toBe('filter-search');
    expect(result.extractedEntities.department).toBe('Frontend');
  });

  it('should handle complex queries', async () => {
    const mockResponse = JSON.stringify({
      level: 'complex',
      type: 'analysis',
      normalizedQuery: 'Phân tích kỹ năng team Backend',
      extractedEntities: {
        department: 'Backend',
      },
      confidence: 0.85,
      reasoning: 'Requires analysis of skills',
    });

    mockGeminiService.classifyQuery.mockResolvedValue(mockResponse);

    const result = await service.classifyQueryWithGemini('Phân tích kỹ năng của team Backend giúp tôi');

    expect(result.level).toBe('complex');
    expect(result.type).toBe('analysis');
  });

  it('should classify group queries correctly', async () => {
    const mockResponse = JSON.stringify({
      level: 'simple',
      type: 'list-groups',
      normalizedQuery: 'Danh sách nhóm',
      extractedEntities: {},
      confidence: 0.95,
      reasoning: 'User wants to list groups',
    });

    mockGeminiService.classifyQuery.mockResolvedValue(mockResponse);

    const result = await service.classifyQueryWithGemini('Có bao nhiêu nhóm');

    expect(result.level).toBe('simple');
    expect(result.type).toBe('list-groups');
  });

  it('should extract group entity correctly', async () => {
    const mockResponse = JSON.stringify({
      level: 'medium',
      type: 'filter-search',
      normalizedQuery: 'Tìm nhân viên thuộc nhóm AI',
      extractedEntities: {
        group: 'AI',
      },
      confidence: 0.9,
      reasoning: 'User wants to filter by group',
    });

    mockGeminiService.classifyQuery.mockResolvedValue(mockResponse);

    const result = await service.classifyQueryWithGemini('Ai ở nhóm AI?');

    expect(result.extractedEntities.group).toBe('AI');
  });

  it('should extract ID correctly', async () => {
    const mockResponse = JSON.stringify({
      level: 'simple',
      type: 'get-by-id',
      normalizedQuery: 'Tìm nhân viên có mã NS021',
      extractedEntities: {
        id: 'NS021',
      },
      confidence: 0.95,
      reasoning: 'User wants to find by ID',
    });

    mockGeminiService.classifyQuery.mockResolvedValue(mockResponse);

    const result = await service.classifyQueryWithGemini('Tên của nhân viên có id là NS021 là gì?');

    expect(result.extractedEntities.id).toBe('NS021');
    expect(result.type).toBe('get-by-id');
  });

  it('should handle invalid JSON response from Gemini', async () => {
    mockGeminiService.classifyQuery.mockResolvedValue('Invalid JSON');

    await expect(service.classifyQueryWithGemini('test')).rejects.toThrow();
  });
});
