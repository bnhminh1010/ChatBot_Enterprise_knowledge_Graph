import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { DocumentReaderService } from './document-reader.service';
import { Neo4jModule } from '../core/neo4j/neo4j.module';

@Module({
  imports: [Neo4jModule],
  providers: [DocumentsService, DocumentReaderService],
  controllers: [DocumentsController],
  exports: [DocumentsService, DocumentReaderService],
})
export class DocumentsModule {}
