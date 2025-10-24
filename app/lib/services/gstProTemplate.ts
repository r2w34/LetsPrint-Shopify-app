/**
 * GST Pro Style Invoice Template
 * Matches the layout from GST Pro app Image 7
 */

import { OrderWithGST, BusinessInfo, Template } from '~/types/shopify';
import { formatCurrency, formatDate } from './orderUtils';

export function generateGSTProInvoiceHTML(
  order: OrderWithGST,
  businessInfo: BusinessInfo,
  template: Template,
  invoiceNumber: string,
  invoiceType: 'ORIGINAL' | 'DUPLICATE' | 'TRIPLICATE' = 'ORIGINAL'
): string {
  // Convert amount to words
  const amountInWords = numberToWords(Math.round(parseFloat(order.total_price)));

  // Calculate tax breakdown
  const taxBreakdown = calculateDetailedTaxBreakdown(order);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tax Invoice - ${order.order_number}</title>
  <style>
    ${getGSTProCSS()}
  </style>
</head>
<body>
  <div class="invoice-wrapper">
    <!-- Header Section -->
    <div class="invoice-header">
      <div class="company-section">
        <div class="company-logo">
          ${businessInfo.businessName.charAt(0)}
        </div>
        <div class="company-details">
          <h1>${businessInfo.businessName}</h1>
          <p>${businessInfo.address}</p>
          <p>${businessInfo.city}, ${businessInfo.state} ${businessInfo.pincode}, ${businessInfo.country}</p>
          <p>Email: ${businessInfo.email}</p>
          <p>Tel: ${businessInfo.phone}</p>
          <p><strong>GSTIN:</strong> ${businessInfo.gstin}</p>
        </div>
      </div>
      <div class="invoice-title-section">
        <div class="invoice-title">TAX INVOICE</div>
        <div class="invoice-type">${invoiceType}</div>
      </div>
    </div>

    <!-- Invoice Details and Order Info -->
    <div class="invoice-meta">
      <div class="invoice-details-grid">
        <div class="detail-row">
          <span class="label">Invoice No:</span>
          <span class="value">${invoiceNumber}</span>
        </div>
        <div class="detail-row">
          <span class="label">Invoice Date:</span>
          <span class="value">${formatDate(order.created_at)}</span>
        </div>
        <div class="detail-row">
          <span class="label">Mode of Transport:</span>
          <span class="value">-</span>
        </div>
        <div class="detail-row">
          <span class="label">Date of Supply:</span>
          <span class="value">${formatDate(order.created_at)}</span>
        </div>
        <div class="detail-row">
          <span class="label">Place of Supply:</span>
          <span class="value">${order.shipping_address?.city || ''}, ${order.shipping_address?.province || ''}</span>
        </div>
        <div class="detail-row">
          <span class="label">State Code:</span>
          <span class="value">${order.shipping_address?.province_code || ''} (${getStateCode(order.shipping_address?.province_code)})</span>
        </div>
        <div class="detail-row">
          <span class="label">Order No:</span>
          <span class="value">${order.order_number}</span>
        </div>
      </div>
    </div>

    <!-- Billing and Shipping Address -->
    <div class="address-section">
      <div class="address-box">
        <h3>Billed To</h3>
        <p><strong>${order.customer?.first_name || ''} ${order.customer?.last_name || ''}</strong></p>
        <p>${order.billing_address?.address1 || ''}</p>
        ${order.billing_address?.address2 ? `<p>${order.billing_address.address2}</p>` : ''}
        <p>${order.billing_address?.city || ''}, ${order.billing_address?.province || ''}, ${order.billing_address?.zip || ''}, ${order.billing_address?.country || ''}</p>
        ${order.customer?.phone ? `<p><strong>Tel:</strong> ${order.customer.phone}</p>` : ''}
        ${order.customer?.email ? `<p><strong>Email:</strong> ${order.customer.email}</p>` : ''}
      </div>
      <div class="address-box">
        <h3>Ship To</h3>
        <p><strong>${order.customer?.first_name || ''} ${order.customer?.last_name || ''}</strong></p>
        <p>${order.shipping_address?.address1 || ''}</p>
        ${order.shipping_address?.address2 ? `<p>${order.shipping_address.address2}</p>` : ''}
        <p>${order.shipping_address?.city || ''}, ${order.shipping_address?.province || ''}, ${order.shipping_address?.zip || ''}, ${order.shipping_address?.country || ''}</p>
        ${order.customer?.phone ? `<p><strong>Tel:</strong> ${order.customer.phone}</p>` : ''}
        ${order.customer?.email ? `<p><strong>Email:</strong> ${order.customer.email}</p>` : ''}
      </div>
    </div>

    <!-- Items Table -->
    <table class="items-table">
      <thead>
        <tr>
          <th>Item</th>
          <th>Qty</th>
          <th>Rate</th>
          <th>Taxable Val</th>
          <th>HSN</th>
          <th>GST</th>
          <th>CGST</th>
          <th>SGST</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${order.line_items.map(item => {
          const unitPrice = parseFloat(item.price);
          const quantity = item.quantity;
          const taxableValue = unitPrice * quantity;
          const taxRate = parseFloat(item.tax_lines[0]?.rate || '0') * 100;
          const isSameState = order.shipping_address?.province_code === businessInfo.state;
          const cgst = isSameState ? (taxableValue * taxRate / 200) : 0;
          const sgst = isSameState ? (taxableValue * taxRate / 200) : 0;
          const igst = !isSameState ? (taxableValue * taxRate / 100) : 0;
          const total = taxableValue + (isSameState ? (cgst + sgst) : igst);
          const hsn = item.properties?.find((p: any) => p.name === 'HSN')?.value || item.variant?.sku || '-';

          return `
            <tr>
              <td>${item.title}</td>
              <td>${quantity}</td>
              <td>₹ ${unitPrice.toFixed(2)}</td>
              <td>₹ ${taxableValue.toFixed(2)}</td>
              <td>${hsn}</td>
              <td>${taxRate.toFixed(0)}%</td>
              <td>₹ ${cgst.toFixed(2)}</td>
              <td>₹ ${sgst.toFixed(2)}</td>
              <td>₹ ${total.toFixed(2)}</td>
            </tr>
          `;
        }).join('')}
        <tr class="total-row">
          <td colspan="2"><strong>Total</strong></td>
          <td><strong>₹ ${taxBreakdown.subtotal.toFixed(2)}</strong></td>
          <td><strong>₹ ${taxBreakdown.taxableTotal.toFixed(2)}</strong></td>
          <td></td>
          <td></td>
          <td><strong>₹ ${taxBreakdown.cgstTotal.toFixed(2)}</strong></td>
          <td><strong>₹ ${taxBreakdown.sgstTotal.toFixed(2)}</strong></td>
          <td><strong>₹ ${taxBreakdown.grandTotal.toFixed(2)}</strong></td>
        </tr>
      </tbody>
    </table>

    <!-- Amount in Words -->
    <div class="amount-words">
      <strong>Amount in words:</strong> ${amountInWords}
    </div>

    <!-- Tax Summary Table -->
    <table class="tax-summary-table">
      <thead>
        <tr>
          <th rowspan="2">HSN/SAC</th>
          <th colspan="2">Central Tax</th>
          <th colspan="2">State Tax</th>
          <th colspan="2">Integrated Tax</th>
          <th rowspan="2">Total Discount</th>
        </tr>
        <tr>
          <th>Rate</th>
          <th>Amount</th>
          <th>Rate</th>
          <th>Amount</th>
          <th>Rate</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        ${taxBreakdown.hsnBreakdown.map(hsn => `
          <tr>
            <td>${hsn.code}</td>
            <td>${hsn.cgstRate}%</td>
            <td>₹ ${hsn.cgst.toFixed(2)}</td>
            <td>${hsn.sgstRate}%</td>
            <td>₹ ${hsn.sgst.toFixed(2)}</td>
            <td>${hsn.igstRate}%</td>
            <td>${hsn.igst > 0 ? '₹ ' + hsn.igst.toFixed(2) : '-'}</td>
            <td>-</td>
          </tr>
        `).join('')}
        <tr class="summary-row">
          <td></td>
          <td colspan="2"><strong>Total Tax Amount:</strong></td>
          <td colspan="5" style="text-align: right;"><strong>₹ ${taxBreakdown.totalTax.toFixed(2)}</strong></td>
        </tr>
        <tr class="summary-row">
          <td></td>
          <td colspan="2"><strong>Total Amount Before Tax:</strong></td>
          <td colspan="5" style="text-align: right;"><strong>₹ ${taxBreakdown.taxableTotal.toFixed(2)}</strong></td>
        </tr>
        <tr class="summary-row">
          <td></td>
          <td colspan="2"><strong>Total Amount After Tax:</strong></td>
          <td colspan="5" style="text-align: right;"><strong>₹ ${taxBreakdown.grandTotal.toFixed(2)}</strong></td>
        </tr>
      </tbody>
    </table>

    <!-- Shipping Details -->
    ${parseFloat(order.total_shipping_price_set?.shop_money?.amount || '0') > 0 ? `
    <table class="shipping-table">
      <tbody>
        <tr>
          <td><strong>Shipping Amount:</strong></td>
          <td style="text-align: right;">₹ ${taxBreakdown.shippingAmount.toFixed(2)}</td>
        </tr>
        <tr>
          <td><strong>Shipping CGST (9%):</strong></td>
          <td style="text-align: right;">₹ ${taxBreakdown.shippingCGST.toFixed(2)}</td>
        </tr>
        <tr>
          <td><strong>Shipping SGST (9%):</strong></td>
          <td style="text-align: right;">₹ ${taxBreakdown.shippingSGST.toFixed(2)}</td>
        </tr>
        <tr>
          <td><strong>Total Shipping:</strong></td>
          <td style="text-align: right;"><strong>₹ ${(parseFloat(order.total_shipping_price_set?.shop_money?.amount || '0')).toFixed(2)}</strong></td>
        </tr>
      </tbody>
    </table>
    ` : ''}

    <!-- Round Off and Grand Total -->
    <div class="grand-total-section">
      <div class="total-line">
        <span>Round Off:</span>
        <span>-</span>
      </div>
      <div class="total-line grand-total">
        <span>Total:</span>
        <span>₹ ${parseFloat(order.total_price).toFixed(2)}</span>
      </div>
    </div>

    <!-- Terms and Conditions -->
    <div class="terms-section">
      <p><strong>E & O.E</strong></p>
      <p>Goods once sold will not be taken back or exchanged</p>
    </div>

    <!-- Footer -->
    <div class="invoice-footer">
      <p>${businessInfo.website || 'www.letsprint.com'}</p>
      <p>This is computer generated invoice and hence no signature is required</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Get GST Pro style CSS
 */
function getGSTProCSS(): string {
  return `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: Arial, sans-serif;
      font-size: 10px;
      color: #000;
      line-height: 1.3;
    }

    .invoice-wrapper {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }

    /* Header Section */
    .invoice-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 15px;
      border-bottom: 2px solid #000;
      padding-bottom: 10px;
    }

    .company-section {
      display: flex;
      gap: 15px;
      flex: 1;
    }

    .company-logo {
      width: 60px;
      height: 60px;
      background-color: #4CAF50;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      font-weight: bold;
      border-radius: 5px;
      flex-shrink: 0;
    }

    .company-details h1 {
      font-size: 16px;
      margin-bottom: 3px;
      font-weight: bold;
    }

    .company-details p {
      margin: 1px 0;
      font-size: 9px;
      line-height: 1.3;
    }

    .invoice-title-section {
      text-align: right;
    }

    .invoice-title {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 5px;
    }

    .invoice-type {
      font-size: 12px;
      font-weight: bold;
      color: #666;
    }

    /* Invoice Meta */
    .invoice-meta {
      margin: 15px 0;
      border: 1px solid #ddd;
      padding: 10px;
      background-color: #f9f9f9;
    }

    .invoice-details-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 5px 20px;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
    }

    .detail-row .label {
      font-weight: bold;
      min-width: 120px;
    }

    .detail-row .value {
      text-align: right;
      flex: 1;
    }

    /* Address Section */
    .address-section {
      display: flex;
      gap: 15px;
      margin: 15px 0;
    }

    .address-box {
      flex: 1;
      border: 1px solid #ddd;
      padding: 10px;
    }

    .address-box h3 {
      font-size: 11px;
      font-weight: bold;
      margin-bottom: 8px;
      border-bottom: 1px solid #ddd;
      padding-bottom: 3px;
    }

    .address-box p {
      margin: 2px 0;
      font-size: 9px;
    }

    /* Items Table */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
      font-size: 9px;
    }

    .items-table th,
    .items-table td {
      border: 1px solid #ddd;
      padding: 6px 4px;
      text-align: left;
    }

    .items-table th {
      background-color: #f0f0f0;
      font-weight: bold;
      font-size: 9px;
    }

    .items-table td:nth-child(2),
    .items-table td:nth-child(3),
    .items-table td:nth-child(4),
    .items-table td:nth-child(6),
    .items-table td:nth-child(7),
    .items-table td:nth-child(8),
    .items-table td:nth-child(9) {
      text-align: right;
    }

    .items-table th:nth-child(2),
    .items-table th:nth-child(3),
    .items-table th:nth-child(4),
    .items-table th:nth-child(6),
    .items-table th:nth-child(7),
    .items-table th:nth-child(8),
    .items-table th:nth-child(9) {
      text-align: right;
    }

    .items-table .total-row {
      background-color: #f9f9f9;
      font-weight: bold;
    }

    /* Amount in Words */
    .amount-words {
      margin: 10px 0;
      padding: 8px;
      background-color: #f0f0f0;
      border: 1px solid #ddd;
      font-size: 9px;
    }

    /* Tax Summary Table */
    .tax-summary-table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
      font-size: 9px;
    }

    .tax-summary-table th,
    .tax-summary-table td {
      border: 1px solid #ddd;
      padding: 6px 4px;
      text-align: center;
    }

    .tax-summary-table th {
      background-color: #f0f0f0;
      font-weight: bold;
    }

    .tax-summary-table .summary-row {
      background-color: #f9f9f9;
      font-weight: bold;
    }

    /* Shipping Table */
    .shipping-table {
      width: 40%;
      margin-left: auto;
      margin-top: 15px;
      border-collapse: collapse;
      font-size: 9px;
    }

    .shipping-table td {
      padding: 4px 8px;
      border-bottom: 1px solid #ddd;
    }

    /* Grand Total Section */
    .grand-total-section {
      margin: 15px 0;
      border-top: 2px solid #000;
      padding-top: 10px;
    }

    .total-line {
      display: flex;
      justify-content: space-between;
      padding: 3px 0;
      font-size: 10px;
    }

    .grand-total {
      font-size: 14px;
      font-weight: bold;
      margin-top: 5px;
    }

    /* Terms Section */
    .terms-section {
      margin: 15px 0;
      padding: 10px;
      background-color: #f9f9f9;
      border: 1px solid #ddd;
    }

    .terms-section p {
      margin: 3px 0;
      font-size: 9px;
    }

    /* Footer */
    .invoice-footer {
      text-align: center;
      margin-top: 20px;
      padding-top: 10px;
      border-top: 1px solid #ddd;
    }

    .invoice-footer p {
      margin: 2px 0;
      font-size: 9px;
      color: #666;
    }

    @media print {
      body {
        margin: 0;
        padding: 0;
      }

      .invoice-wrapper {
        max-width: 100%;
        padding: 10mm;
      }
    }
  `;
}

/**
 * Calculate detailed tax breakdown matching GST Pro format
 */
function calculateDetailedTaxBreakdown(order: OrderWithGST) {
  let subtotal = 0;
  let taxableTotal = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;
  let igstTotal = 0;
  let totalTax = 0;
  const hsnBreakdown: any[] = [];

  order.line_items.forEach(item => {
    const unitPrice = parseFloat(item.price);
    const quantity = item.quantity;
    const itemSubtotal = unitPrice * quantity;
    const taxRate = parseFloat(item.tax_lines[0]?.rate || '0');
    const itemTax = itemSubtotal * taxRate;
    const isSameState = order.gstBreakdown?.type === 'intrastate';

    subtotal += itemSubtotal;
    taxableTotal += itemSubtotal;
    totalTax += itemTax;

    if (isSameState) {
      const cgst = itemTax / 2;
      const sgst = itemTax / 2;
      cgstTotal += cgst;
      sgstTotal += sgst;

      // Add to HSN breakdown
      const hsn = item.properties?.find((p: any) => p.name === 'HSN')?.value || item.variant?.sku || '0000';
      hsnBreakdown.push({
        code: hsn,
        cgstRate: (taxRate * 100) / 2,
        cgst: cgst,
        sgstRate: (taxRate * 100) / 2,
        sgst: sgst,
        igstRate: 0,
        igst: 0
      });
    } else {
      igstTotal += itemTax;

      // Add to HSN breakdown
      const hsn = item.properties?.find((p: any) => p.name === 'HSN')?.value || item.variant?.sku || '0000';
      hsnBreakdown.push({
        code: hsn,
        cgstRate: 0,
        cgst: 0,
        sgstRate: 0,
        sgst: 0,
        igstRate: taxRate * 100,
        igst: itemTax
      });
    }
  });

  const shippingAmount = parseFloat(order.total_shipping_price_set?.shop_money?.amount || '0');
  const shippingTaxable = shippingAmount / 1.18; // Assuming 18% GST on shipping
  const shippingTax = shippingAmount - shippingTaxable;
  const shippingCGST = shippingTax / 2;
  const shippingSGST = shippingTax / 2;

  const grandTotal = taxableTotal + totalTax + shippingAmount;

  return {
    subtotal,
    taxableTotal,
    cgstTotal,
    sgstTotal,
    igstTotal,
    totalTax,
    shippingAmount: shippingTaxable,
    shippingCGST,
    shippingSGST,
    grandTotal,
    hsnBreakdown
  };
}

/**
 * Get state code from province code
 */
function getStateCode(provinceCode: string | undefined): string {
  const stateCodes: { [key: string]: string } = {
    'MH': '27',
    'GJ': '24',
    'DL': '07',
    'KA': '29',
    'TN': '33',
    'UP': '09',
    'RJ': '08',
    'MP': '23',
    'WB': '19',
    'BR': '10',
    // Add more states as needed
  };
  return stateCodes[provinceCode || ''] || '00';
}

/**
 * Convert number to words (Indian rupees)
 */
function numberToWords(num: number): string {
  if (num === 0) return 'ZERO RUPEES ONLY';

  const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];
  const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
  const teens = ['TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];

  function convertLessThanThousand(n: number): string {
    if (n === 0) return '';
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 > 0 ? ' ' + ones[n % 10] : '');
    return ones[Math.floor(n / 100)] + ' HUNDRED' + (n % 100 > 0 ? ' AND ' + convertLessThanThousand(n % 100) : '');
  }

  if (num < 1000) {
    return convertLessThanThousand(num) + ' RUPEES ONLY';
  }

  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const hundred = num % 1000;

  let words = '';

  if (crore > 0) {
    words += convertLessThanThousand(crore) + ' CRORE ';
  }
  if (lakh > 0) {
    words += convertLessThanThousand(lakh) + ' LAKH ';
  }
  if (thousand > 0) {
    words += convertLessThanThousand(thousand) + ' THOUSAND ';
  }
  if (hundred > 0) {
    words += 'AND ' + convertLessThanThousand(hundred) + ' ';
  }

  return words.trim() + ' RUPEES ONLY';
}
