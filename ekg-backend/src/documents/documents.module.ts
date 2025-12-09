/**
 * @fileoverview Documents Module - Document Entity Management
 * @module documents/documents.module
 *
 * Module quản lý Document entity.
 * Bao gồm upload, download, và đọc nội dung documents.
 *
 * Components:
 * - DocumentsService: CRUD operations
 * - DocumentReaderService: Đọc và parse nội dung files
 *
 * @author APTX3107 Team
 */
import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { DocumentReaderService } from './document-reader.service';
import { Neo4jModule } from '../core/neo4j/neo4j.module';
import { AwsModule } from '../aws/aws.module';

@Module({
  imports: [Neo4jModule, AwsModule],
  providers: [DocumentsService, DocumentReaderService],
  controllers: [DocumentsController],
  exports: [DocumentsService, DocumentReaderService],
})
export class DocumentsModule {}
