import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
  PutBucketPolicyCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { extname } from 'path';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private s3: S3Client;
  private bucket: string;
  private endpoint: string;

  constructor(private readonly config: ConfigService) {
    this.endpoint = this.config.getOrThrow<string>('S3_ENDPOINT');
    this.bucket = this.config.getOrThrow<string>('S3_BUCKET');

    this.s3 = new S3Client({
      endpoint: this.endpoint,
      region: this.config.get<string>('S3_REGION') || 'us-east-1',
      credentials: {
        accessKeyId: this.config.getOrThrow<string>('S3_ACCESS_KEY'),
        secretAccessKey: this.config.getOrThrow<string>('S3_SECRET_KEY'),
      },
      forcePathStyle: true, // Required for MinIO
    });
  }

  async onModuleInit() {
    // Ensure bucket exists
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`Bucket "${this.bucket}" exists`);
    } catch {
      this.logger.log(`Creating bucket "${this.bucket}"...`);
      await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`Bucket "${this.bucket}" created`);
    }

    // Ensure public read policy for avatars
    try {
      const policy = JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          {
            Sid: 'PublicReadAvatars',
            Effect: 'Allow',
            Principal: '*',
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${this.bucket}/avatars/*`],
          },
        ],
      });
      await this.s3.send(
        new PutBucketPolicyCommand({ Bucket: this.bucket, Policy: policy }),
      );
      this.logger.log(`Public read policy configured for avatars`);
    } catch (err) {
      this.logger.warn(`Failed to set bucket policy: ${err}`);
    }
  }

  /**
   * Upload a file buffer to S3/MinIO.
   * Returns the object key and public URL.
   */
  async upload(
    file: Buffer,
    originalName: string,
    mimeType: string,
    folder = 'attachments',
  ): Promise<{ key: string; url: string }> {
    const ext = extname(originalName);
    const key = `${folder}/${randomUUID()}${ext}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file,
        ContentType: mimeType,
      }),
    );

    // Construct direct URL (MinIO path-style)
    const url = `${this.endpoint}/${this.bucket}/${key}`;

    this.logger.log(`Uploaded: ${key} (${mimeType}, ${file.length} bytes)`);

    return { key, url };
  }

  /**
   * Generate a pre-signed download URL (valid for 1 hour).
   * Sets ResponseContentDisposition to force browser download instead of tab navigation.
   */
  async getSignedUrl(key: string, fileName?: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ResponseContentDisposition: fileName
        ? `attachment; filename="${encodeURIComponent(fileName)}"`
        : undefined,
    });
    return getSignedUrl(this.s3, command, { expiresIn });
  }

  /**
   * Delete a file from S3/MinIO.
   */
  async delete(key: string): Promise<void> {
    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
    this.logger.log(`Deleted: ${key}`);
  }
}
