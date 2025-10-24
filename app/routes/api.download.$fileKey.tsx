import { type LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";
import { FileStorageService } from "../lib/services/fileStorageService";

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  try {
    const { session } = await authenticate.admin(request);
    const fileKey = params.fileKey;

    if (!fileKey) {
      return new Response("File key is required", { status: 400 });
    }

    // Decode the file key
    const decodedFileKey = decodeURIComponent(fileKey);

    // Find the invoice by fileKey
    const invoice = await db.invoice.findFirst({
      where: {
        fileKey: decodedFileKey,
        shop: session.shop,
      },
    });

    if (!invoice) {
      return new Response("Invoice not found", { status: 404 });
    }

    // Get file from storage
    const fileStorage = new FileStorageService(session);
    
    try {
      const fileBuffer = await fileStorage.getFile(decodedFileKey);
      
      return new Response(fileBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`,
          "Content-Length": fileBuffer.length.toString(),
          "Cache-Control": "public, max-age=3600",
        },
      });
    } catch (fileError: any) {
      console.error("File retrieval error:", fileError);
      return new Response("File not found in storage", { status: 404 });
    }
  } catch (error: any) {
    console.error("Download error:", error);
    return new Response("Failed to download file", { status: 500 });
  }
};
