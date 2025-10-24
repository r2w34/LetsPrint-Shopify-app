import { Session } from '@shopify/shopify-api';
import { ShopifyOrder, LineItem, Address, GSTBreakdown, OrderWithGST } from '../../types/shopify';
import { GSTCalculationContext, GSTCalculationResult } from '../../types/gst';
import { calculateGST, getHSNCode as getTextileHSNCode } from '../utils/gstCalculator';
import { 
  getOrderTotal, 
  getOrderSubtotal, 
  extractTShirtDetails,
  getHSNCode as getLineItemHSNCode
} from './orderUtils';

/**
 * Service for integrating GST calculations with Shopify order data
 */
export class GSTService {
  private storeState: string;

  constructor(storeState: string = 'MH') { // Default to Maharashtra
    this.storeState = storeState;
  }

  /**
   * Set the store state for GST calculations
   */
  setStoreState(state: string): void {
    this.storeState = state;
  }

  /**
   * Get the current store state
   */
  getStoreState(): string {
    return this.storeState;
  }

  /**
   * Extract customer state from order shipping address
   */
  extractCustomerState(order: ShopifyOrder): string {
    // Try shipping address first
    if (order.shipping_address?.province_code) {
      return order.shipping_address.province_code.toUpperCase();
    }
    
    // Fallback to billing address
    if (order.billing_address?.province_code) {
      return order.billing_address.province_code.toUpperCase();
    }

    // If no province code, try to extract from province name
    const shippingProvince = order.shipping_address?.province;
    const billingProvince = order.billing_address?.province;
    
    if (shippingProvince) {
      return this.mapProvinceNameToCode(shippingProvince);
    }
    
    if (billingProvince) {
      return this.mapProvinceNameToCode(billingProvince);
    }

    throw new Error(`Unable to determine customer state for order ${order.id}`);
  }

  /**
   * Map province name to state code (basic mapping for common states)
   */
  private mapProvinceNameToCode(provinceName: string): string {
    const mapping: { [key: string]: string } = {
      'maharashtra': 'MH',
      'karnataka': 'KA',
      'delhi': 'DL',
      'tamil nadu': 'TN',
      'gujarat': 'GJ',
      'rajasthan': 'RJ',
      'uttar pradesh': 'UP',
      'west bengal': 'WB',
      'andhra pradesh': 'AP',
      'telangana': 'TG',
      'kerala': 'KL',
      'punjab': 'PB',
      'haryana': 'HR',
      'bihar': 'BR',
      'odisha': 'OR',
      'jharkhand': 'JH',
      'assam': 'AS',
      'chhattisgarh': 'CG',
      'madhya pradesh': 'MP',
      'himachal pradesh': 'HP',
      'uttarakhand': 'UT',
      'goa': 'GA'
    };

    const normalized = provinceName.toLowerCase().trim();
    return mapping[normalized] || provinceName.substring(0, 2).toUpperCase();
  }

  /**
   * Calculate GST breakdown for a single order
   */
  async calculateOrderGST(order: ShopifyOrder): Promise<GSTBreakdown> {
    try {
      const customerState = this.extractCustomerState(order);
      const orderTotal = getOrderTotal(order);
      const subtotal = getOrderSubtotal(order);

      // Determine product type from line items (for HSN code)
      const productType = this.determineProductType(order.line_items);

      const context: GSTCalculationContext = {
        orderTotal,
        subtotal,
        customerState,
        storeState: this.storeState,
        productType,
        orderId: order.id
      };

      const result = calculateGST(context);

      if (!result.success) {
        throw new Error(`GST calculation failed: ${(result as any).error}`);
      }

      return result.breakdown;
    } catch (error) {
      throw new Error(`Failed to calculate GST for order ${order.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate GST breakdown for multiple line items with different tax rates
   */
  async calculateLineItemGST(order: ShopifyOrder): Promise<{
    lineItems: Array<{
      lineItem: LineItem;
      gstBreakdown: GSTBreakdown;
      tshirtDetails: any;
    }>;
    orderTotal: GSTBreakdown;
  }> {
    const customerState = this.extractCustomerState(order);
    const lineItemResults: Array<{
      lineItem: LineItem;
      gstBreakdown: GSTBreakdown;
      tshirtDetails: any;
    }> = [];

    let totalTaxableAmount = 0;
    let totalGSTAmount = 0;
    let totalCGSTAmount = 0;
    let totalSGSTAmount = 0;
    let totalIGSTAmount = 0;

    // Calculate GST for each line item
    for (const lineItem of order.line_items) {
      const lineItemTotal = parseFloat(lineItem.price) * lineItem.quantity;
      const tshirtDetails = extractTShirtDetails(lineItem);
      
      // Determine product type and HSN code for this line item
      const productType = this.determineLineItemProductType(lineItem, tshirtDetails);
      const hsnCode = getLineItemHSNCode(lineItem);

      const context: GSTCalculationContext = {
        orderTotal: lineItemTotal,
        subtotal: lineItemTotal,
        customerState,
        storeState: this.storeState,
        productType,
        hsnCode,
        orderId: order.id
      };

      const result = calculateGST(context);

      if (!result.success) {
        throw new Error(`GST calculation failed for line item ${lineItem.id}: ${(result as any).error}`);
      }

      lineItemResults.push({
        lineItem,
        gstBreakdown: result.breakdown,
        tshirtDetails
      });

      // Accumulate totals
      totalTaxableAmount += result.breakdown.taxableAmount;
      totalGSTAmount += result.breakdown.totalGstAmount;

      if (result.breakdown.gstType === 'CGST_SGST') {
        totalCGSTAmount += result.breakdown.cgstAmount || 0;
        totalSGSTAmount += result.breakdown.sgstAmount || 0;
      } else {
        totalIGSTAmount += result.breakdown.igstAmount || 0;
      }
    }

    // Determine overall GST type based on customer and store state
    const isSameState = customerState === this.storeState;
    const overallGSTType = isSameState ? 'CGST_SGST' : 'IGST';

    // Create order total breakdown
    const orderTotalBreakdown: GSTBreakdown = {
      gstType: overallGSTType,
      gstRate: totalGSTAmount / totalTaxableAmount, // Average rate
      taxableAmount: Math.round(totalTaxableAmount * 100) / 100,
      totalGstAmount: Math.round(totalGSTAmount * 100) / 100,
      ...(overallGSTType === 'CGST_SGST' ? {
        cgstAmount: Math.round(totalCGSTAmount * 100) / 100,
        sgstAmount: Math.round(totalSGSTAmount * 100) / 100
      } : {
        igstAmount: Math.round(totalIGSTAmount * 100) / 100
      })
    };

    return {
      lineItems: lineItemResults,
      orderTotal: orderTotalBreakdown
    };
  }

  /**
   * Add GST breakdown to order object
   */
  async addGSTToOrder(order: ShopifyOrder): Promise<OrderWithGST> {
    const gstBreakdown = await this.calculateOrderGST(order);
    
    return {
      ...order,
      gstBreakdown
    };
  }

  /**
   * Add GST breakdown to multiple orders
   */
  async addGSTToOrders(orders: ShopifyOrder[]): Promise<OrderWithGST[]> {
    const ordersWithGST: OrderWithGST[] = [];

    for (const order of orders) {
      try {
        const orderWithGST = await this.addGSTToOrder(order);
        ordersWithGST.push(orderWithGST);
      } catch (error) {
        console.error(`Failed to add GST to order ${order.id}:`, error);
        // Add order without GST breakdown as fallback
        ordersWithGST.push({
          ...order,
          gstBreakdown: {
            gstType: 'IGST',
            gstRate: 0,
            totalGstAmount: 0,
            taxableAmount: 0,
            igstAmount: 0
          }
        });
      }
    }

    return ordersWithGST;
  }

  /**
   * Create GST summary for bulk operations
   */
  async createGSTSummary(orders: ShopifyOrder[]): Promise<{
    totalOrders: number;
    totalTaxableAmount: number;
    totalGSTAmount: number;
    totalCGSTAmount: number;
    totalSGSTAmount: number;
    totalIGSTAmount: number;
    averageGSTRate: number;
    stateWiseBreakdown: {
      [state: string]: {
        orderCount: number;
        taxableAmount: number;
        gstAmount: number;
        gstType: 'CGST_SGST' | 'IGST';
      };
    };
  }> {
    let totalTaxableAmount = 0;
    let totalGSTAmount = 0;
    let totalCGSTAmount = 0;
    let totalSGSTAmount = 0;
    let totalIGSTAmount = 0;
    const stateWiseBreakdown: { [state: string]: any } = {};

    for (const order of orders) {
      try {
        const gstBreakdown = await this.calculateOrderGST(order);
        const customerState = this.extractCustomerState(order);

        // Accumulate totals
        totalTaxableAmount += gstBreakdown.taxableAmount;
        totalGSTAmount += gstBreakdown.totalGstAmount;

        if (gstBreakdown.gstType === 'CGST_SGST') {
          totalCGSTAmount += gstBreakdown.cgstAmount || 0;
          totalSGSTAmount += gstBreakdown.sgstAmount || 0;
        } else {
          totalIGSTAmount += gstBreakdown.igstAmount || 0;
        }

        // State-wise breakdown
        if (!stateWiseBreakdown[customerState]) {
          stateWiseBreakdown[customerState] = {
            orderCount: 0,
            taxableAmount: 0,
            gstAmount: 0,
            gstType: gstBreakdown.gstType
          };
        }

        stateWiseBreakdown[customerState].orderCount++;
        stateWiseBreakdown[customerState].taxableAmount += gstBreakdown.taxableAmount;
        stateWiseBreakdown[customerState].gstAmount += gstBreakdown.totalGstAmount;
      } catch (error) {
        console.error(`Failed to process order ${order.id} for GST summary:`, error);
      }
    }

    return {
      totalOrders: orders.length,
      totalTaxableAmount: Math.round(totalTaxableAmount * 100) / 100,
      totalGSTAmount: Math.round(totalGSTAmount * 100) / 100,
      totalCGSTAmount: Math.round(totalCGSTAmount * 100) / 100,
      totalSGSTAmount: Math.round(totalSGSTAmount * 100) / 100,
      totalIGSTAmount: Math.round(totalIGSTAmount * 100) / 100,
      averageGSTRate: totalTaxableAmount > 0 ? Math.round((totalGSTAmount / totalTaxableAmount) * 10000) / 10000 : 0,
      stateWiseBreakdown
    };
  }

  /**
   * Determine product type from line items for HSN code selection
   */
  private determineProductType(lineItems: LineItem[]): string {
    // Check if any line item has material information
    for (const item of lineItems) {
      const tshirtDetails = extractTShirtDetails(item);
      if (tshirtDetails.material) {
        return tshirtDetails.material;
      }

      // Check product title for material hints
      const title = item.title.toLowerCase();
      if (title.includes('cotton')) {
        return 'cotton';
      } else if (title.includes('polyester')) {
        return 'polyester';
      } else if (title.includes('blend') || title.includes('mix')) {
        return 'blend';
      }
    }

    // Default to textiles
    return 'textiles';
  }

  /**
   * Determine product type for a specific line item
   */
  private determineLineItemProductType(lineItem: LineItem, tshirtDetails: any): string {
    if (tshirtDetails.material) {
      return tshirtDetails.material;
    }

    const title = lineItem.title.toLowerCase();
    if (title.includes('cotton')) {
      return 'cotton';
    } else if (title.includes('polyester')) {
      return 'polyester';
    } else if (title.includes('blend') || title.includes('mix')) {
      return 'blend';
    }

    return 'textiles';
  }

  /**
   * Validate order for GST calculation
   */
  validateOrderForGST(order: ShopifyOrder): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!order.id) {
      errors.push('Order ID is required');
    }

    if (!order.total_price || parseFloat(order.total_price) <= 0) {
      errors.push('Order total must be greater than 0');
    }

    if (!order.subtotal_price || parseFloat(order.subtotal_price) <= 0) {
      errors.push('Order subtotal must be greater than 0');
    }

    try {
      this.extractCustomerState(order);
    } catch (error) {
      errors.push(`Unable to determine customer state: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    if (!order.line_items || order.line_items.length === 0) {
      errors.push('Order must have at least one line item');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get GST rate for order total
   */
  getGSTRateForOrder(order: ShopifyOrder): number {
    const total = getOrderTotal(order);
    return total < 1000 ? 0.05 : 0.12;
  }

  /**
   * Check if order qualifies for GST exemption
   */
  isOrderGSTExempt(order: ShopifyOrder): boolean {
    // Check if customer is tax exempt
    if (order.customer?.tax_exempt) {
      return true;
    }

    // Check if any line items are marked as non-taxable
    const hasNonTaxableItems = order.line_items.some(item => !item.taxable);
    if (hasNonTaxableItems) {
      return true;
    }

    return false;
  }
}

// Export a default instance
export const gstService = new GSTService();