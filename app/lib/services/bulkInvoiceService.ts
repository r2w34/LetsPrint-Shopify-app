import Bull from "bull";
import archiver from "archiver";
import fs from "fs/promises";
import path from "path";
import { Readable } from "stream";

// Bull queue for invoice generation jobs
export const invoiceQueue = new Bull("invoice-generation", {
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379"),
    password: process.env.REDIS_PASSWORD,
  },
});

export interface BulkInvoiceJob {
  jobId: string;
  shop: string;
  orderIds: string[];
  userId: string;
}

export class BulkInvoiceService {
  private storagePath: string;

  constructor(storagePath?: string) {
    this.storagePath = storagePath || process.env.STORAGE_PATH || "/var/www/letsprint/storage/invoices";
  }

  /**
   * Create a bulk invoice generation job
   */
  async createBulkJob(jobData: BulkInvoiceJob): Promise<Bull.Job> {
    const job = await invoiceQueue.add(jobData, {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
      removeOnComplete: false,
      removeOnFail: false,
    });

    return job;
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<{
    status: string;
    progress: number;
    total: number;
    completed: number;
    failed: number;
    downloadUrl?: string;
  }> {
    const job = await invoiceQueue.getJob(jobId);

    if (!job) {
      throw new Error("Job not found");
    }

    const state = await job.getState();
    const progress = job.progress() as any;

    return {
      status: state,
      progress: progress.percent || 0,
      total: progress.total || 0,
      completed: progress.completed || 0,
      failed: progress.failed || 0,
      downloadUrl: progress.downloadUrl,
    };
  }

  /**
   * Create ZIP file from invoice PDFs
   */
  async createZipFile(shop: string, invoiceFiles: string[]): Promise<string> {
    const timestamp = Date.now();
    const zipFileName = `invoices-${timestamp}.zip`;
    const zipPath = path.join(this.storagePath, shop, zipFileName);

    // Ensure directory exists
    await fs.mkdir(path.dirname(zipPath), { recursive: true });

    return new Promise((resolve, reject) => {
      const output = require("fs").createWriteStream(zipPath);
      const archive = archiver("zip", {
        zlib: { level: 9 },
      });

      output.on("close", () => {
        resolve(zipFileName);
      });

      archive.on("error", (err: Error) => {
        reject(err);
      });

      archive.pipe(output);

      // Add each PDF file to the ZIP
      for (const fileName of invoiceFiles) {
        const filePath = path.join(this.storagePath, shop, fileName);
        archive.file(filePath, { name: fileName });
      }

      archive.finalize();
    });
  }

  /**
   * Get download URL for ZIP file
   */
  getDownloadUrl(shop: string, fileName: string): string {
    // This will be handled by the download endpoint
    return `/api/download/${fileName}?shop=${shop}`;
  }

  /**
   * Clean up old job data
   */
  async cleanOldJobs(olderThanHours: number = 24): Promise<void> {
    const jobs = await invoiceQueue.getCompleted();
    const cutoffTime = Date.now() - olderThanHours * 60 * 60 * 1000;

    for (const job of jobs) {
      if (job.finishedOn && job.finishedOn < cutoffTime) {
        await job.remove();
      }
    }
  }
}

// Initialize queue processor
export function initializeQueueProcessor(
  generateInvoiceFn: (orderId: string, shop: string) => Promise<string>
) {
  invoiceQueue.process(async (job: Bull.Job<BulkInvoiceJob>) => {
    const { shop, orderIds } = job.data;
    const bulkService = new BulkInvoiceService();

    const total = orderIds.length;
    let completed = 0;
    let failed = 0;
    const generatedFiles: string[] = [];

    for (let i = 0; i < orderIds.length; i++) {
      try {
        const orderId = orderIds[i];

        // Generate invoice
        const fileName = await generateInvoiceFn(orderId, shop);
        generatedFiles.push(fileName);
        completed++;

        // Update progress
        await job.progress({
          percent: Math.round(((i + 1) / total) * 100),
          total,
          completed,
          failed,
        });
      } catch (error) {
        console.error(`Failed to generate invoice for order ${orderIds[i]}:`, error);
        failed++;
      }
    }

    // Create ZIP file
    const zipFileName = await bulkService.createZipFile(shop, generatedFiles);
    const downloadUrl = bulkService.getDownloadUrl(shop, zipFileName);

    // Final progress update
    await job.progress({
      percent: 100,
      total,
      completed,
      failed,
      downloadUrl,
    });

    return {
      success: true,
      total,
      completed,
      failed,
      downloadUrl,
    };
  });
}
