import { createObjectCsvWriter } from 'csv-writer';
import { ShopifyOrder, OrderWithGST, CSVExportData, LineItem } from '@/types/shopify';
import { GSTService } from './gstService';
import { extractTShirtDetails, getHSNCode } from './orderUtils';
import { storeGeneratedFile } from './bulkPrintService';

/**
 * Service for generating CSV exports with order data and GST breakdowns
 * Specifically designed for Indian business requirements
 */
export class CSVExportService {
  private gstService: GSTService;

  constructor(storeState: string = 'MH') {
    this.gstService = new GSTService(storeState);
  }

  /**
   * Set the store state for GST calculations
   */
  setStoreState(state: string): void {
    this.gstService.setStoreState(state);
  }

  /**
   * Generate CSV export data for a single order with detailed line items
   */
  async generateOrderCSVData(order: ShopifyOrder, includeGSTBreakdown: boolean = true): Promise<CSVExportData[]> {
    const csvRows: CSVExportData[] = [];
    
    // Calculate GST breakdown for the order
    let gstBreakdown;
    if (includeGSTBreakdown) {
      try {
        gstBreakdown = await this.gstService.calculateOrderGST(order);
      } catch (error) {
        console.error(`Failed to calculate GST for order ${order.id}:`, error);
        // Provide default GST breakdown
        gstBreakdown = {
          gstType: 'IGST' as const,
          gstRate: 0,
          totalGstAmount: 0,
          taxableAmount: parseFloat(order.subtotal_price || '0'),
          igstAmount: 0
        };
      }
    }

    // Extract common order information
    const baseOrderData = this.extractBaseOrderData(order);

    // Create a row for each line item
    for (const lineItem of order.line_items) {
      const tshirtDetails = extractTShirtDetails(lineItem);
      const hsnCode = getHSNCode(lineItem);
      
      // Calculate line item specific amounts
      const lineItemTotal = parseFloat(lineItem.price) * lineItem.quantity;
      const lineItemGSTAmount = includeGSTBreakdown && gstBreakdown 
        ? (lineItemTotal / parseFloat(order.subtotal_price || '1')) * gstBreakdown.totalGstAmount
        : 0;

      const csvRow: CSVExportData = {
        ...baseOrderData,
        productName: lineItem.name,
        variant: lineItem.variant_title || '',
        quantity: lineItem.quantity,
        price: parseFloat(lineItem.price),
        subtotal: lineItemTotal,
        gstType: gstBreakdown?.gstType || 'IGST',
        gstRate: gstBreakdown?.gstRate || 0,
        totalGstAmount: Math.round(lineItemGSTAmount * 100) / 100,
        totalAmount: lineItemTotal + lineItemGSTAmount,
        hsnCode: hsnCode || '',
        // Add GST component breakdown
        ...(includeGSTBreakdown && gstBreakdown ? {
          cgstAmount: gstBreakdown.gstType === 'CGST_SGST' 
            ? Math.round((lineItemGSTAmount / 2) * 100) / 100 
            : undefined,
          sgstAmount: gstBreakdown.gstType === 'CGST_SGST' 
            ? Math.round((lineItemGSTAmount / 2) * 100) / 100 
            : undefined,
          igstAmount: gstBreakdown.gstType === 'IGST' 
            ? Math.round(lineItemGSTAmount * 100) / 100 
            : undefined
        } : {})
      };

      csvRows.push(csvRow);
    }

    return csvRows;
  }

  /**
   * Generate CSV export data for multiple orders
   */
  async generateBulkCSVData(
    orders: ShopifyOrder[], 
    includeGSTBreakdown: boolean = true,
    groupByDate: boolean = false
  ): Promise<CSVExportData[]> {
    const allRows: CSVExportData[] = [];

    for (const order of orders) {
      try {
        const orderRows = await this.generateOrderCSVData(order, includeGSTBreakdown);
        allRows.push(...orderRows);
      } catch (error) {
        console.error(`Failed to process order ${order.id} for CSV export:`, error);
        // Continue with other orders
      }
    }

    if (groupByDate) {
      // Sort by order date
      allRows.sort((a, b) => new Date(a.orderDate).getTime() - new Date(b.orderDate).getTime());
    }

    return allRows;
  }

  /**
   * Generate CSV file from order data
   */
  async generateCSVFile(
    orders: ShopifyOrder[],
    options: {
      includeGSTBreakdown?: boolean;
      groupByDate?: boolean;
      filename?: string;
      jobId?: string;
    } = {}
  ): Promise<{
    content: string;
    filename: string;
    downloadUrl?: string;
  }> {
    const {
      includeGSTBreakdown = true,
      groupByDate = false,
      filename = `orders_export_${new Date().toISOString().split('T')[0]}.csv`,
      jobId
    } = options;

    // Generate CSV data
    const csvData = await this.generateBulkCSVData(orders, includeGSTBreakdown, groupByDate);

    // Define CSV headers based on Indian business requirements
    const headers = this.getCSVHeaders(includeGSTBreakdown);

    // Generate CSV content
    const csvContent = this.generateCSVContent(csvData, headers);

    // Store file if jobId is provided
    let downloadUrl: string | undefined;
    if (jobId) {
      downloadUrl = await storeGeneratedFile(jobId, filename, csvContent, 'text/csv');
    }

    return {
      content: csvContent,
      filename,
      downloadUrl
    };
  }

  /**
   * Generate CSV file for date range export
   */
  async generateDateRangeCSV(
    orders: ShopifyOrder[],
    dateRange: { from: string; to: string },
    options: {
      includeGSTBreakdown?: boolean;
      groupByDate?: boolean;
      jobId?: string;
    } = {}
  ): Promise<{
    content: string;
    filename: string;
    downloadUrl?: string;
  }> {
    const { from, to } = dateRange;
    const filename = `orders_${from}_to_${to}.csv`;

    return this.generateCSVFile(orders, {
      ...options,
      filename
    });
  }

  /**
   * Extract base order data common to all line items
   */
  private extractBaseOrderData(order: ShopifyOrder) {
    const customerName = order.customer 
      ? `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim()
      : 'Guest';

    const formatAddress = (address: any) => {
      if (!address) return '';
      return [
        address.address1,
        address.address2,
        address.city,
        address.province,
        address.zip,
        address.country
      ].filter(Boolean).join(', ');
    };

    return {
      orderNumber: order.name,
      orderDate: new Date(order.created_at).toLocaleDateString('en-IN'),
      customerName,
      customerEmail: order.email || '',
      customerPhone: order.phone || order.customer?.phone || '',
      shippingAddress: formatAddress(order.shipping_address),
      billingAddress: formatAddress(order.billing_address)
    };
  }

  /**
   * Get CSV headers based on Indian business requirements
   */
  private getCSVHeaders(includeGSTBreakdown: boolean): Array<{ id: keyof CSVExportData; title: string }> {
    const baseHeaders = [
      { id: 'orderNumber' as keyof CSVExportData, title: 'Order Number' },
      { id: 'orderDate' as keyof CSVExportData, title: 'Order Date' },
      { id: 'customerName' as keyof CSVExportData, title: 'Customer Name' },
      { id: 'customerEmail' as keyof CSVExportData, title: 'Customer Email' },
      { id: 'customerPhone' as keyof CSVExportData, title: 'Customer Phone' },
      { id: 'shippingAddress' as keyof CSVExportData, title: 'Shipping Address' },
      { id: 'billingAddress' as keyof CSVExportData, title: 'Billing Address' },
      { id: 'productName' as keyof CSVExportData, title: 'Product Name' },
      { id: 'variant' as keyof CSVExportData, title: 'Variant' },
      { id: 'quantity' as keyof CSVExportData, title: 'Quantity' },
      { id: 'price' as keyof CSVExportData, title: 'Unit Price (₹)' },
      { id: 'subtotal' as keyof CSVExportData, title: 'Line Total (₹)' }
    ];

    if (includeGSTBreakdown) {
      baseHeaders.push(
        { id: 'hsnCode' as keyof CSVExportData, title: 'HSN Code' },
        { id: 'gstType' as keyof CSVExportData, title: 'GST Type' },
        { id: 'gstRate' as keyof CSVExportData, title: 'GST Rate (%)' },
        { id: 'cgstAmount' as keyof CSVExportData, title: 'CGST Amount (₹)' },
        { id: 'sgstAmount' as keyof CSVExportData, title: 'SGST Amount (₹)' },
        { id: 'igstAmount' as keyof CSVExportData, title: 'IGST Amount (₹)' },
        { id: 'totalGstAmount' as keyof CSVExportData, title: 'Total GST (₹)' }
      );
    }

    baseHeaders.push(
      { id: 'totalAmount' as keyof CSVExportData, title: 'Total Amount (₹)' }
    );

    return baseHeaders;
  }

  /**
   * Generate CSV content from data and headers
   */
  private generateCSVContent(data: CSVExportData[], headers: Array<{ id: keyof CSVExportData; title: string }>): string {
    if (data.length === 0) {
      return headers.map(h => h.title).join(',') + '\n';
    }

    const csvRows = [
      // Header row
      headers.map(h => h.title).join(','),
      // Data rows
      ...data.map(row => 
        headers.map(header => {
          const value = row[header.id];
          
          // Handle undefined/null values
          if (value === undefined || value === null) {
            return '';
          }

          // Format numbers with proper decimal places
          if (typeof value === 'number') {
            // For GST rates, show as percentage
            if (header.id === 'gstRate') {
              return `${(value * 100).toFixed(2)}%`;
            }
            // For currency amounts, show with 2 decimal places
            if (header.title.includes('₹') || header.title.includes('Amount') || header.title.includes('Price') || header.title.includes('Total')) {
              return value.toFixed(2);
            }
            return value.toString();
          }

          // Escape commas, quotes, and newlines in string values
          const stringValue = value.toString();
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          
          return stringValue;
        }).join(',')
      )
    ];

    return csvRows.join('\n');
  }

  /**
   * Generate summary CSV with aggregated data
   */
  async generateSummaryCSV(
    orders: ShopifyOrder[],
    options: {
      groupBy?: 'date' | 'customer' | 'product';
      includeGSTBreakdown?: boolean;
      jobId?: string;
    } = {}
  ): Promise<{
    content: string;
    filename: string;
    downloadUrl?: string;
  }> {
    const { groupBy = 'date', includeGSTBreakdown = true, jobId } = options;
    
    // Generate detailed data first
    const detailedData = await this.generateBulkCSVData(orders, includeGSTBreakdown);
    
    // Group and aggregate data
    const summaryData = this.aggregateCSVData(detailedData, groupBy);
    
    // Generate summary headers
    const summaryHeaders = this.getSummaryHeaders(groupBy, includeGSTBreakdown);
    
    // Generate CSV content
    const csvContent = this.generateCSVContent(summaryData as any, summaryHeaders as any);
    
    const filename = `orders_summary_${groupBy}_${new Date().toISOString().split('T')[0]}.csv`;
    
    // Store file if jobId is provided
    let downloadUrl: string | undefined;
    if (jobId) {
      downloadUrl = await storeGeneratedFile(jobId, filename, csvContent, 'text/csv');
    }

    return {
      content: csvContent,
      filename,
      downloadUrl
    };
  }

  /**
   * Aggregate CSV data by specified grouping
   */
  private aggregateCSVData(data: CSVExportData[], groupBy: 'date' | 'customer' | 'product'): any[] {
    const grouped = new Map<string, {
      key: string;
      orderCount: number;
      totalQuantity: number;
      totalSubtotal: number;
      totalGST: number;
      totalAmount: number;
      orders: Set<string>;
    }>();

    for (const row of data) {
      let key: string;
      switch (groupBy) {
        case 'date':
          key = row.orderDate;
          break;
        case 'customer':
          key = row.customerName || 'Guest';
          break;
        case 'product':
          key = row.productName;
          break;
        default:
          key = row.orderDate;
      }

      if (!grouped.has(key)) {
        grouped.set(key, {
          key,
          orderCount: 0,
          totalQuantity: 0,
          totalSubtotal: 0,
          totalGST: 0,
          totalAmount: 0,
          orders: new Set()
        });
      }

      const group = grouped.get(key)!;
      group.orders.add(row.orderNumber);
      group.orderCount = group.orders.size;
      group.totalQuantity += row.quantity;
      group.totalSubtotal += row.subtotal;
      group.totalGST += row.totalGstAmount;
      group.totalAmount += row.totalAmount;
    }

    return Array.from(grouped.values()).map(group => ({
      [groupBy]: group.key,
      orderCount: group.orderCount,
      totalQuantity: group.totalQuantity,
      totalSubtotal: Math.round(group.totalSubtotal * 100) / 100,
      totalGST: Math.round(group.totalGST * 100) / 100,
      totalAmount: Math.round(group.totalAmount * 100) / 100,
      averageOrderValue: Math.round((group.totalAmount / group.orderCount) * 100) / 100
    }));
  }

  /**
   * Get summary headers based on grouping
   */
  private getSummaryHeaders(groupBy: 'date' | 'customer' | 'product', includeGSTBreakdown: boolean): Array<{ id: string; title: string }> {
    const groupLabel = groupBy.charAt(0).toUpperCase() + groupBy.slice(1);
    
    const headers = [
      { id: groupBy, title: groupLabel },
      { id: 'orderCount', title: 'Order Count' },
      { id: 'totalQuantity', title: 'Total Quantity' },
      { id: 'totalSubtotal', title: 'Total Subtotal (₹)' }
    ];

    if (includeGSTBreakdown) {
      headers.push({ id: 'totalGST', title: 'Total GST (₹)' });
    }

    headers.push(
      { id: 'totalAmount', title: 'Total Amount (₹)' },
      { id: 'averageOrderValue', title: 'Average Order Value (₹)' }
    );

    return headers;
  }

  /**
   * Validate orders for CSV export
   */
  validateOrdersForExport(orders: ShopifyOrder[]): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!orders || orders.length === 0) {
      errors.push('No orders provided for export');
      return { isValid: false, errors, warnings };
    }

    if (orders.length > 10000) {
      warnings.push(`Large export detected (${orders.length} orders). Consider breaking into smaller batches.`);
    }

    let ordersWithoutCustomerInfo = 0;
    let ordersWithoutAddress = 0;

    for (const order of orders) {
      if (!order.customer && !order.email) {
        ordersWithoutCustomerInfo++;
      }

      if (!order.shipping_address && !order.billing_address) {
        ordersWithoutAddress++;
      }
    }

    if (ordersWithoutCustomerInfo > 0) {
      warnings.push(`${ordersWithoutCustomerInfo} orders have no customer information`);
    }

    if (ordersWithoutAddress > 0) {
      warnings.push(`${ordersWithoutAddress} orders have no address information`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

// Export a default instance
export const csvExportService = new CSVExportService();