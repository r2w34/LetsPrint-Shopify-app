import { json, type ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";
import { EmailService } from "../lib/services/emailService";
import fs from "fs/promises";
import path from "path";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  try {
    const formData = await request.formData();
    const invoiceId = formData.get("invoiceId") as string;
    const customerEmail = formData.get("customerEmail") as string;

    if (!invoiceId || !customerEmail) {
      return json({ success: false, error: "Missing required parameters" }, { status: 400 });
    }

    // Get invoice details
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice || invoice.shop !== session.shop) {
      return json({ success: false, error: "Invoice not found" }, { status: 404 });
    }

    // Get business info and settings
    const businessInfo = await db.businessInfo.findUnique({
      where: { shop: session.shop },
    });

    const settings = await db.settings.findUnique({
      where: { shop: session.shop },
    });

    if (!settings?.smtpPassword || !settings?.smtpFromEmail) {
      return json({ 
        success: false, 
        error: "Email not configured. Please add SendGrid API key in Settings → Email Settings" 
      }, { status: 400 });
    }

    // Read PDF file
    if (!invoice.fileKey) {
      return json({ success: false, error: "PDF file not found" }, { status: 404 });
    }

    const storagePath = process.env.STORAGE_PATH || "/var/www/letsprint/storage/invoices";
    const filePath = path.join(storagePath, session.shop, invoice.fileKey);

    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await fs.readFile(filePath);
    } catch (error) {
      console.error("Error reading PDF file:", error);
      return json({ success: false, error: "PDF file not accessible" }, { status: 500 });
    }

    // Get customer info from Shopify
    const admin = await authenticate.admin(request);
    let customerName = "Customer";
    
    try {
      const orderResponse = await admin.admin.graphql(
        `#graphql
        query getOrder($id: ID!) {
          order(id: $id) {
            customer {
              firstName
              lastName
              email
            }
          }
        }`,
        {
          variables: { id: invoice.orderId },
        }
      );

      const orderData = await orderResponse.json();
      if (orderData.data?.order?.customer) {
        const customer = orderData.data.order.customer;
        customerName = `${customer.firstName || ""} ${customer.lastName || ""}`.trim() || "Customer";
      }
    } catch (error) {
      console.error("Error fetching customer info:", error);
    }

    // Format date
    const invoiceDate = new Date(invoice.createdAt).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    // Send email using SendGrid API key from settings (smtpPassword field)
    const emailService = new EmailService(settings.smtpPassword);
    
    const result = await emailService.sendInvoiceEmail({
      to: customerEmail,
      customerName: customerName,
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoiceDate,
      totalAmount: invoice.total.toFixed(2),
      pdfBuffer: pdfBuffer,
      businessName: businessInfo?.businessName || "Your Business",
      fromEmail: settings.smtpFromEmail,
    });

    if (result.success) {
      // Update invoice status to indicate it was emailed
      await db.invoice.update({
        where: { id: invoiceId },
        data: { 
          status: "sent",
          updatedAt: new Date(),
        },
      });

      return json({ success: true, message: "Invoice sent successfully" });
    } else {
      return json({ success: false, error: result.error }, { status: 500 });
    }
  } catch (error: any) {
    console.error("Send invoice error:", error);
    return json({ success: false, error: error.message || "Failed to send invoice" }, { status: 500 });
  }
};
