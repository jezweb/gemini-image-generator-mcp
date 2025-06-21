import { UTApi } from 'uploadthing/server';
import type { StorageProvider, StorageResult } from './types.js';

export class UploadThingStorage implements StorageProvider {
  private utapi: UTApi;

  constructor(token: string) {
    this.utapi = new UTApi({ token });
  }

  async upload(buffer: Buffer, fileName: string, mimeType: string): Promise<StorageResult> {
    try {
      // Create a File object from the buffer
      const blob = new Blob([buffer], { type: mimeType });
      const file = new File([blob], fileName, { type: mimeType });
      
      // Upload to UploadThing
      const response = await this.utapi.uploadFiles(file);
      
      if (response.error) {
        throw new Error(`UploadThing error: ${response.error.message}`);
      }

      // Use the new ufsUrl instead of deprecated url
      return {
        url: response.data.ufsUrl || response.data.url,
        key: response.data.key
      };
    } catch (error) {
      console.error('UploadThing upload error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to upload to UploadThing: ${errorMessage}`);
    }
  }
}