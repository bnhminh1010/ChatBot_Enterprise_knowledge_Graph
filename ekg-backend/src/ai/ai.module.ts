import { Module } from '@nestjs/common';
import { QueryClassifierService } from './query-classifier.service';
import { OllamaService } from './ollama.service';
import { ChromaDBService } from './chroma-db.service';
import { GeminiService } from './gemini.service';
import { OllamaInitService } from './ollama-init.service';

@Module({
  providers: [
    QueryClassifierService,
    OllamaService,
    ChromaDBService,
    GeminiService,
    OllamaInitService, // Auto-init Ollama on startup
  ],
  exports: [
    QueryClassifierService,
    OllamaService,
    ChromaDBService,
    GeminiService,
  ],
})
export class AiModule {}
