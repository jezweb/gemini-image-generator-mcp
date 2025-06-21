export interface StorageProvider {
  upload(buffer: Buffer, fileName: string, mimeType: string): Promise<StorageResult>;
}

export interface StorageResult {
  url: string;
  key: string;
}

export interface StorageConfig {
  provider: 'uploadthing' | 's3' | 'none';
  uploadthing?: {
    token: string;
  };
  s3?: {
    endpoint: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucket: string;
    region: string;
  };
}