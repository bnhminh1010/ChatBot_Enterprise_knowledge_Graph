import { IsString, IsOptional, IsEnum } from 'class-validator';

export class CreateConversationDto {
  @IsString()
  userId: string;

  @IsOptional()
  @IsString()
  title?: string;
}

export class AddMessageDto {
  @IsString()
  conversationId: string;

  @IsEnum(['user', 'assistant', 'system'])
  role: 'user' | 'assistant' | 'system';

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  queryType?: string;

  @IsOptional()
  @IsString()
  queryLevel?: 'simple' | 'medium' | 'complex';

  @IsOptional()
  processingTime?: number;
}

export class GetConversationHistoryDto {
  @IsString()
  conversationId: string;

  @IsOptional()
  limit?: number;
}
