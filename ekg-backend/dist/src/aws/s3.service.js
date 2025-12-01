"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var S3Service_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3Service = void 0;
const common_1 = require("@nestjs/common");
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const lib_storage_1 = require("@aws-sdk/lib-storage");
const aws_config_1 = require("./config/aws.config");
let S3Service = S3Service_1 = class S3Service {
    logger = new common_1.Logger(S3Service_1.name);
    s3Client;
    bucket;
    constructor() {
        this.s3Client = new client_s3_1.S3Client({
            region: aws_config_1.awsConfig.region,
            credentials: aws_config_1.awsConfig.credentials,
        });
        this.bucket = aws_config_1.awsConfig.s3.bucket;
        this.logger.log(`S3Service initialized - Region: ${aws_config_1.awsConfig.region}, Bucket: ${this.bucket}`);
    }
    async uploadFile(fileBuffer, key, contentType) {
        try {
            const fileSize = fileBuffer.length;
            this.logger.log(`Uploading file to S3: ${key} (${(fileSize / 1024 / 1024).toFixed(2)}MB)`);
            if (fileSize >= aws_config_1.awsConfig.s3.multipartThreshold) {
                return await this.uploadMultipart(fileBuffer, key, contentType);
            }
            else {
                return await this.uploadSimple(fileBuffer, key, contentType);
            }
        }
        catch (error) {
            this.logger.error(`Failed to upload file to S3: ${error}`);
            throw new common_1.InternalServerErrorException(`S3 upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async uploadSimple(fileBuffer, key, contentType) {
        const params = {
            Bucket: this.bucket,
            Key: key,
            Body: fileBuffer,
            ContentType: contentType,
            ServerSideEncryption: 'AES256',
        };
        const command = new client_s3_1.PutObjectCommand(params);
        const response = await this.s3Client.send(command);
        this.logger.log(`Simple upload completed: ${key}`);
        return {
            key,
            bucket: this.bucket,
            location: `https://${this.bucket}.s3.${aws_config_1.awsConfig.region}.amazonaws.com/${key}`,
            etag: response.ETag,
        };
    }
    async uploadMultipart(fileBuffer, key, contentType) {
        this.logger.log(`Using multi-part upload for: ${key}`);
        const upload = new lib_storage_1.Upload({
            client: this.s3Client,
            params: {
                Bucket: this.bucket,
                Key: key,
                Body: fileBuffer,
                ContentType: contentType,
                ServerSideEncryption: 'AES256',
            },
            queueSize: 4,
            partSize: aws_config_1.awsConfig.s3.multipartChunkSize,
            leavePartsOnError: false,
        });
        upload.on('httpUploadProgress', (progress) => {
            const percent = progress.loaded && progress.total
                ? ((progress.loaded / progress.total) * 100).toFixed(2)
                : '0';
            this.logger.debug(`Upload progress: ${percent}%`);
        });
        let retryCount = 0;
        const maxRetries = aws_config_1.awsConfig.s3.uploadMaxRetries;
        while (retryCount <= maxRetries) {
            try {
                const result = await upload.done();
                this.logger.log(`Multi-part upload completed: ${key}`);
                return {
                    key,
                    bucket: this.bucket,
                    location: result.Location ||
                        `https://${this.bucket}.s3.${aws_config_1.awsConfig.region}.amazonaws.com/${key}`,
                    etag: result.ETag,
                };
            }
            catch (error) {
                retryCount++;
                if (retryCount > maxRetries) {
                    this.logger.error(`Multi-part upload failed after ${maxRetries} retries`);
                    throw error;
                }
                const delayMs = Math.pow(2, retryCount - 1) * 1000;
                this.logger.warn(`Upload failed, retry ${retryCount}/${maxRetries} in ${delayMs}ms...`);
                await this.delay(delayMs);
            }
        }
        throw new Error('Upload failed after all retries');
    }
    async getSignedUrl(key, expiresIn) {
        try {
            const expiration = expiresIn || aws_config_1.awsConfig.s3.signedUrlExpiration;
            const command = new client_s3_1.GetObjectCommand({
                Bucket: this.bucket,
                Key: key,
            });
            const url = await (0, s3_request_presigner_1.getSignedUrl)(this.s3Client, command, {
                expiresIn: expiration,
            });
            this.logger.debug(`Generated signed URL for: ${key} (expires in ${expiration}s)`);
            return url;
        }
        catch (error) {
            this.logger.error(`Failed to generate signed URL: ${error}`);
            throw new common_1.InternalServerErrorException('Failed to generate download URL');
        }
    }
    async getObject(key) {
        try {
            const command = new client_s3_1.GetObjectCommand({
                Bucket: this.bucket,
                Key: key,
            });
            const response = await this.s3Client.send(command);
            const stream = response.Body;
            const chunks = [];
            for await (const chunk of stream) {
                chunks.push(chunk);
            }
            const buffer = Buffer.concat(chunks);
            this.logger.debug(`Downloaded object from S3: ${key} (${buffer.length} bytes)`);
            return buffer;
        }
        catch (error) {
            this.logger.error(`Failed to get object from S3: ${error}`);
            throw new common_1.InternalServerErrorException('Failed to download file from S3');
        }
    }
    async deleteFile(key) {
        try {
            const command = new client_s3_1.DeleteObjectCommand({
                Bucket: this.bucket,
                Key: key,
            });
            await this.s3Client.send(command);
            this.logger.log(`Deleted file from S3: ${key}`);
        }
        catch (error) {
            this.logger.error(`Failed to delete file from S3: ${error}`);
            throw new common_1.InternalServerErrorException('Failed to delete file from S3');
        }
    }
    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
};
exports.S3Service = S3Service;
exports.S3Service = S3Service = S3Service_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], S3Service);
//# sourceMappingURL=s3.service.js.map