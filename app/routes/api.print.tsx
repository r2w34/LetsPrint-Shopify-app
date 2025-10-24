import { json, type ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { PDFService } from "~/lib/services/pdfService";
import { GSTService } from "~/lib/services/gstService";
import { FileStorageService } from "~/lib/services/fileStorageService";
import { db } from "../db.server";

// Helper function to fetch order from Shopify
async function fetchOrder(admin: any, orderId: string) {
  const response = await admin.graphql(
    `#graphql
      query getOrder($id: ID!) {
        order(id: $id) {
          id
          name
          createdAt
          displayFinancialStatus
          displayFulfillmentStatus
          totalPriceSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          subtotalPriceSet {
            shopMoney {
              amount
            }
          }
          totalTaxSet {
            shopMoney {
              amount
            }
          }
          totalShippingPriceSet {
            shopMoney {
              amount
            }
          }
          lineItems(first: 100) {
            edges {
              node {
                id
                title
                quantity
                originalUnitPriceSet {
                  shopMoney {
                    amount
                  }
                }
                taxLines {
                  title
                  rate
                }
                variant {
                  sku
                }
              }
            }
          }
          customer {
            id
            firstName
            lastName
            email
            phone
          }
          shippingAddress {
            address1
            address2
            city
            provinceCode
            province
            zip
            country
          }
          billingAddress {
            address1
            address2
            city
            provinceCode
            province
            zip
            country
          }
        }
      }
    `,
    {
      variables: {
        id: orderId.startsWith('gid://') ? orderId : `gid://shopify/Order/${orderId}`,
      },
    }
  );

  const data = await response.json();
  return data?.data?.order || null;
}

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return json({ success: false, error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { session, admin } = await authenticate.admin(request);
    const body = await request.json();

    const {
      orderIds,
      options = {},
      storeFile = false,
    } = body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return json(
        { success: false, error: "Order IDs are required" },
        { status: 400 }
      );
    }

    const pdfService = new PDFService(
      session,
      process.env.DEFAULT_STORE_STATE || "MH"
    );

    const gstService = new GSTService(process.env.DEFAULT_STORE_STATE || "MH");

    // For single order
    if (orderIds.length === 1) {
      const orderId = orderIds[0];
      
      // Create a print job record
      const printJob = await db.printJob.create({
        data: {
          shop: session.shop,
          orderIds: JSON.stringify(orderIds),
          jobType: "single",
          status: "processing",
          progress: 0,
        },
      });

      try {
        // Fetch the order
        const order = await fetchOrder(admin, orderId);

        if (!order) {
          throw new Error("Order not found");
        }

        // Add GST breakdown to order
        const lineItems = order.lineItems?.edges?.map((edge: any) => ({
          ...edge.node,
          price: parseFloat(edge.node.originalUnitPriceSet?.shopMoney?.amount || "0"),
        })) || [];
        
        const gstBreakdown = gstService.calculateGSTBreakdown(
          lineItems,
          order.shippingAddress?.provinceCode || "MH"
        );
        
        const orderWithGST = {
          ...order,
          line_items: lineItems,
          total_price: order.totalPriceSet?.shopMoney?.amount || "0",
          subtotal_price: order.subtotalPriceSet?.shopMoney?.amount || "0",
          total_tax: order.totalTaxSet?.shopMoney?.amount || "0",
          gstBreakdown,
        };

        // Generate invoice number
        const settings = await db.settings.findUnique({
          where: { shop: session.shop },
        });

        const invoiceCount = await db.invoice.count({
          where: { shop: session.shop },
        });

        const invoiceNumber = `${settings?.invoicePrefix || "INV"}-${
          (settings?.invoiceStartNumber || 1001) + invoiceCount
        }`;

        // ACTUALLY GENERATE THE PDF
        const pdfResult = await pdfService.generateOrderPDF(orderWithGST, {
          ...options,
          invoiceNumber,
        });

        if (!pdfResult.success || !pdfResult.buffer) {
          throw new Error(pdfResult.error || "Failed to generate PDF");
        }

        // Calculate totals
        const total = parseFloat(orderWithGST.total_price || "0");
        const gstAmount = orderWithGST.gstBreakdown 
          ? (orderWithGST.gstBreakdown.cgst || 0) + (orderWithGST.gstBreakdown.sgst || 0) + (orderWithGST.gstBreakdown.igst || 0)
          : 0;

        // Store PDF in file system
        const fileStorage = new FileStorageService(session);
        const filename = `invoice-${invoiceNumber}.pdf`;
        const storedFile = await fileStorage.storeFile(pdfResult.buffer, filename);
        
        // Also return as base64 for immediate download
        const pdfBase64 = pdfResult.buffer.toString('base64');

        // Create invoice record
        await db.invoice.create({
          data: {
            shop: session.shop,
            orderId,
            orderName: orderWithGST.name || `#${orderId}`,
            invoiceNumber,
            fileKey: storedFile.fileKey,
            pdfUrl: storedFile.downloadUrl,
            total,
            gstAmount,
            status: "generated",
          },
        });

        // Update print job
        await db.printJob.update({
          where: { id: printJob.id },
          data: {
            status: "completed",
            progress: 100,
            downloadUrl: storedFile.downloadUrl,
            fileKey: storedFile.fileKey,
            completedAt: new Date(),
          },
        });

        // Close browser to free resources
        await pdfService.closeBrowser();

        return json({
          success: true,
          downloadUrl: storedFile.downloadUrl,
          fileKey: storedFile.fileKey,
          invoiceNumber,
          jobId: printJob.id,
          pdfBase64, // Return PDF as base64 for immediate download
          filename: pdfResult.filename,
        });
      } catch (error: any) {
        // Close browser on error
        await pdfService.closeBrowser().catch(console.error);
        
        // Update print job with error
        await db.printJob.update({
          where: { id: printJob.id },
          data: {
            status: "failed",
            error: error.message,
          },
        });

        throw error;
      }
    } else {
      // Bulk print - create job and process in background
      const printJob = await db.printJob.create({
        data: {
          shop: session.shop,
          orderIds: JSON.stringify(orderIds),
          jobType: "bulk",
          status: "queued",
          progress: 0,
        },
      });

      // In production, this would be queued with Bull
      // For now, return the job ID
      return json({
        success: true,
        jobId: printJob.id,
        message: `Bulk print job created for ${orderIds.length} orders`,
        status: "queued",
      });
    }
  } catch (error: any) {
    console.error("Print API error:", error);
    return json(
      {
        success: false,
        error: error.message || "Failed to process print request",
      },
      { status: 500 }
    );
  }
};
