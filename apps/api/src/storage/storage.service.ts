import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class ObjectStorageService {
  private readonly bucket = process.env.S3_BUCKET ?? 'dosje-media';
  private readonly region = process.env.S3_REGION ?? 'us-east-1';
  private readonly internalClient: S3Client;
  private readonly signingClient: S3Client;
  private bucketReady?: Promise<void>;

  constructor() {
    if (process.env.NODE_ENV === 'production' && !process.env.S3_BUCKET) {
      throw new Error('S3_BUCKET must be configured in production.');
    }
    const credentials = process.env.S3_ACCESS_KEY && process.env.S3_SECRET_KEY
      ? { accessKeyId: process.env.S3_ACCESS_KEY, secretAccessKey: process.env.S3_SECRET_KEY }
      : undefined;
    const endpoint = process.env.S3_ENDPOINT;
    const publicEndpoint = process.env.S3_PUBLIC_ENDPOINT ?? endpoint;

    this.internalClient = new S3Client({
      region: this.region,
      endpoint,
      forcePathStyle: Boolean(endpoint),
      credentials,
    });
    this.signingClient = publicEndpoint === endpoint
      ? this.internalClient
      : new S3Client({
          region: this.region,
          endpoint: publicEndpoint,
          forcePathStyle: Boolean(publicEndpoint),
          credentials,
        });
  }

  async createPresignedUploadUrl(fileName: string, contentType: string, folder = 'inspections') {
    await this.ensureBucket();
    const safeFolder = folder.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 80) || 'inspections';
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '-').slice(-160) || 'upload.bin';
    const s3Key = `${safeFolder}/${randomUUID()}-${safeName}`;
    const uploadUrl = await getSignedUrl(
      this.signingClient,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: s3Key,
        ContentType: contentType,
      }),
      { expiresIn: 300 },
    );

    return { uploadUrl, s3Key, expiresInSeconds: 300, contentType };
  }

  async upload(key: string, content: Buffer, contentType: string): Promise<void> {
    await this.ensureBucket();
    await this.internalClient.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: content,
        ContentLength: content.byteLength,
        ContentType: contentType,
      }),
    );
  }

  private ensureBucket(): Promise<void> {
    this.bucketReady ??= this.internalClient
      .send(new HeadBucketCommand({ Bucket: this.bucket }))
      .then(() => undefined)
      .catch(async (error: unknown) => {
        if (typeof error !== 'object' || error === null) throw error;
        const name = 'name' in error && typeof error.name === 'string' ? error.name : '';
        const metadata =
          '$metadata' in error && typeof error.$metadata === 'object' && error.$metadata !== null
            ? error.$metadata
            : null;
        const statusCode =
          metadata && 'httpStatusCode' in metadata && typeof metadata.httpStatusCode === 'number'
            ? metadata.httpStatusCode
            : undefined;
        const missing = statusCode === 404 || name === 'NotFound' || name === 'NoSuchBucket';
        if (!missing) throw error;
        if (process.env.NODE_ENV === 'production') {
          throw new ServiceUnavailableException('The configured production S3 bucket does not exist.');
        }
        await this.internalClient.send(new CreateBucketCommand({ Bucket: this.bucket }));
      });

    return this.bucketReady;
  }
}
