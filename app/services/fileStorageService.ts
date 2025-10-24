// Note: This service is from the original Next.js app and uses metafields
// In Remix, we store files locally instead of in Shopify

import { ApiResponse } from '../../types/shopify';

export interface StoredFile {
  key: string;
  fileName: string;
  mimeType: string;
  size: number;
  url: string;
  createdAt: string;
  expiresAt?: string;
  metadata?: Record<string, any>;
}

export interface FileStoreOptions {
  fileName?: string;
  expiresInDays?: number;
  metadata?: Record<string, any>;
  description?: string;
}

export class FileStorageService {
  private readonly NAMESPACE = 'order_printer_files';

  constructor(session: { shop: string; accessToken: string }) {
    // Note: Metafield approach disabled in favor of local file storage
  }

  async storeFile(fileBuffer: Buffer, options: FileStoreOptions = {}): Promise<ApiResponse<StoredFile>> {
    return {
      success: false,
      error: 'Method not implemented - files are now stored locally via fileStorageService'
    };
  }

  async getFile(fileKey: string): Promise<ApiResponse<StoredFile>> {
    return {
      success: false,
      error: 'Method not implemented - files are now stored locally'
    };
  }

  async deleteFile(fileKey: string): Promise<ApiResponse<void>> {
    return {
      success: false,
      error: 'Method not implemented - files are now stored locally'
    };
  }

  async listFiles(limit: number = 50): Promise<ApiResponse<StoredFile[]>> {
    return {
      success: false,
      error: 'Method not implemented - files are now stored locally'
    };
  }

  async cleanupExpiredFiles(): Promise<ApiResponse<{ deletedCount: number }>> {
    return {
      success: false,
      error: 'Method not implemented - files are now stored locally'
    };
  }

  private async getShopGid(): Promise<string> {
    return 'gid://shopify/Shop/0';
  }
}
