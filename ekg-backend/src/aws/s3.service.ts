/**
 * @fileoverview S3 Service - AWS S3 Storage Operations
 * @module aws/s3.service
 * 
 * Service xử lý upload/download files với AWS S3.
 * Hỗ trợ multi-part upload cho files lớn với retry logic.
 * 
 * Features:
 * - Simple upload cho files < 50MB
 * - Multi-part upload cho files >= 50MB
 * - Pre-signed URLs cho secure downloads
 * - Server-side encryption (SSE-S3)
 * - Retry logic với exponential backoff
 * 
 * @author APTX3107 Team
 */
import {
  Injectable,
  Logger,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  PutObjectCommandInput,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Upload } from '@aws-sdk/lib-storage';
import { awsConfig } from './config/aws.config';
import { Readable } from 'stream';

/**
 * Kết quả upload file.
 */
export interface UploadResult {
  key: string;
  bucket: string;
  location: string;
  etag?: string;
}

/**
 * Service quản lý operations với AWS S3.
 * 
 * @example
 * const result = await s3Service.uploadFile(buffer, 'path/to/file.pdf', 'application/pdf');
 * const url = await s3Service.getSignedUrl(result.key);
 */
@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;

  constructor() {
    this.s3Client = new S3Client({
      region: awsConfig.region,
      credentials: awsConfig.credentials,
    });
    this.bucket = awsConfig.s3.bucket;

    this.logger.log(
      `S3Service initialized - Region: ${awsConfig.region}, Bucket: ${this.bucket}`,
    );
  }

  /**
   * Upload file lên S3 với auto multi-part support.
   * - Files < 50MB: Simple PUT
   * - Files >= 50MB: Multi-part upload với retry logic
   * 
   * @param fileBuffer - Buffer chứa nội dung file
   * @param key - S3 key (path) cho file
   * @param contentType - MIME type của file
   * @returns Upload result với key, bucket, location
   * @throws InternalServerErrorException nếu upload thất bại
   */
  async uploadFile(
    fileBuffer: Buffer,
    key: string,
    contentType?: string,
  ): Promise<UploadResult> {
    try {
      const fileSize = fileBuffer.length;
      this.logger.log(
        `Uploading file to S3: ${key} (${(fileSize / 1024 / 1024).toFixed(2)}MB)`,
      );

      if (fileSize >= awsConfig.s3.multipartThreshold) {
        return await this.uploadMultipart(fileBuffer, key, contentType);
      } else {
        return await this.uploadSimple(fileBuffer, key, contentType);
      }
    } catch (error) {
      this.logger.error(`Failed to upload file to S3: ${error}`);
      throw new InternalServerErrorException(
        `S3 upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Simple upload cho small files (< 50MB).
   */
  private async uploadSimple(
    fileBuffer: Buffer,
    key: string,
    contentType?: string,
  ): Promise<UploadResult> {
    const params: PutObjectCommandInput = {
      Bucket: this.bucket,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
      ServerSideEncryption: 'AES256',
    };

    const command = new PutObjectCommand(params);
    const response = await this.s3Client.send(command);

    this.logger.log(`Simple upload completed: ${key}`);

    return {
      key,
      bucket: this.bucket,
      location: `https://${this.bucket}.s3.${awsConfig.region}.amazonaws.com/${key}`,
      etag: response.ETag,
    };
  }

  /**
   * Multi-part upload cho large files (>= 50MB).
   * Với retry logic và exponential backoff.
   */
  private async uploadMultipart(
    fileBuffer: Buffer,
    key: string,
    contentType?: string,
  ): Promise<UploadResult> {
    this.logger.log(`Using multi-part upload for: ${key}`);

    const upload = new Upload({
      client: this.s3Client,
      params: {
        Bucket: this.bucket,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType,
        ServerSideEncryption: 'AES256',
      },
      queueSize: 4,
      partSize: awsConfig.s3.multipartChunkSize,
      leavePartsOnError: false,
    });

    upload.on('httpUploadProgress', (progress) => {
      const percent =
        progress.loaded && progress.total
          ? ((progress.loaded / progress.total) * 100).toFixed(2)
          : '0';
      this.logger.debug(`Upload progress: ${percent}%`);
    });

    let retryCount = 0;
    const maxRetries = awsConfig.s3.uploadMaxRetries;

    while (retryCount <= maxRetries) {
      try {
        const result = await upload.done();

        this.logger.log(`Multi-part upload completed: ${key}`);

        return {
          key,
          bucket: this.bucket,
          location:
            result.Location ||
            `https://${this.bucket}.s3.${awsConfig.region}.amazonaws.com/${key}`,
          etag: result.ETag,
        };
      } catch (error) {
        retryCount++;

        if (retryCount > maxRetries) {
          this.logger.error(
            `Multi-part upload failed after ${maxRetries} retries`,
          );
          throw error;
        }

        const delayMs = Math.pow(2, retryCount - 1) * 1000;
        this.logger.warn(
          `Upload failed, retry ${retryCount}/${maxRetries} in ${delayMs}ms...`,
        );
        await this.delay(delayMs);
      }
    }

    throw new Error('Upload failed after all retries');
  }

  /**
   * Tạo pre-signed URL để download file.
   * 
   * @param key - S3 key của file
   * @param expiresIn - Thời gian hết hạn (seconds), mặc định theo config
   * @returns Pre-signed URL
   */
  async getSignedUrl(key: string, expiresIn?: number): Promise<string> {
    try {
      const expiration = expiresIn || awsConfig.s3.signedUrlExpiration;

      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const url = await getSignedUrl(this.s3Client, command, {
        expiresIn: expiration,
      });

      this.logger.debug(
        `Generated signed URL for: ${key} (expires in ${expiration}s)`,
      );

      return url;
    } catch (error) {
      this.logger.error(`Failed to generate signed URL: ${error}`);
      throw new InternalServerErrorException('Failed to generate download URL');
    }
  }

  /**
   * Download object từ S3 dạng Buffer.
   * 
   * @param key - S3 key của file
   * @returns Buffer chứa nội dung file
   * @throws NotFoundException nếu file không tồn tại
   */
  async getObject(key: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);

      const stream = response.Body as Readable;
      const chunks: Uint8Array[] = [];

      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      const buffer = Buffer.concat(chunks);

      this.logger.debug(
        `Downloaded object from S3: ${key} (${buffer.length} bytes)`,
      );

      return buffer;
    } catch (error: any) {
      if (error?.name === 'NoSuchKey' || error?.Code === 'NoSuchKey') {
        this.logger.warn(`S3 object not found: ${key}`);
        throw new NotFoundException(
          `File không tồn tại trong S3: ${key}. File có thể đã bị xóa hoặc chưa được upload.`,
        );
      }
      this.logger.error(`Failed to get object from S3: ${error}`);
      throw new InternalServerErrorException('Failed to download file from S3');
    }
  }

  /**
   * Xóa file từ S3.
   * 
   * @param key - S3 key của file
   */
  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);

      this.logger.log(`Deleted file from S3: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete file from S3: ${error}`);
      throw new InternalServerErrorException('Failed to delete file from S3');
    }
  }

  /**
   * Helper: Delay cho retry logic.
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
