import { Module } from '@nestjs/common';
import { GraphDataExtractor } from '../chat/services/graph-data-extractor.service';

/**
 * Shared module for graph utilities
 * Avoids circular dependencies
 */
@Module({
  providers: [GraphDataExtractor],
  exports: [GraphDataExtractor],
})
export class GraphModule {}
