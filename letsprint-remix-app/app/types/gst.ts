// GST-specific types and utilities for Indian tax compliance

export type GSTType = 'CGST_SGST' | 'IGST';

export type GSTRate = 0.05 | 0.12; // 5% or 12%

export interface GSTRateConfig {
  threshold: number; // ₹1000
  lowRate: GSTRate; // 5% for orders < ₹1000
  highRate: GSTRate; // 12% for orders >= ₹1000
}

export interface StateMapping {
  [stateCode: string]: {
    name: string;
    code: string;
    gstCode: string;
  };
}

export interface HSNCodeMapping {
  textiles: string;
  cotton: string;
  polyester: string;
  blend: string;
  [key: string]: string;
}

export interface GSTValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface GSTCalculationContext {
  orderTotal: number;
  subtotal: number;
  customerState: string;
  storeState: string;
  productType?: string;
  hsnCode?: string;
  isExempt?: boolean;
  orderId?: string;
}

export interface GSTAuditTrail {
  calculationId: string;
  orderId: string;
  timestamp: string;
  input: GSTCalculationContext;
  output: import('./shopify').GSTBreakdown;
  version: string;
}

// Utility type for GST calculation results
export type GSTCalculationResult = {
  success: true;
  breakdown: import('./shopify').GSTBreakdown;
  auditTrail: GSTAuditTrail;
} | {
  success: false;
  error: string;
  code: string;
};