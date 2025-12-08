import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class ChatQueryDto {
  @IsString()
  @IsNotEmpty()
  message: string;

  @IsOptional()
  @IsString()
  conversationId?: string;

  @IsOptional()
  @IsString()
  userId?: string;
}

export class ChatResponseDto {
  message: string;
  response: string;
  queryType: string;
  queryLevel: 'simple' | 'medium' | 'complex' | 'agent';
  processingTime: number; // in ms
  conversationId?: string;
  timestamp: Date;
  metadata?: {
    confidence?: number;
    reasoning?: string[];
    warnings?: string[];
    retrievedDataSources?: string[];
  };
  suggestedQuestions?: Array<{
    question: string;
    category: string;
  }>;
  // Graph visualization data from Neo4j queries
  graphData?: {
    nodes: Array<{
      id: string;
      label: string;
      type: string; // 'employee', 'department', 'skill', 'project', etc.
      val?: number;
    }>;
    links: Array<{
      source: string;
      target: string;
      relationship: string;
      value?: number;
    }>;
  };
}
