export interface AwsConfig {
    region: string;
    credentials: {
        accessKeyId: string;
        secretAccessKey: string;
    };
    s3: {
        bucket: string;
        signedUrlExpiration: number;
        multipartThreshold: number;
        multipartChunkSize: number;
        uploadMaxRetries: number;
    };
}
export declare const awsConfig: AwsConfig;
