/**
 * @fileoverview AWS Module - S3 Integration
 * @module aws/aws.module
 * 
 * Module cung cấp AWS S3 service cho document storage.
 * Sử dụng cho việc upload và download files từ S3.
 * 
 * @author APTX3107 Team
 */
import { Module } from '@nestjs/common';
import { S3Service } from './s3.service';

/**
 * Module quản lý AWS services (hiện tại chỉ có S3).
 */
@Module({
  providers: [S3Service],
  exports: [S3Service],
})
export class AwsModule {}
