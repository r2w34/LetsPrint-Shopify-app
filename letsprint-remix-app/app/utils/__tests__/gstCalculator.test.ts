import { describe, it, expect } from 'vitest';
import {
  calculateGST,
  calculateGSTLegacy,
  validateGSTContext,
  determineGSTRate,
  getHSNCode,
  normalizeStateCode,
  formatGSTAmount,
  getGSTSummaryText,
  DEFAULT_GST_CONFIG,
  TEXTILE_HSN_CODES,
  INDIAN_STATES
} from '../gstCalculator';
import { GSTCalculationContext } from '../../../types/gst';

describe('GST Calculator', () => {
  describe('validateGSTContext', () => {
    it('should validate valid context', () => {
      const context: GSTCalculationContext = {
        orderTotal: 1500,
        subtotal: 1500,
        customerState: 'MH',
        storeState: 'KA'
      };

      const result = validateGSTContext(context);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid order total', () => {
      const context: GSTCalculationContext = {
        orderTotal: 0,
        subtotal: 1500,
        customerState: 'MH',
        storeState: 'KA'
      };

      const result = validateGSTContext(context);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Order total must be greater than 0');
    });

    it('should reject invalid subtotal', () => {
      const context: GSTCalculationContext = {
        orderTotal: 1500,
        subtotal: -100,
        customerState: 'MH',
        storeState: 'KA'
      };

      const result = validateGSTContext(context);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Subtotal must be greater than 0');
    });

    it('should reject empty customer state', () => {
      const context: GSTCalculationContext = {
        orderTotal: 1500,
        subtotal: 1500,
        customerState: '',
        storeState: 'KA'
      };

      const result = validateGSTContext(context);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Customer state is required');
    });

    it('should reject invalid state codes', () => {
      const context: GSTCalculationContext = {
        orderTotal: 1500,
        subtotal: 1500,
        customerState: 'INVALID',
        storeState: 'ALSO_INVALID'
      };

      const result = validateGSTContext(context);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid customer state code: INVALID');
      expect(result.errors).toContain('Invalid store state code: ALSO_INVALID');
    });
  });

  describe('determineGSTRate', () => {
    it('should return 5% for orders less than ₹1000', () => {
      expect(determineGSTRate(500)).toBe(0.05);
      expect(determineGSTRate(999)).toBe(0.05);
    });

    it('should return 12% for orders ₹1000 and above', () => {
      expect(determineGSTRate(1000)).toBe(0.12);
      expect(determineGSTRate(1500)).toBe(0.12);
      expect(determineGSTRate(5000)).toBe(0.12);
    });

    it('should use custom config when provided', () => {
      const customConfig = {
        threshold: 2000,
        lowRate: 0.03,
        highRate: 0.18
      };

      expect(determineGSTRate(1500, customConfig)).toBe(0.03);
      expect(determineGSTRate(2500, customConfig)).toBe(0.18);
    });
  });

  describe('getHSNCode', () => {
    it('should return provided HSN code when available', () => {
      expect(getHSNCode('cotton', '1234')).toBe('1234');
      expect(getHSNCode(undefined, '5678')).toBe('5678');
    });

    it('should return cotton HSN code for cotton products', () => {
      expect(getHSNCode('cotton t-shirt')).toBe(TEXTILE_HSN_CODES.cotton);
      expect(getHSNCode('100% Cotton')).toBe(TEXTILE_HSN_CODES.cotton);
    });

    it('should return polyester HSN code for polyester products', () => {
      expect(getHSNCode('polyester shirt')).toBe(TEXTILE_HSN_CODES.polyester);
      expect(getHSNCode('Polyester Blend')).toBe(TEXTILE_HSN_CODES.polyester);
    });

    it('should return blend HSN code for blend products', () => {
      expect(getHSNCode('cotton-polyester blend')).toBe(TEXTILE_HSN_CODES.blend);
      expect(getHSNCode('mixed fabric')).toBe(TEXTILE_HSN_CODES.blend);
    });

    it('should return default HSN code for unknown products', () => {
      expect(getHSNCode('unknown fabric')).toBe(TEXTILE_HSN_CODES.default);
      expect(getHSNCode()).toBe(TEXTILE_HSN_CODES.default);
    });
  });

  describe('normalizeStateCode', () => {
    it('should normalize valid state codes', () => {
      expect(normalizeStateCode('mh')).toBe('MH');
      expect(normalizeStateCode('  ka  ')).toBe('KA');
      expect(normalizeStateCode('DL')).toBe('DL');
    });

    it('should throw error for empty state code', () => {
      expect(() => normalizeStateCode('')).toThrow('State code cannot be empty');
      expect(() => normalizeStateCode('   ')).toThrow('State code cannot be empty');
    });

    it('should throw error for invalid state code', () => {
      expect(() => normalizeStateCode('INVALID')).toThrow('Invalid state code: INVALID');
    });
  });

  describe('calculateGST - Same State (CGST/SGST)', () => {
    it('should calculate CGST/SGST for same state orders < ₹1000', () => {
      const context: GSTCalculationContext = {
        orderTotal: 800,
        subtotal: 800,
        customerState: 'MH',
        storeState: 'MH',
        productType: 'cotton',
        orderId: 'order_123'
      };

      const result = calculateGST(context);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.breakdown.gstType).toBe('CGST_SGST');
        expect(result.breakdown.gstRate).toBe(0.05);
        expect(result.breakdown.taxableAmount).toBe(800);
        expect(result.breakdown.totalGstAmount).toBe(40);
        expect(result.breakdown.cgstAmount).toBe(20);
        expect(result.breakdown.sgstAmount).toBe(20);
        expect(result.breakdown.hsnCode).toBe(TEXTILE_HSN_CODES.cotton);
        expect(result.auditTrail.orderId).toBe('order_123');
      }
    });

    it('should calculate CGST/SGST for same state orders ≥ ₹1000', () => {
      const context: GSTCalculationContext = {
        orderTotal: 1500,
        subtotal: 1500,
        customerState: 'KA',
        storeState: 'KA'
      };

      const result = calculateGST(context);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.breakdown.gstType).toBe('CGST_SGST');
        expect(result.breakdown.gstRate).toBe(0.12);
        expect(result.breakdown.taxableAmount).toBe(1500);
        expect(result.breakdown.totalGstAmount).toBe(180);
        expect(result.breakdown.cgstAmount).toBe(90);
        expect(result.breakdown.sgstAmount).toBe(90);
      }
    });
  });

  describe('calculateGST - Different State (IGST)', () => {
    it('should calculate IGST for different state orders < ₹1000', () => {
      const context: GSTCalculationContext = {
        orderTotal: 750,
        subtotal: 750,
        customerState: 'MH',
        storeState: 'KA'
      };

      const result = calculateGST(context);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.breakdown.gstType).toBe('IGST');
        expect(result.breakdown.gstRate).toBe(0.05);
        expect(result.breakdown.taxableAmount).toBe(750);
        expect(result.breakdown.totalGstAmount).toBe(37.5);
        expect(result.breakdown.igstAmount).toBe(37.5);
        expect(result.breakdown.cgstAmount).toBeUndefined();
        expect(result.breakdown.sgstAmount).toBeUndefined();
      }
    });

    it('should calculate IGST for different state orders ≥ ₹1000', () => {
      const context: GSTCalculationContext = {
        orderTotal: 2000,
        subtotal: 2000,
        customerState: 'DL',
        storeState: 'TN'
      };

      const result = calculateGST(context);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.breakdown.gstType).toBe('IGST');
        expect(result.breakdown.gstRate).toBe(0.12);
        expect(result.breakdown.taxableAmount).toBe(2000);
        expect(result.breakdown.totalGstAmount).toBe(240);
        expect(result.breakdown.igstAmount).toBe(240);
      }
    });
  });

  describe('calculateGST - Edge Cases', () => {
    it('should handle exact threshold amount', () => {
      const context: GSTCalculationContext = {
        orderTotal: 1000,
        subtotal: 1000,
        customerState: 'MH',
        storeState: 'MH'
      };

      const result = calculateGST(context);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.breakdown.gstRate).toBe(0.12); // Should use high rate for ≥ ₹1000
      }
    });

    it('should handle decimal amounts correctly', () => {
      const context: GSTCalculationContext = {
        orderTotal: 999.99,
        subtotal: 999.99,
        customerState: 'MH',
        storeState: 'KA'
      };

      const result = calculateGST(context);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.breakdown.gstRate).toBe(0.05); // Should use low rate for < ₹1000
        expect(result.breakdown.totalGstAmount).toBe(50); // Rounded to 2 decimal places
      }
    });

    it('should handle case-insensitive state codes', () => {
      const context: GSTCalculationContext = {
        orderTotal: 1500,
        subtotal: 1500,
        customerState: 'mh',
        storeState: 'ka'
      };

      const result = calculateGST(context);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.breakdown.gstType).toBe('IGST'); // Different states
      }
    });
  });

  describe('calculateGST - Error Handling', () => {
    it('should return error for invalid context', () => {
      const context: GSTCalculationContext = {
        orderTotal: -100,
        subtotal: 1500,
        customerState: 'INVALID',
        storeState: 'KA'
      };

      const result = calculateGST(context);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('VALIDATION_ERROR');
        expect(result.error).toContain('Order total must be greater than 0');
      }
    });
  });

  describe('calculateGSTLegacy - Backward Compatibility', () => {
    it('should work with legacy function signature', () => {
      const breakdown = calculateGSTLegacy(1500, 'MH', 'KA');
      
      expect(breakdown.gstType).toBe('IGST');
      expect(breakdown.gstRate).toBe(0.12);
      expect(breakdown.totalGstAmount).toBe(180);
    });

    it('should throw error for invalid input in legacy function', () => {
      expect(() => calculateGSTLegacy(-100, 'MH', 'KA')).toThrow();
    });
  });

  describe('Utility Functions', () => {
    describe('formatGSTAmount', () => {
      it('should format amounts correctly', () => {
        expect(formatGSTAmount(100)).toBe('₹100.00');
        expect(formatGSTAmount(99.5)).toBe('₹99.50');
        expect(formatGSTAmount(0.1, '$')).toBe('$0.10');
      });
    });

    describe('getGSTSummaryText', () => {
      it('should format CGST/SGST summary', () => {
        const breakdown = {
          gstType: 'CGST_SGST' as const,
          gstRate: 0.12,
          cgstAmount: 90,
          sgstAmount: 90,
          totalGstAmount: 180,
          taxableAmount: 1500
        };

        expect(getGSTSummaryText(breakdown)).toBe('CGST: ₹90.00, SGST: ₹90.00');
      });

      it('should format IGST summary', () => {
        const breakdown = {
          gstType: 'IGST' as const,
          gstRate: 0.12,
          igstAmount: 180,
          totalGstAmount: 180,
          taxableAmount: 1500
        };

        expect(getGSTSummaryText(breakdown)).toBe('IGST: ₹180.00');
      });
    });
  });

  describe('Constants and Mappings', () => {
    it('should have correct default GST config', () => {
      expect(DEFAULT_GST_CONFIG.threshold).toBe(1000);
      expect(DEFAULT_GST_CONFIG.lowRate).toBe(0.05);
      expect(DEFAULT_GST_CONFIG.highRate).toBe(0.12);
    });

    it('should have textile HSN codes', () => {
      expect(TEXTILE_HSN_CODES.textiles).toBe('6109');
      expect(TEXTILE_HSN_CODES.cotton).toBe('6109.10');
      expect(TEXTILE_HSN_CODES.default).toBe('6109');
    });

    it('should have all major Indian states', () => {
      expect(INDIAN_STATES['MH']).toBeDefined();
      expect(INDIAN_STATES['KA']).toBeDefined();
      expect(INDIAN_STATES['DL']).toBeDefined();
      expect(INDIAN_STATES['TN']).toBeDefined();
      expect(INDIAN_STATES['MH'].name).toBe('Maharashtra');
      expect(INDIAN_STATES['KA'].gstCode).toBe('29');
    });
  });
});