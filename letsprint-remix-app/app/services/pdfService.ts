import puppeteer, { Browser, Page, PDFOptions } from 'puppeteer';
import { ShopifyOrder, OrderWithGST, Template, BusinessInfo, GSTBreakdown, GeneratedFile } from '../../types/shopify';
import { GSTService } from './gstService';
import { TemplateService } from './templateService';
import { FileStorageService, StoredFile } from './fileStorageService';
import { extractTShirtDetails, formatCurrency, formatDate } from './orderUtils';

export interface PDFGenerationOptions {
  templateId?: string;
  includeGSTBreakdown?: boolean;
  includeHSNCodes?: boolean;
  includeBusinessInfo?: boolean;
  customBusinessInfo?: BusinessInfo;
}

export interface PDFGenerationResult {
  success: boolean;
  buffer?: Buffer;
  filename?: string;
  downloadUrl?: string;
  storedFile?: StoredFile;
  error?: string;
  metadata?: {
    pageCount: number;
    fileSize: number;
    generatedAt: string;
  };
}

export interface BulkPDFOptions extends PDFGenerationOptions {
  groupByDate?: boolean;
  includeOrderSummary?: boolean;
  maxOrdersPerPage?: number;
}

/**
 * Service for generating PDF documents with Indian GST compliance
 */
export class PDFService {
  private browser: Browser | null = null;
  private gstService: GSTService;
  private templateService: TemplateService;
  private fileStorageService: FileStorageService;
  private session: { shop: string; accessToken: string };

  constructor(session: { shop: string; accessToken: string }, storeState: string = 'MH') {
    this.session = session;
    this.gstService = new GSTService(storeState);
    this.templateService = new TemplateService(session);
    this.fileStorageService = new FileStorageService(session);
  }

  /**
   * Initialize Puppeteer browser instance
   */
  private async initBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      });
    }
    return this.browser;
  }

  /**
   * Close browser instance
   */
  async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Generate PDF for a single order with Indian GST compliance
   */
  async generateOrderPDF(
    order: ShopifyOrder, 
    options: PDFGenerationOptions = {}
  ): Promise<PDFGenerationResult> {
    try {
      // Add GST breakdown to order
      const orderWithGST = await this.gstService.addGSTToOrder(order);
      
      // Get template
      const template = await this.getTemplate(options.templateId);
      
      // Get business info
      const businessInfo = options.customBusinessInfo || await this.getBusinessInfo();
      
      // Generate HTML content
      const htmlContent = await this.generateOrderHTML(orderWithGST, template, businessInfo, options);
      
      // Generate PDF
      const pdfBuffer = await this.generatePDFFromHTML(htmlContent, template);
      
      const filename = `order_${order.order_number}_${Date.now()}.pdf`;
      
      return {
        success: true,
        buffer: pdfBuffer,
        filename,
        metadata: {
          pageCount: 1, // Single order typically fits on one page
          fileSize: pdfBuffer.length,
          generatedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate PDF'
      };
    }
  }

  /**
   * Generate and store PDF for a single order
   */
  async generateAndStoreOrderPDF(
    order: ShopifyOrder, 
    options: PDFGenerationOptions = {},
    storageOptions: { expiresInHours?: number } = {}
  ): Promise<PDFGenerationResult> {
    try {
      // Generate PDF
      const pdfResult = await this.generateOrderPDF(order, options);
      
      if (!pdfResult.success || !pdfResult.buffer || !pdfResult.filename) {
        return pdfResult;
      }

      // Create GeneratedFile object
      const generatedFile: GeneratedFile = {
        filename: pdfResult.filename,
        buffer: pdfResult.buffer,
        mimetype: 'application/pdf',
        size: pdfResult.buffer.length
      };

      // Store file
      const storageResult = await this.fileStorageService.storeFile(generatedFile, {
        expiresInHours: storageOptions.expiresInHours || 24,
        contentType: 'application/pdf'
      });

      if (!storageResult.success) {
        return {
          success: false,
          error: `Failed to store PDF: ${storageResult.error}`
        };
      }

      return {
        success: true,
        buffer: pdfResult.buffer,
        filename: pdfResult.filename,
        downloadUrl: storageResult.file!.downloadUrl,
        storedFile: storageResult.file,
        metadata: pdfResult.metadata
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate and store PDF'
      };
    }
  }

  /**
   * Generate bulk PDF for multiple orders
   */
  async generateBulkPDF(
    orders: ShopifyOrder[], 
    options: BulkPDFOptions = {}
  ): Promise<PDFGenerationResult> {
    try {
      if (orders.length === 0) {
        throw new Error('No orders provided for bulk PDF generation');
      }

      // Add GST breakdown to all orders
      const ordersWithGST = await this.gstService.addGSTToOrders(orders);
      
      // Get template
      const template = await this.getTemplate(options.templateId);
      
      // Get business info
      const businessInfo = options.customBusinessInfo || await this.getBusinessInfo();
      
      // Group orders if requested
      const groupedOrders = options.groupByDate 
        ? this.groupOrdersByDate(ordersWithGST)
        : { 'All Orders': ordersWithGST };
      
      // Generate HTML content for bulk PDF
      const htmlContent = await this.generateBulkHTML(groupedOrders, template, businessInfo, options);
      
      // Generate PDF
      const pdfBuffer = await this.generatePDFFromHTML(htmlContent, template, true);
      
      const filename = `bulk_orders_${orders.length}_${Date.now()}.pdf`;
      
      return {
        success: true,
        buffer: pdfBuffer,
        filename,
        metadata: {
          pageCount: Math.ceil(orders.length / (options.maxOrdersPerPage || 5)),
          fileSize: pdfBuffer.length,
          generatedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate bulk PDF'
      };
    }
  }

  /**
   * Generate and store bulk PDF for multiple orders
   */
  async generateAndStoreBulkPDF(
    orders: ShopifyOrder[], 
    options: BulkPDFOptions = {},
    storageOptions: { expiresInHours?: number } = {}
  ): Promise<PDFGenerationResult> {
    try {
      // Generate bulk PDF
      const pdfResult = await this.generateBulkPDF(orders, options);
      
      if (!pdfResult.success || !pdfResult.buffer || !pdfResult.filename) {
        return pdfResult;
      }

      // Create GeneratedFile object
      const generatedFile: GeneratedFile = {
        filename: pdfResult.filename,
        buffer: pdfResult.buffer,
        mimetype: 'application/pdf',
        size: pdfResult.buffer.length
      };

      // Store file
      const storageResult = await this.fileStorageService.storeFile(generatedFile, {
        expiresInHours: storageOptions.expiresInHours || 48, // Bulk files expire in 48 hours
        contentType: 'application/pdf'
      });

      if (!storageResult.success) {
        return {
          success: false,
          error: `Failed to store bulk PDF: ${storageResult.error}`
        };
      }

      return {
        success: true,
        buffer: pdfResult.buffer,
        filename: pdfResult.filename,
        downloadUrl: storageResult.file!.downloadUrl,
        storedFile: storageResult.file,
        metadata: pdfResult.metadata
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate and store bulk PDF'
      };
    }
  }

  /**
   * Generate PDF preview for template testing
   */
  async generatePreviewPDF(
    templateId: string,
    sampleOrder?: ShopifyOrder
  ): Promise<PDFGenerationResult> {
    try {
      // Use sample order or create a mock order
      const order = sampleOrder || this.createMockOrder();
      
      return this.generateOrderPDF(order, { 
        templateId,
        includeGSTBreakdown: true,
        includeHSNCodes: true,
        includeBusinessInfo: true
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate preview PDF'
      };
    }
  }

  /**
   * Generate HTML content for a single order
   */
  private async generateOrderHTML(
    order: OrderWithGST, 
    template: Template, 
    businessInfo: BusinessInfo,
    options: PDFGenerationOptions
  ): Promise<string> {
    const tshirtDetails = order.line_items.map(item => extractTShirtDetails(item));
    
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order ${order.order_number}</title>
        <style>
          ${this.generateCSS(template)}
        </style>
      </head>
      <body>
        <div class="invoice-container">
          ${this.generateHeader(businessInfo, template)}
          ${this.generateInvoiceInfo(order)}
          ${this.generateCustomerInfo(order)}
          ${this.generateOrderItems(order, tshirtDetails, options)}
          ${options.includeGSTBreakdown !== false ? this.generateGSTBreakdown(order.gstBreakdown) : ''}
          ${this.generateFooter(businessInfo, template)}
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate HTML content for bulk orders
   */
  private async generateBulkHTML(
    groupedOrders: { [key: string]: OrderWithGST[] },
    template: Template,
    businessInfo: BusinessInfo,
    options: BulkPDFOptions
  ): Promise<string> {
    let htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bulk Orders Report</title>
        <style>
          ${this.generateCSS(template)}
          .page-break { page-break-before: always; }
          .group-header { 
            font-size: 16px; 
            font-weight: bold; 
            margin: 20px 0 10px 0; 
            border-bottom: 2px solid ${template.layout.colors.primary};
            padding-bottom: 5px;
          }
          .order-separator { 
            margin: 15px 0; 
            border-top: 1px solid #ddd; 
          }
        </style>
      </head>
      <body>
    `;

    let isFirstGroup = true;
    const maxOrdersPerPage = options.maxOrdersPerPage || 5;

    for (const [groupName, orders] of Object.entries(groupedOrders)) {
      if (!isFirstGroup) {
        htmlContent += '<div class="page-break"></div>';
      }
      
      htmlContent += `<div class="group-header">${groupName}</div>`;
      
      for (let i = 0; i < orders.length; i++) {
        const order = orders[i];
        const tshirtDetails = order.line_items.map(item => extractTShirtDetails(item));
        
        if (i > 0 && i % maxOrdersPerPage === 0) {
          htmlContent += '<div class="page-break"></div>';
        }
        
        if (i > 0) {
          htmlContent += '<div class="order-separator"></div>';
        }
        
        htmlContent += `
          <div class="invoice-container">
            ${i === 0 || i % maxOrdersPerPage === 0 ? this.generateHeader(businessInfo, template) : ''}
            ${this.generateInvoiceInfo(order)}
            ${this.generateCustomerInfo(order)}
            ${this.generateOrderItems(order, tshirtDetails, options)}
            ${options.includeGSTBreakdown !== false ? this.generateGSTBreakdown(order.gstBreakdown) : ''}
          </div>
        `;
      }
      
      isFirstGroup = false;
    }

    // Add summary if requested
    if (options.includeOrderSummary) {
      const allOrders = Object.values(groupedOrders).flat();
      htmlContent += '<div class="page-break"></div>';
      htmlContent += await this.generateOrderSummary(allOrders);
    }

    htmlContent += `
      </body>
      </html>
    `;

    return htmlContent;
  }

  /**
   * Generate CSS styles based on template
   */
  private generateCSS(template: Template): string {
    const { layout } = template;
    
    return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: ${layout.fonts.primary};
        font-size: ${layout.fonts.size.body}px;
        color: ${layout.colors.text};
        background-color: ${layout.colors.background};
        line-height: 1.4;
      }
      
      .invoice-container {
        max-width: 800px;
        margin: 0 auto;
        padding: ${layout.margins.top}px ${layout.margins.right}px ${layout.margins.bottom}px ${layout.margins.left}px;
      }
      
      .header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 30px;
        border-bottom: 2px solid ${layout.colors.primary};
        padding-bottom: 15px;
      }
      
      .company-info h1 {
        font-size: ${layout.fonts.size.header}px;
        color: ${layout.colors.primary};
        margin-bottom: 5px;
      }
      
      .company-info p {
        margin: 2px 0;
        color: ${layout.colors.secondary};
      }
      
      .invoice-info {
        text-align: right;
      }
      
      .invoice-info h2 {
        font-size: 16px;
        color: ${layout.colors.primary};
        margin-bottom: 5px;
      }
      
      .customer-section, .items-section, .gst-section {
        margin: 20px 0;
      }
      
      .section-title {
        font-size: 14px;
        font-weight: bold;
        color: ${layout.colors.primary};
        margin-bottom: 10px;
        border-bottom: 1px solid ${layout.colors.secondary};
        padding-bottom: 3px;
      }
      
      .customer-details {
        background-color: #f9f9f9;
        padding: 15px;
        border-radius: 5px;
      }
      
      .items-table {
        width: 100%;
        border-collapse: collapse;
        margin: 10px 0;
      }
      
      .items-table th,
      .items-table td {
        border: 1px solid #ddd;
        padding: 8px;
        text-align: left;
      }
      
      .items-table th {
        background-color: ${layout.colors.primary};
        color: white;
        font-weight: bold;
      }
      
      .items-table tr:nth-child(even) {
        background-color: #f9f9f9;
      }
      
      .gst-breakdown {
        background-color: #f0f8ff;
        padding: 15px;
        border-radius: 5px;
        border-left: 4px solid ${layout.colors.primary};
      }
      
      .gst-table {
        width: 100%;
        margin-top: 10px;
      }
      
      .gst-table td {
        padding: 5px 10px;
        border-bottom: 1px solid #ddd;
      }
      
      .gst-table .label {
        font-weight: bold;
        width: 60%;
      }
      
      .gst-table .amount {
        text-align: right;
        width: 40%;
      }
      
      .total-row {
        font-weight: bold;
        font-size: 14px;
        background-color: ${layout.colors.primary};
        color: white;
      }
      
      .footer {
        margin-top: 40px;
        padding-top: 20px;
        border-top: 1px solid ${layout.colors.secondary};
        text-align: center;
        font-size: ${layout.fonts.size.footer}px;
        color: ${layout.colors.secondary};
      }
      
      .hsn-code {
        font-size: 10px;
        color: ${layout.colors.secondary};
        font-style: italic;
      }
      
      .tshirt-details {
        font-size: 11px;
        color: ${layout.colors.secondary};
        margin-top: 3px;
      }
      
      @media print {
        body { print-color-adjust: exact; }
        .page-break { page-break-before: always; }
      }
    `;
  }

  /**
   * Generate header section with business info
   */
  private generateHeader(businessInfo: BusinessInfo, template: Template): string {
    return `
      <div class="header">
        <div class="company-info">
          ${template.layout.logo ? `<img src="${template.layout.logo.url}" alt="Logo" style="max-height: 60px; margin-bottom: 10px;">` : ''}
          <h1>${businessInfo.companyName}</h1>
          <p><strong>GSTIN:</strong> ${businessInfo.gstin}</p>
          <p>${businessInfo.address.line1}</p>
          ${businessInfo.address.line2 ? `<p>${businessInfo.address.line2}</p>` : ''}
          <p>${businessInfo.address.city}, ${businessInfo.address.state} ${businessInfo.address.pincode}</p>
          <p><strong>Phone:</strong> ${businessInfo.contact.phone}</p>
          <p><strong>Email:</strong> ${businessInfo.contact.email}</p>
        </div>
      </div>
    `;
  }

  /**
   * Generate invoice information section
   */
  private generateInvoiceInfo(order: OrderWithGST): string {
    return `
      <div class="invoice-info">
        <h2>TAX INVOICE</h2>
        <p><strong>Invoice No:</strong> ${order.order_number}</p>
        <p><strong>Order ID:</strong> ${order.id}</p>
        <p><strong>Date:</strong> ${formatDate(order.created_at)}</p>
        <p><strong>Status:</strong> ${order.financial_status}</p>
      </div>
    `;
  }

  /**
   * Generate customer information section
   */
  private generateCustomerInfo(order: OrderWithGST): string {
    const customer = order.customer;
    const shippingAddress = order.shipping_address;
    const billingAddress = order.billing_address;

    return `
      <div class="customer-section">
        <div class="section-title">Customer Details</div>
        <div class="customer-details">
          <p><strong>Name:</strong> ${customer?.first_name || ''} ${customer?.last_name || ''}</p>
          <p><strong>Email:</strong> ${customer?.email || order.email}</p>
          <p><strong>Phone:</strong> ${customer?.phone || order.phone || 'N/A'}</p>
          
          ${shippingAddress ? `
            <div style="margin-top: 15px;">
              <strong>Shipping Address:</strong><br>
              ${shippingAddress.first_name} ${shippingAddress.last_name}<br>
              ${shippingAddress.address1}<br>
              ${shippingAddress.address2 ? `${shippingAddress.address2}<br>` : ''}
              ${shippingAddress.city}, ${shippingAddress.province} ${shippingAddress.zip}<br>
              ${shippingAddress.country}
            </div>
          ` : ''}
          
          ${billingAddress && billingAddress !== shippingAddress ? `
            <div style="margin-top: 15px;">
              <strong>Billing Address:</strong><br>
              ${billingAddress.first_name} ${billingAddress.last_name}<br>
              ${billingAddress.address1}<br>
              ${billingAddress.address2 ? `${billingAddress.address2}<br>` : ''}
              ${billingAddress.city}, ${billingAddress.province} ${billingAddress.zip}<br>
              ${billingAddress.country}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  /**
   * Generate order items section with T-shirt details and HSN codes
   */
  private generateOrderItems(
    order: OrderWithGST, 
    tshirtDetails: any[], 
    options: PDFGenerationOptions
  ): string {
    let itemsHTML = `
      <div class="items-section">
        <div class="section-title">Order Items</div>
        <table class="items-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Details</th>
              <th>Qty</th>
              <th>Rate</th>
              <th>Amount</th>
              ${options.includeHSNCodes !== false ? '<th>HSN Code</th>' : ''}
            </tr>
          </thead>
          <tbody>
    `;

    order.line_items.forEach((item, index) => {
      const details = tshirtDetails[index];
      const amount = parseFloat(item.price) * item.quantity;
      
      itemsHTML += `
        <tr>
          <td>
            <strong>${item.title}</strong>
            ${item.variant_title ? `<br><small>${item.variant_title}</small>` : ''}
          </td>
          <td>
            <div class="tshirt-details">
              ${details.size ? `Size: ${details.size}<br>` : ''}
              ${details.color ? `Color: ${details.color}<br>` : ''}
              ${details.design ? `Design: ${details.design}<br>` : ''}
              ${details.material ? `Material: ${details.material}` : ''}
            </div>
          </td>
          <td>${item.quantity}</td>
          <td>${formatCurrency(parseFloat(item.price))}</td>
          <td>${formatCurrency(amount)}</td>
          ${options.includeHSNCodes !== false ? `<td><span class="hsn-code">${details.hsnCode || 'N/A'}</span></td>` : ''}
        </tr>
      `;
    });

    itemsHTML += `
          </tbody>
        </table>
      </div>
    `;

    return itemsHTML;
  }

  /**
   * Generate GST breakdown section
   */
  private generateGSTBreakdown(gstBreakdown: GSTBreakdown): string {
    return `
      <div class="gst-section">
        <div class="section-title">GST Breakdown</div>
        <div class="gst-breakdown">
          <table class="gst-table">
            <tr>
              <td class="label">Taxable Amount:</td>
              <td class="amount">${formatCurrency(gstBreakdown.taxableAmount)}</td>
            </tr>
            <tr>
              <td class="label">GST Rate:</td>
              <td class="amount">${(gstBreakdown.gstRate * 100).toFixed(1)}%</td>
            </tr>
            ${gstBreakdown.gstType === 'CGST_SGST' ? `
              <tr>
                <td class="label">CGST (${((gstBreakdown.gstRate / 2) * 100).toFixed(1)}%):</td>
                <td class="amount">${formatCurrency(gstBreakdown.cgstAmount || 0)}</td>
              </tr>
              <tr>
                <td class="label">SGST (${((gstBreakdown.gstRate / 2) * 100).toFixed(1)}%):</td>
                <td class="amount">${formatCurrency(gstBreakdown.sgstAmount || 0)}</td>
              </tr>
            ` : `
              <tr>
                <td class="label">IGST (${(gstBreakdown.gstRate * 100).toFixed(1)}%):</td>
                <td class="amount">${formatCurrency(gstBreakdown.igstAmount || 0)}</td>
              </tr>
            `}
            <tr class="total-row">
              <td class="label">Total GST:</td>
              <td class="amount">${formatCurrency(gstBreakdown.totalGstAmount)}</td>
            </tr>
            <tr class="total-row">
              <td class="label">Grand Total:</td>
              <td class="amount">${formatCurrency(gstBreakdown.taxableAmount + gstBreakdown.totalGstAmount)}</td>
            </tr>
          </table>
        </div>
      </div>
    `;
  }

  /**
   * Generate footer section
   */
  private generateFooter(businessInfo: BusinessInfo, template: Template): string {
    return `
      <div class="footer">
        ${businessInfo.bankDetails ? `
          <div style="margin-bottom: 15px;">
            <strong>Bank Details:</strong><br>
            ${businessInfo.bankDetails.bankName}<br>
            Account: ${businessInfo.bankDetails.accountNumber}<br>
            IFSC: ${businessInfo.bankDetails.ifscCode}
          </div>
        ` : ''}
        <p>This is a computer-generated invoice and does not require a signature.</p>
        <p>Generated on ${formatDate(new Date().toISOString())}</p>
      </div>
    `;
  }

  /**
   * Generate PDF from HTML content
   */
  private async generatePDFFromHTML(
    htmlContent: string, 
    template: Template, 
    isBulk: boolean = false
  ): Promise<Buffer> {
    const browser = await this.initBrowser();
    const page = await browser.newPage();

    try {
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

      const pdfOptions: PDFOptions = {
        format: template.layout.pageSize === 'A4' ? 'A4' : 
                template.layout.pageSize === 'A5' ? 'A5' : 'Letter',
        landscape: template.layout.orientation === 'landscape',
        printBackground: true,
        margin: {
          top: `${template.layout.margins.top}px`,
          right: `${template.layout.margins.right}px`,
          bottom: `${template.layout.margins.bottom}px`,
          left: `${template.layout.margins.left}px`
        }
      };

      const pdfBuffer = await page.pdf(pdfOptions);
      return Buffer.from(pdfBuffer);
    } finally {
      await page.close();
    }
  }

  // Helper methods

  private async getTemplate(templateId?: string): Promise<Template> {
    if (templateId) {
      const result = await this.templateService.getTemplate(templateId);
      if (result.success && result.data) {
        return result.data;
      }
    }

    // Fallback to default template
    const defaultResult = await this.templateService.getDefaultTemplate();
    if (defaultResult.success && defaultResult.data) {
      return defaultResult.data;
    }

    throw new Error('No template available for PDF generation');
  }

  private async getBusinessInfo(): Promise<BusinessInfo> {
    const result = await this.templateService.getBusinessInfo();
    if (result.success && result.data) {
      return result.data;
    }

    throw new Error('Business information not configured');
  }

  private groupOrdersByDate(orders: OrderWithGST[]): { [key: string]: OrderWithGST[] } {
    const grouped: { [key: string]: OrderWithGST[] } = {};

    orders.forEach(order => {
      const date = formatDate(order.created_at, 'YYYY-MM-DD');
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(order);
    });

    return grouped;
  }

  private async generateOrderSummary(orders: OrderWithGST[]): Promise<string> {
    const summary = await this.gstService.createGSTSummary(orders);

    return `
      <div class="summary-section">
        <div class="section-title">Order Summary</div>
        <table class="gst-table">
          <tr>
            <td class="label">Total Orders:</td>
            <td class="amount">${summary.totalOrders}</td>
          </tr>
          <tr>
            <td class="label">Total Taxable Amount:</td>
            <td class="amount">${formatCurrency(summary.totalTaxableAmount)}</td>
          </tr>
          <tr>
            <td class="label">Total CGST:</td>
            <td class="amount">${formatCurrency(summary.totalCGSTAmount)}</td>
          </tr>
          <tr>
            <td class="label">Total SGST:</td>
            <td class="amount">${formatCurrency(summary.totalSGSTAmount)}</td>
          </tr>
          <tr>
            <td class="label">Total IGST:</td>
            <td class="amount">${formatCurrency(summary.totalIGSTAmount)}</td>
          </tr>
          <tr class="total-row">
            <td class="label">Total GST:</td>
            <td class="amount">${formatCurrency(summary.totalGSTAmount)}</td>
          </tr>
          <tr class="total-row">
            <td class="label">Grand Total:</td>
            <td class="amount">${formatCurrency(summary.totalTaxableAmount + summary.totalGSTAmount)}</td>
          </tr>
        </table>
      </div>
    `;
  }

  /**
   * Get stored file information
   */
  async getStoredFile(fileKey: string): Promise<{ success: boolean; file?: StoredFile; error?: string }> {
    const result = await this.fileStorageService.getFile(fileKey);
    return {
      success: result.success,
      file: result.file,
      error: result.error
    };
  }

  /**
   * Delete stored file
   */
  async deleteStoredFile(fileKey: string): Promise<{ success: boolean; error?: string }> {
    return await this.fileStorageService.deleteFile(fileKey);
  }

  /**
   * List all stored PDF files
   */
  async listStoredFiles(limit: number = 50): Promise<{ success: boolean; files?: StoredFile[]; error?: string }> {
    return await this.fileStorageService.listFiles(limit);
  }

  /**
   * Clean up expired PDF files
   */
  async cleanupExpiredFiles(): Promise<{ success: boolean; deletedCount?: number; error?: string }> {
    return await this.fileStorageService.cleanupExpiredFiles();
  }

  /**
   * Generate PDF preview with template validation
   */
  async generateTemplatePreview(
    templateId: string,
    sampleOrder?: ShopifyOrder
  ): Promise<PDFGenerationResult> {
    try {
      // Validate template exists
      const template = await this.getTemplate(templateId);
      
      // Use sample order or create a mock order
      const order = sampleOrder || this.createMockOrder();
      
      // Generate preview without storing
      return this.generateOrderPDF(order, { 
        templateId,
        includeGSTBreakdown: true,
        includeHSNCodes: true,
        includeBusinessInfo: true
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate template preview'
      };
    }
  }

  /**
   * Validate PDF generation requirements
   */
  async validatePDFRequirements(): Promise<{ 
    isValid: boolean; 
    errors: string[]; 
    warnings: string[] 
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check if default template exists
      const templateResult = await this.templateService.getDefaultTemplate();
      if (!templateResult.success) {
        errors.push('No default template configured');
      }

      // Check if business info is configured
      const businessResult = await this.templateService.getBusinessInfo();
      if (!businessResult.success || !businessResult.data?.companyName) {
        warnings.push('Business information not fully configured');
      }

      // Check if GSTIN is configured
      if (businessResult.success && businessResult.data && !businessResult.data.gstin) {
        warnings.push('GSTIN not configured - required for GST compliance');
      }

      // Test browser initialization
      try {
        const browser = await this.initBrowser();
        await browser.close();
        this.browser = null;
      } catch (error) {
        errors.push('PDF generation engine (Puppeteer) not available');
      }

    } catch (error) {
      errors.push(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private createMockOrder(): ShopifyOrder {
    // Create a mock order for preview purposes
    return {
      id: 'mock_order_123',
      order_number: 1001,
      created_at: new Date().toISOString(),
      total_price: '1200.00',
      subtotal_price: '1000.00',
      current_total_price: '1200.00',
      current_subtotal_price: '1000.00',
      financial_status: 'paid',
      email: 'customer@example.com',
      customer: {
        id: 1,
        first_name: 'John',
        last_name: 'Doe',
        email: 'customer@example.com',
        phone: '+91 9876543210'
      } as any,
      shipping_address: {
        first_name: 'John',
        last_name: 'Doe',
        address1: '123 Sample Street',
        city: 'Mumbai',
        province: 'Maharashtra',
        province_code: 'MH',
        zip: '400001',
        country: 'India',
        country_code: 'IN'
      } as any,
      line_items: [
        {
          id: 1,
          title: 'Cotton T-Shirt',
          variant_title: 'Large / Blue',
          quantity: 2,
          price: '500.00',
          properties: [
            { name: 'Size', value: 'Large' },
            { name: 'Color', value: 'Blue' },
            { name: 'Material', value: 'Cotton' }
          ]
        } as any
      ]
    } as any;
  }
}