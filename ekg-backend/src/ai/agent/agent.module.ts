import { Module } from '@nestjs/common';
import { AgentPlannerService } from './agent-planner.service';
import { AgentExecutorService } from './agent-executor.service';
import { AgentMemoryService } from './agent-memory.service';
import { GeminiService } from '../gemini.service';
import { GeminiToolsService } from '../gemini-tools.service';

/**
 * Agent Module
 * Module riêng cho Agent system components
 * 
 * NOTE: AgentModule được import vào AiModule, không phải standalone
 * Do đó GeminiService và GeminiTools Service phải được provide từ parent module
 */
@Module({
  providers: [
    AgentPlannerService,
    AgentExecutorService,
    AgentMemoryService,
  ],
  exports: [
    AgentPlannerService,
    AgentExecutorService,
    AgentMemoryService,
  ],
})
export class AgentModule {}
