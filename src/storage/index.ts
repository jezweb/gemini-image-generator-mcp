import type { StorageProvider, StorageConfig } from './types.js';
import { UploadThingStorage } from './uploadthing.js';

export function createStorageProvider(config: StorageConfig): StorageProvider | null {
  switch (config.provider) {
    case 'uploadthing':
      if (!config.uploadthing?.token) {
        throw new Error('UploadThing token is required');
      }
      return new UploadThingStorage(config.uploadthing.token);
    
    case 's3':
      // S3 implementation would go here
      throw new Error('S3 storage provider not yet implemented');
    
    case 'none':
    default:
      return null;
  }
}

export * from './types.js';