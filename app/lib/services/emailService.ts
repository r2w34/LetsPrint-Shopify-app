import sgMail from "@sendgrid/mail";

interface EmailInvoiceParams {
  to: string;
  customerName: string;
  invoiceNumber: string;
  invoiceDate: string;
  totalAmount: string;
  pdfBuffer: Buffer;
  businessName: string;
  fromEmail: string;
}

export class EmailService {
  private isConfigured: boolean = false;

  constructor(apiKey?: string) {
    if (apiKey) {
      sgMail.setApiKey(apiKey);
      this.isConfigured = true;
    }
  }

  async sendInvoiceEmail(params: EmailInvoiceParams): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured) {
      return { success: false, error: "Email service not configured. Please add SendGrid API key in settings." };
    }

    try {
      const htmlContent = this.generateEmailTemplate(params);

      const msg = {
        to: params.to,
        from: params.fromEmail,
        subject: `Invoice ${params.invoiceNumber} from ${params.businessName}`,
        text: `Dear ${params.customerName},\n\nPlease find attached invoice ${params.invoiceNumber} for ₹${params.totalAmount}.\n\nThank you for your business!\n\nBest regards,\n${params.businessName}`,
        html: htmlContent,
        attachments: [
          {
            content: params.pdfBuffer.toString("base64"),
            filename: `invoice-${params.invoiceNumber}.pdf`,
            type: "application/pdf",
            disposition: "attachment",
          },
        ],
      };

      await sgMail.send(msg);
      return { success: true };
    } catch (error: any) {
      console.error("Email send error:", error);
      return { 
        success: false, 
        error: error.response?.body?.errors?.[0]?.message || error.message || "Failed to send email" 
      };
    }
  }

  private generateEmailTemplate(params: EmailInvoiceParams): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invoice ${params.invoiceNumber}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
          }
          .container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #4a90e2;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .header h1 {
            color: #4a90e2;
            margin: 0;
            font-size: 28px;
          }
          .content {
            margin-bottom: 30px;
          }
          .content p {
            margin: 10px 0;
          }
          .invoice-details {
            background-color: #f8f9fa;
            border-left: 4px solid #4a90e2;
            padding: 20px;
            margin: 20px 0;
          }
          .invoice-details p {
            margin: 8px 0;
            font-size: 15px;
          }
          .invoice-details strong {
            color: #2c3e50;
            display: inline-block;
            min-width: 140px;
          }
          .footer {
            text-align: center;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
            margin-top: 30px;
            font-size: 14px;
            color: #666;
          }
          .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #4a90e2;
            color: #ffffff;
            text-decoration: none;
            border-radius: 4px;
            margin: 20px 0;
          }
          .highlight {
            color: #4a90e2;
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📄 Invoice</h1>
          </div>
          
          <div class="content">
            <p>Dear <strong>${params.customerName}</strong>,</p>
            
            <p>Thank you for your business! Please find your invoice attached to this email.</p>
            
            <div class="invoice-details">
              <p><strong>Invoice Number:</strong> <span class="highlight">${params.invoiceNumber}</span></p>
              <p><strong>Invoice Date:</strong> ${params.invoiceDate}</p>
              <p><strong>Total Amount:</strong> <span class="highlight">₹${params.totalAmount}</span></p>
            </div>
            
            <p>The invoice PDF is attached to this email. You can download and save it for your records.</p>
            
            <p>If you have any questions about this invoice, please don't hesitate to contact us.</p>
          </div>
          
          <div class="footer">
            <p><strong>${params.businessName}</strong></p>
            <p>This is an automated email. Please do not reply to this message.</p>
            <p style="margin-top: 20px; font-size: 12px; color: #999;">
              Powered by LetsPrint - Invoice Generation App
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
