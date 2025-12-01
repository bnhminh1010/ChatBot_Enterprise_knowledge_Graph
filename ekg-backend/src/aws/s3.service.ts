import {
  Injectable,
  Logger,
  InternalServerErrorException,
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

export interface UploadResult {
  key: string;
  bucket: string;
  location: string;
  etag?: string;
}

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
   * Upload file to S3 with auto multi-part support
   * - Files < 50MB: Simple PUT
   * - Files >= 50MB: Multi-part upload with retry logic
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

      // Decide upload strategy based on file size
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
   * Simple upload for small files (< 50MB)
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
      ServerSideEncryption: 'AES256', // SSE-S3
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
   * Multi-part upload for large files (>= 50MB)
   * with retry logic and exponential backoff
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
        ServerSideEncryption: 'AES256', // SSE-S3
      },
      queueSize: 4, // Concurrent uploads
      partSize: awsConfig.s3.multipartChunkSize, // 10MB chunks
      leavePartsOnError: false,
    });

    // Track progress
    upload.on('httpUploadProgress', (progress) => {
      const percent =
        progress.loaded && progress.total
          ? ((progress.loaded / progress.total) * 100).toFixed(2)
          : '0';
      this.logger.debug(`Upload progress: ${percent}%`);
    });

    // Execute upload with retry logic
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

        // Exponential backoff: 1s, 2s, 4s
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
   * Get pre-signed URL for downloading file
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
   * Get object from S3 as Buffer
   */
  async getObject(key: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);

      // Convert stream to buffer
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
    } catch (error) {
      this.logger.error(`Failed to get object from S3: ${error}`);
      throw new InternalServerErrorException('Failed to download file from S3');
    }
  }

  /**
   * Delete object from S3
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
   * Helper: Delay for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
