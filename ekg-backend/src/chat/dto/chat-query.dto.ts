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
  queryLevel: 'simple' | 'medium' | 'complex';
  processingTime: number; // in ms
  conversationId?: string;
  timestamp: Date;
}
