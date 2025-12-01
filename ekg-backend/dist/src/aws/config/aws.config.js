"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.awsConfig = void 0;
exports.awsConfig = {
    region: process.env.AWS_REGION || 'ap-southeast-2',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
    s3: {
        bucket: process.env.AWS_S3_BUCKET || 'ekg-documents',
        signedUrlExpiration: parseInt(process.env.AWS_S3_SIGNED_URL_EXPIRATION || '3600'),
        multipartThreshold: parseInt(process.env.AWS_S3_MULTIPART_THRESHOLD || '52428800'),
        multipartChunkSize: parseInt(process.env.AWS_S3_MULTIPART_CHUNK_SIZE || '10485760'),
        uploadMaxRetries: parseInt(process.env.AWS_S3_UPLOAD_MAX_RETRIES || '3'),
    },
};
//# sourceMappingURL=aws.config.js.map