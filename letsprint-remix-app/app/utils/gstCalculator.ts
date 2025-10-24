import { GSTCalculationContext, GSTCalculationResult, GSTRateConfig, HSNCodeMapping, StateMapping } from '../../types/gst';
import { GSTBreakdown } from '../../types/shopify';

// Default GST configuration for Indian textile business
export const DEFAULT_GST_CONFIG: GSTRateConfig = {
  threshold: 1000, // ₹1000
  lowRate: 0.05,   // 5% for orders < ₹1000
  highRate: 0.12   // 12% for orders >= ₹1000
};

// HSN codes for textile products
export const TEXTILE_HSN_CODES: HSNCodeMapping = {
  textiles: '6109', // T-shirts, singlets and other vests, knitted or crocheted
  cotton: '6109.10', // Cotton T-shirts
  polyester: '6109.90', // Other textile materials T-shirts
  blend: '6109.90', // Cotton-polyester blend T-shirts
  default: '6109'
};

// Indian state codes mapping for GST calculations
export const INDIAN_STATES: StateMapping = {
  'AN': { name: 'Andaman and Nicobar Islands', code: 'AN', gstCode: '35' },
  'AP': { name: 'Andhra Pradesh', code: 'AP', gstCode: '28' },
  'AR': { name: 'Arunachal Pradesh', code: 'AR', gstCode: '12' },
  'AS': { name: 'Assam', code: 'AS', gstCode: '18' },
  'BR': { name: 'Bihar', code: 'BR', gstCode: '10' },
  'CH': { name: 'Chandigarh', code: 'CH', gstCode: '04' },
  'CG': { name: 'Chhattisgarh', code: 'CG', gstCode: '22' },
  'DN': { name: 'Dadra and Nagar Haveli', code: 'DN', gstCode: '26' },
  'DD': { name: 'Daman and Diu', code: 'DD', gstCode: '25' },
  'DL': { name: 'Delhi', code: 'DL', gstCode: '07' },
  'GA': { name: 'Goa', code: 'GA', gstCode: '30' },
  'GJ': { name: 'Gujarat', code: 'GJ', gstCode: '24' },
  'HR': { name: 'Haryana', code: 'HR', gstCode: '06' },
  'HP': { name: 'Himachal Pradesh', code: 'HP', gstCode: '02' },
  'JK': { name: 'Jammu and Kashmir', code: 'JK', gstCode: '01' },
  'JH': { name: 'Jharkhand', code: 'JH', gstCode: '20' },
  'KA': { name: 'Karnataka', code: 'KA', gstCode: '29' },
  'KL': { name: 'Kerala', code: 'KL', gstCode: '32' },
  'LD': { name: 'Lakshadweep', code: 'LD', gstCode: '31' },
  'MP': { name: 'Madhya Pradesh', code: 'MP', gstCode: '23' },
  'MH': { name: 'Maharashtra', code: 'MH', gstCode: '27' },
  'MN': { name: 'Manipur', code: 'MN', gstCode: '14' },
  'ML': { name: 'Meghalaya', code: 'ML', gstCode: '17' },
  'MZ': { name: 'Mizoram', code: 'MZ', gstCode: '15' },
  'NL': { name: 'Nagaland', code: 'NL', gstCode: '13' },
  'OR': { name: 'Odisha', code: 'OR', gstCode: '21' },
  'PY': { name: 'Puducherry', code: 'PY', gstCode: '34' },
  'PB': { name: 'Punjab', code: 'PB', gstCode: '03' },
  'RJ': { name: 'Rajasthan', code: 'RJ', gstCode: '08' },
  'SK': { name: 'Sikkim', code: 'SK', gstCode: '11' },
  'TN': { name: 'Tamil Nadu', code: 'TN', gstCode: '33' },
  'TG': { name: 'Telangana', code: 'TG', gstCode: '36' },
  'TR': { name: 'Tripura', code: 'TR', gstCode: '16' },
  'UP': { name: 'Uttar Pradesh', code: 'UP', gstCode: '09' },
  'UT': { name: 'Uttarakhand', code: 'UT', gstCode: '05' },
  'WB': { name: 'West Bengal', code: 'WB', gstCode: '19' }
};

/**
 * Validates GST calculation context
 */
export function validateGSTContext(context: GSTCalculationContext): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!context.orderTotal || context.orderTotal <= 0) {
    errors.push('Order total must be greater than 0');
  }

  if (!context.subtotal || context.subtotal <= 0) {
    errors.push('Subtotal must be greater than 0');
  }

  if (!context.customerState || context.customerState.trim() === '') {
    errors.push('Customer state is required');
  }

  if (!context.storeState || context.storeState.trim() === '') {
    errors.push('Store state is required');
  }

  // Validate state codes
  if (context.customerState && !INDIAN_STATES[context.customerState.toUpperCase()]) {
    errors.push(`Invalid customer state code: ${context.customerState}`);
  }

  if (context.storeState && !INDIAN_STATES[context.storeState.toUpperCase()]) {
    errors.push(`Invalid store state code: ${context.storeState}`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Determines GST rate based on order total
 */
export function determineGSTRate(orderTotal: number, config: GSTRateConfig = DEFAULT_GST_CONFIG): number {
  return orderTotal < config.threshold ? config.lowRate : config.highRate;
}

/**
 * Gets HSN code for textile products
 */
export function getHSNCode(productType?: string, hsnCode?: string): string {
  // If HSN code is explicitly provided, use it
  if (hsnCode && hsnCode.trim() !== '') {
    return hsnCode.trim();
  }

  // Determine HSN code based on product type
  if (productType) {
    const type = productType.toLowerCase();
    // Check for blend/mix first as it's more specific
    if (type.includes('blend') || type.includes('mix')) {
      return TEXTILE_HSN_CODES.blend;
    } else if (type.includes('cotton')) {
      return TEXTILE_HSN_CODES.cotton;
    } else if (type.includes('polyester')) {
      return TEXTILE_HSN_CODES.polyester;
    }
  }

  // Default HSN code for textiles
  return TEXTILE_HSN_CODES.default;
}

/**
 * Normalizes state code to uppercase and validates
 */
export function normalizeStateCode(stateCode: string): string {
  if (!stateCode || stateCode.trim() === '') {
    throw new Error('State code cannot be empty');
  }

  const normalized = stateCode.trim().toUpperCase();
  
  if (!INDIAN_STATES[normalized]) {
    throw new Error(`Invalid state code: ${stateCode}`);
  }

  return normalized;
}

/**
 * Core GST calculation function with enhanced validation and HSN code support
 */
export function calculateGST(context: GSTCalculationContext): GSTCalculationResult {
  try {
    // Validate input context
    const validation = validateGSTContext(context);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.errors.join(', '),
        code: 'VALIDATION_ERROR'
      };
    }

    // Normalize state codes
    const customerState = normalizeStateCode(context.customerState);
    const storeState = normalizeStateCode(context.storeState);

    // Determine GST rate based on order total
    const gstRate = determineGSTRate(context.orderTotal);
    
    // Calculate taxable amount (using subtotal for accuracy)
    const taxableAmount = context.subtotal;
    const totalGstAmount = Math.round((taxableAmount * gstRate) * 100) / 100; // Round to 2 decimal places

    // Get HSN code for the product
    const hsnCode = getHSNCode(context.productType, context.hsnCode);

    // Determine GST type based on state comparison
    const isSameState = customerState === storeState;

    let breakdown: GSTBreakdown;

    if (isSameState) {
      // Same state: Split into CGST and SGST (each 50% of total GST)
      const cgstAmount = Math.round((totalGstAmount / 2) * 100) / 100;
      const sgstAmount = Math.round((totalGstAmount / 2) * 100) / 100;
      
      breakdown = {
        gstType: 'CGST_SGST',
        gstRate,
        cgstAmount,
        sgstAmount,
        totalGstAmount,
        taxableAmount,
        hsnCode
      };
    } else {
      // Different states: IGST (full GST amount)
      breakdown = {
        gstType: 'IGST',
        gstRate,
        igstAmount: totalGstAmount,
        totalGstAmount,
        taxableAmount,
        hsnCode
      };
    }

    // Create audit trail
    const auditTrail = {
      calculationId: `gst_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      orderId: context.orderId || 'unknown',
      timestamp: new Date().toISOString(),
      input: context,
      output: breakdown,
      version: '1.0.0'
    };

    return {
      success: true,
      breakdown,
      auditTrail
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      code: 'CALCULATION_ERROR'
    };
  }
}

/**
 * Legacy function for backward compatibility
 */
export function calculateGSTLegacy(
  orderTotal: number,
  customerState: string,
  storeState: string
): GSTBreakdown {
  const context: GSTCalculationContext = {
    orderTotal,
    subtotal: orderTotal,
    customerState,
    storeState
  };

  const result = calculateGST(context);
  
  if (!result.success) {
    throw new Error((result as any).error);
  }

  return result.breakdown;
}

/**
 * Utility function to format GST amount for display
 */
export function formatGSTAmount(amount: number, currency: string = '₹'): string {
  return `${currency}${amount.toFixed(2)}`;
}

/**
 * Utility function to get GST summary text
 */
export function getGSTSummaryText(breakdown: GSTBreakdown): string {
  if (breakdown.gstType === 'CGST_SGST') {
    return `CGST: ${formatGSTAmount(breakdown.cgstAmount || 0)}, SGST: ${formatGSTAmount(breakdown.sgstAmount || 0)}`;
  } else {
    return `IGST: ${formatGSTAmount(breakdown.igstAmount || 0)}`;
  }
}