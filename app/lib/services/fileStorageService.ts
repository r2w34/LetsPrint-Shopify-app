// File storage service - Local filesystem implementation
import { Session } from '@shopify/shopify-api';
import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';

export interface StoredFile {
  fileKey: string;
  downloadUrl: string;
  size: number;
  storedAt: Date;
}

export class FileStorageService {
  private session: Session;
  private storagePath: string;

  constructor(session: Session, basePath?: string) {
    this.session = session;
    // Use provided base path or default to /var/www/letsprint/storage/invoices
    this.storagePath = basePath || '/var/www/letsprint/storage/invoices';
  }

  /**
   * Store a file buffer to local filesystem
   */
  async storeFile(
    buffer: Buffer,
    filename: string,
    contentType: string = 'application/pdf'
  ): Promise<StoredFile> {
    try {
      // Create shop-specific directory
      const shopDir = path.join(this.storagePath, this.sanitizeShopName(this.session.shop));
      await this.ensureDirectoryExists(shopDir);

      // Generate unique file key
      const timestamp = Date.now();
      const sanitizedFilename = this.sanitizeFilename(filename);
      const fileKey = `${this.sanitizeShopName(this.session.shop)}/${timestamp}-${sanitizedFilename}`;
      const filePath = path.join(this.storagePath, fileKey);

      // Write file to disk
      await fs.writeFile(filePath, buffer);

      return {
        fileKey,
        downloadUrl: `/api/download/${encodeURIComponent(fileKey)}`,
        size: buffer.length,
        storedAt: new Date(),
      };
    } catch (error) {
      console.error('Error storing file:', error);
      throw new Error(`Failed to store file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieve a file from local filesystem
   */
  async getFile(fileKey: string): Promise<Buffer> {
    try {
      const filePath = path.join(this.storagePath, fileKey);
      
      // Security check: ensure the path is within storage directory
      const resolvedPath = path.resolve(filePath);
      const resolvedStoragePath = path.resolve(this.storagePath);
      
      if (!resolvedPath.startsWith(resolvedStoragePath)) {
        throw new Error('Invalid file path');
      }

      // Check if file exists
      if (!existsSync(filePath)) {
        throw new Error('File not found');
      }

      return await fs.readFile(filePath);
    } catch (error) {
      console.error('Error retrieving file:', error);
      throw new Error(`Failed to retrieve file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get download URL for a file
   */
  async getFileUrl(fileKey: string): Promise<string | null> {
    try {
      const filePath = path.join(this.storagePath, fileKey);
      if (existsSync(filePath)) {
        return `/api/download/${encodeURIComponent(fileKey)}`;
      }
      return null;
    } catch (error) {
      console.error('Error getting file URL:', error);
      return null;
    }
  }

  /**
   * Delete a file from local filesystem
   */
  async deleteFile(fileKey: string): Promise<boolean> {
    try {
      const filePath = path.join(this.storagePath, fileKey);
      
      // Security check
      const resolvedPath = path.resolve(filePath);
      const resolvedStoragePath = path.resolve(this.storagePath);
      
      if (!resolvedPath.startsWith(resolvedStoragePath)) {
        throw new Error('Invalid file path');
      }

      if (existsSync(filePath)) {
        await fs.unlink(filePath);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }

  /**
   * List all files for current shop
   */
  async listFiles(): Promise<string[]> {
    try {
      const shopDir = path.join(this.storagePath, this.sanitizeShopName(this.session.shop));
      
      if (!existsSync(shopDir)) {
        return [];
      }

      const files = await fs.readdir(shopDir);
      return files.map(file => `${this.sanitizeShopName(this.session.shop)}/${file}`);
    } catch (error) {
      console.error('Error listing files:', error);
      return [];
    }
  }

  /**
   * Delete old files (cleanup)
   */
  async deleteOldFiles(daysOld: number = 30): Promise<number> {
    try {
      const shopDir = path.join(this.storagePath, this.sanitizeShopName(this.session.shop));
      
      if (!existsSync(shopDir)) {
        return 0;
      }

      const files = await fs.readdir(shopDir);
      const cutoffDate = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
      let deletedCount = 0;

      for (const file of files) {
        const filePath = path.join(shopDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtimeMs < cutoffDate) {
          await fs.unlink(filePath);
          deletedCount++;
        }
      }

      return deletedCount;
    } catch (error) {
      console.error('Error deleting old files:', error);
      return 0;
    }
  }

  /**
   * Ensure directory exists, create if not
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    if (!existsSync(dirPath)) {
      await fs.mkdir(dirPath, { recursive: true, mode: 0o755 });
    }
  }

  /**
   * Sanitize shop name for use in file paths
   */
  private sanitizeShopName(shop: string): string {
    return shop.replace(/[^a-zA-Z0-9-_.]/g, '-');
  }

  /**
   * Sanitize filename to prevent path traversal
   */
  private sanitizeFilename(filename: string): string {
    return filename.replace(/[^a-zA-Z0-9-_.]/g, '-');
  }
}
