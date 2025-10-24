import { ShopifyGraphQLClient } from './graphqlClient';
import { GeneratedFile } from '../../types/shopify';

export interface FileStorageOptions {
  expiresInHours?: number;
  isPublic?: boolean;
  contentType?: string;
}

export interface StoredFile {
  id: string;
  url: string;
  downloadUrl: string;
  filename: string;
  size: number;
  contentType: string;
  expiresAt?: string;
  createdAt: string;
}

export interface FileStorageResult {
  success: boolean;
  file?: StoredFile;
  error?: string;
}

/**
 * Service for handling file storage and downloads through Shopify's file system
 */
export class FileStorageService {
  private graphqlClient: ShopifyGraphQLClient;
  private readonly FILE_NAMESPACE = 'order_printer_files';

  constructor(session: { shop: string; accessToken: string }) {
    this.graphqlClient = new ShopifyGraphQLClient(session as any);
  }

  /**
   * Store a generated file and create a download link
   */
  async storeFile(
    file: GeneratedFile,
    options: FileStorageOptions = {}
  ): Promise<FileStorageResult> {
    try {
      const {
        expiresInHours = 24,
        isPublic = false,
        contentType = file.mimetype
      } = options;

      // Create a unique file key
      const fileKey = this.generateFileKey(file.filename);
      const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

      // Store file metadata in Shopify metafields
      const fileMetadata = {
        filename: file.filename,
        size: file.size,
        contentType,
        buffer: file.buffer.toString('base64'),
        isPublic,
        expiresAt: expiresAt.toISOString(),
        createdAt: new Date().toISOString()
      };

      const mutation = `
        mutation metafieldSet($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            metafields {
              id
              namespace
              key
              value
              type
              createdAt
              updatedAt
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const variables = {
        metafields: [{
          namespace: this.FILE_NAMESPACE,
          key: fileKey,
          value: JSON.stringify(fileMetadata),
          type: 'json_string',
          description: `Stored file: ${file.filename}`,
          ownerId: await this.getShopGid()
        }]
      };

      const response = await this.graphqlClient.mutate(mutation, variables);

      if (response.metafieldsSet.userErrors.length > 0) {
        throw new Error(response.metafieldsSet.userErrors[0].message);
      }

      const metafieldId = response.metafieldsSet.metafields[0].id;
      const downloadUrl = this.generateDownloadUrl(fileKey);

      const storedFile: StoredFile = {
        id: metafieldId,
        url: downloadUrl,
        downloadUrl,
        filename: file.filename,
        size: file.size,
        contentType,
        expiresAt: expiresAt.toISOString(),
        createdAt: new Date().toISOString()
      };

      return {
        success: true,
        file: storedFile
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to store file'
      };
    }
  }

  /**
   * Retrieve a stored file by file key
   */
  async getFile(fileKey: string): Promise<FileStorageResult> {
    try {
      const query = `
        query getFileMetafield($namespace: String!, $key: String!) {
          shop {
            metafield(namespace: $namespace, key: $key) {
              id
              namespace
              key
              value
              type
              createdAt
              updatedAt
            }
          }
        }
      `;

      const variables = { 
        namespace: this.FILE_NAMESPACE, 
        key: fileKey 
      };
      
      const response = await this.graphqlClient.query(query, variables);

      if (!response.shop.metafield) {
        return {
          success: false,
          error: 'File not found'
        };
      }

      const fileMetadata = JSON.parse(response.shop.metafield.value);

      // Check if file has expired
      if (fileMetadata.expiresAt && new Date(fileMetadata.expiresAt) < new Date()) {
        // Clean up expired file
        await this.deleteFile(fileKey);
        return {
          success: false,
          error: 'File has expired'
        };
      }

      const storedFile: StoredFile = {
        id: response.shop.metafield.id,
        url: this.generateDownloadUrl(fileKey),
        downloadUrl: this.generateDownloadUrl(fileKey),
        filename: fileMetadata.filename,
        size: fileMetadata.size,
        contentType: fileMetadata.contentType,
        expiresAt: fileMetadata.expiresAt,
        createdAt: fileMetadata.createdAt
      };

      return {
        success: true,
        file: storedFile
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve file'
      };
    }
  }

  /**
   * Get file buffer for download
   */
  async getFileBuffer(fileKey: string): Promise<{ success: boolean; buffer?: Buffer; contentType?: string; filename?: string; error?: string }> {
    try {
      const query = `
        query getFileMetafield($namespace: String!, $key: String!) {
          shop {
            metafield(namespace: $namespace, key: $key) {
              value
            }
          }
        }
      `;

      const variables = { 
        namespace: this.FILE_NAMESPACE, 
        key: fileKey 
      };
      
      const response = await this.graphqlClient.query(query, variables);

      if (!response.shop.metafield) {
        return {
          success: false,
          error: 'File not found'
        };
      }

      const fileMetadata = JSON.parse(response.shop.metafield.value);

      // Check if file has expired
      if (fileMetadata.expiresAt && new Date(fileMetadata.expiresAt) < new Date()) {
        // Clean up expired file
        await this.deleteFile(fileKey);
        return {
          success: false,
          error: 'File has expired'
        };
      }

      const buffer = Buffer.from(fileMetadata.buffer, 'base64');

      return {
        success: true,
        buffer,
        contentType: fileMetadata.contentType,
        filename: fileMetadata.filename
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve file buffer'
      };
    }
  }

  /**
   * Delete a stored file
   */
  async deleteFile(fileKey: string): Promise<{ success: boolean; error?: string }> {
    try {
      // First get the metafield ID
      const metafieldId = await this.getMetafieldId(this.FILE_NAMESPACE, fileKey);
      if (!metafieldId) {
        return {
          success: false,
          error: 'File not found'
        };
      }

      const mutation = `
        mutation metafieldDelete($input: MetafieldDeleteInput!) {
          metafieldDelete(input: $input) {
            deletedId
            userErrors {
              field
              message
            }
          }
        }
      `;

      const variables = {
        input: {
          id: metafieldId
        }
      };

      const response = await this.graphqlClient.mutate(mutation, variables);

      if (response.metafieldDelete.userErrors.length > 0) {
        throw new Error(response.metafieldDelete.userErrors[0].message);
      }

      return {
        success: true
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete file'
      };
    }
  }

  /**
   * List all stored files (with pagination)
   */
  async listFiles(limit: number = 50): Promise<{ success: boolean; files?: StoredFile[]; error?: string }> {
    try {
      const query = `
        query getFileMetafields($namespace: String!, $first: Int!) {
          shop {
            metafields(namespace: $namespace, first: $first) {
              edges {
                node {
                  id
                  namespace
                  key
                  value
                  type
                  createdAt
                  updatedAt
                }
              }
            }
          }
        }
      `;

      const variables = { 
        namespace: this.FILE_NAMESPACE,
        first: limit
      };
      
      const response = await this.graphqlClient.query(query, variables);

      const files: StoredFile[] = response.shop.metafields.edges
        .map((edge: any) => {
          try {
            const fileMetadata = JSON.parse(edge.node.value);
            
            // Skip expired files
            if (fileMetadata.expiresAt && new Date(fileMetadata.expiresAt) < new Date()) {
              // Clean up expired file (fire and forget)
              this.deleteFile(edge.node.key).catch(console.error);
              return null;
            }

            return {
              id: edge.node.id,
              url: this.generateDownloadUrl(edge.node.key),
              downloadUrl: this.generateDownloadUrl(edge.node.key),
              filename: fileMetadata.filename,
              size: fileMetadata.size,
              contentType: fileMetadata.contentType,
              expiresAt: fileMetadata.expiresAt,
              createdAt: fileMetadata.createdAt
            };
          } catch (error) {
            console.error(`Failed to parse file metadata for ${edge.node.key}:`, error);
            return null;
          }
        })
        .filter((file: StoredFile | null): file is StoredFile => file !== null);

      return {
        success: true,
        files
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list files'
      };
    }
  }

  /**
   * Clean up expired files
   */
  async cleanupExpiredFiles(): Promise<{ success: boolean; deletedCount?: number; error?: string }> {
    try {
      const listResult = await this.listFiles(100);
      if (!listResult.success || !listResult.files) {
        return {
          success: false,
          error: 'Failed to list files for cleanup'
        };
      }

      const now = new Date();
      const expiredFiles = listResult.files.filter(file => 
        file.expiresAt && new Date(file.expiresAt) < now
      );

      let deletedCount = 0;
      for (const file of expiredFiles) {
        const fileKey = this.extractFileKeyFromUrl(file.url);
        if (fileKey) {
          const deleteResult = await this.deleteFile(fileKey);
          if (deleteResult.success) {
            deletedCount++;
          }
        }
      }

      return {
        success: true,
        deletedCount
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cleanup expired files'
      };
    }
  }

  // Private helper methods

  private generateFileKey(filename: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const cleanFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `${timestamp}_${random}_${cleanFilename}`;
  }

  private generateDownloadUrl(fileKey: string): string {
    // This will be handled by the download API route
    return `/api/print/download/${fileKey}`;
  }

  private extractFileKeyFromUrl(url: string): string | null {
    const match = url.match(/\/api\/print\/download\/(.+)$/);
    return match ? match[1] : null;
  }

  private async getShopGid(): Promise<string> {
    const query = `
      query {
        shop {
          id
        }
      }
    `;

    const response = await this.graphqlClient.query(query);
    return response.shop.id;
  }

  private async getMetafieldId(namespace: string, key: string): Promise<string | null> {
    const query = `
      query getMetafieldId($namespace: String!, $key: String!) {
        shop {
          metafield(namespace: $namespace, key: $key) {
            id
          }
        }
      }
    `;

    const variables = { namespace, key };
    const response = await this.graphqlClient.query(query, variables);
    
    return response.shop.metafield?.id || null;
  }
}