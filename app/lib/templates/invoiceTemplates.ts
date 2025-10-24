// Invoice templates - Classic Professional Template
// Inspired by reference repositories with Indian GST compliance

import { convertAmountToWords } from "../utils/amountToWords";

export interface InvoiceTemplateData {
  invoiceNumber: string;
  invoiceDate: string;
  orderName: string;
  businessName: string;
  gstin: string;
  pan?: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone?: string;
  email?: string;
  website?: string;
  logoUrl?: string;
  signatureUrl?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankIfscCode?: string;
  bankBranch?: string;
  customerName: string;
  customerEmail?: string;
  billingAddress: any;
  shippingAddress: any;
  lineItems: Array<{
    name: string;
    sku?: string;
    hsn?: string;
    quantity: number;
    price: number;
    taxRate: number;
    taxAmount: number;
    total: number;
  }>;
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  grandTotal: number;
  settings: {
    primaryColor: string;
    fontFamily: string;
    showLogo: boolean;
    showHSN: boolean;
    showSignature: boolean;
    showTerms: boolean;
    documentTitle: string;
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
  };
  termsAndConditions?: string;
  notes?: string;
}

export function generateClassicTemplate(data: InvoiceTemplateData): string {
  const amountInWords = convertAmountToWords(data.grandTotal);
  const isSameState = data.cgst > 0;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Invoice ${data.invoiceNumber}</title>
      <style>
        body {
          font-family: ${data.settings.fontFamily};
          font-size: 11pt;
          color: #2c3e50;
          line-height: 1.6;
          padding: 40pt;
        }
        .header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 3px solid ${data.settings.primaryColor};
        }
        .company-name {
          font-size: 20pt;
          font-weight: 700;
          color: ${data.settings.primaryColor};
        }
        .invoice-title {
          font-size: 32pt;
          font-weight: 700;
          color: ${data.settings.primaryColor};
          text-align: right;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 25px 0;
        }
        th {
          background: ${data.settings.primaryColor};
          color: #fff;
          padding: 12px 8px;
          text-align: left;
        }
        td {
          padding: 10px 8px;
          border-bottom: 1px solid #e0e0e0;
        }
        .totals-table {
          width: 350px;
          float: right;
        }
        .grand-total {
          background: ${data.settings.primaryColor};
          color: #fff;
          font-weight: 700;
        }
        .amount-words {
          background: #fff3cd;
          padding: 15px;
          margin: 20px 0;
          font-weight: 600;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="company-name">${data.businessName}</div>
          <div>${data.address}, ${data.city}, ${data.state} - ${data.pincode}</div>
          <div>GSTIN: ${data.gstin}</div>
        </div>
        <div class="invoice-title">${data.settings.documentTitle}</div>
      </div>
      
      <table>
        <tr>
          <th>Item</th>
          ${data.settings.showHSN ? '<th>HSN</th>' : ''}
          <th>Qty</th>
          <th>Rate</th>
          <th>Tax</th>
          <th>Amount</th>
        </tr>
        ${data.lineItems.map(item => `
          <tr>
            <td>${item.name}</td>
            ${data.settings.showHSN ? `<td>${item.hsn || '-'}</td>` : ''}
            <td>${item.quantity}</td>
            <td>₹${item.price.toFixed(2)}</td>
            <td>${item.taxRate}%</td>
            <td>₹${item.total.toFixed(2)}</td>
          </tr>
        `).join('')}
      </table>
      
      <table class="totals-table">
        <tr><td>Subtotal</td><td>₹${data.subtotal.toFixed(2)}</td></tr>
        ${isSameState ? `
          <tr><td>CGST</td><td>₹${data.cgst.toFixed(2)}</td></tr>
          <tr><td>SGST</td><td>₹${data.sgst.toFixed(2)}</td></tr>
        ` : `
          <tr><td>IGST</td><td>₹${data.igst.toFixed(2)}</td></tr>
        `}
        <tr class="grand-total"><td>TOTAL</td><td>₹${data.grandTotal.toFixed(2)}</td></tr>
      </table>
      
      <div class="amount-words">Amount in Words: ${amountInWords}</div>
    </body>
    </html>
  `;
}

export function generateInvoiceHTML(templateName: string, data: InvoiceTemplateData): string {
  return generateClassicTemplate(data);
}
