// Type validation utilities and schemas

import { z } from 'zod';
import { GST_RATES, INDIAN_STATES, HSN_CODES } from './constants';

// GST validation schemas
export const GSTBreakdownSchema = z.object({
  gstType: z.enum(['CGST_SGST', 'IGST']),
  gstRate: z.number().min(0).max(1),
  cgstAmount: z.number().optional(),
  sgstAmount: z.number().optional(),
  igstAmount: z.number().optional(),
  totalGstAmount: z.number().min(0),
  taxableAmount: z.number().min(0),
  hsnCode: z.string().optional(),
});

export const GSTConfigurationSchema = z.object({
  storeState: z.string().refine(
    (state) => state in INDIAN_STATES,
    { message: 'Invalid Indian state code' }
  ),
  gstRates: z.object({
    lowRate: z.number().min(0).max(1),
    highRate: z.number().min(0).max(1),
    threshold: z.number().min(0),
  }),
  hsnCodes: z.record(z.string(), z.string()),
});

// Address validation schema
export const AddressSchema = z.object({
  id: z.number().optional(),
  customer_id: z.number().optional(),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  company: z.string().nullable(),
  address1: z.string().nullable(),
  address2: z.string().nullable(),
  city: z.string().nullable(),
  province: z.string().nullable(),
  country: z.string().nullable(),
  zip: z.string().nullable(),
  phone: z.string().nullable(),
  name: z.string().nullable(),
  province_code: z.string().nullable(),
  country_code: z.string().nullable(),
  country_name: z.string().nullable(),
  default: z.boolean().optional(),
});

// Business info validation schema
export const BusinessInfoSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  gstin: z.string().regex(
    /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
    'Invalid GSTIN format'
  ),
  address: z.object({
    line1: z.string().min(1, 'Address line 1 is required'),
    line2: z.string().optional(),
    city: z.string().min(1, 'City is required'),
    state: z.string().refine(
      (state) => state in INDIAN_STATES,
      { message: 'Invalid Indian state' }
    ),
    pincode: z.string().regex(/^[1-9][0-9]{5}$/, 'Invalid pincode format'),
    country: z.string().default('India'),
  }),
  contact: z.object({
    phone: z.string().regex(/^[+]?[0-9]{10,15}$/, 'Invalid phone number'),
    email: z.string().email('Invalid email format'),
    website: z.string().url().optional(),
  }),
  bankDetails: z.object({
    accountName: z.string(),
    accountNumber: z.string(),
    ifscCode: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code'),
    bankName: z.string(),
  }).optional(),
  logo: z.string().url().optional(),
  signature: z.string().url().optional(),
});

// Template validation schema
export const TemplateSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Template name is required'),
  isDefault: z.boolean().default(false),
  layout: z.object({
    pageSize: z.enum(['A4', 'A5', 'Letter', 'Legal']),
    orientation: z.enum(['portrait', 'landscape']),
    margins: z.object({
      top: z.number().min(0),
      right: z.number().min(0),
      bottom: z.number().min(0),
      left: z.number().min(0),
    }),
    fonts: z.object({
      primary: z.string(),
      secondary: z.string(),
      size: z.object({
        header: z.number().min(8).max(72),
        body: z.number().min(8).max(72),
        footer: z.number().min(8).max(72),
      }),
    }),
    colors: z.object({
      primary: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format'),
      secondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format'),
      text: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format'),
      background: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format'),
    }),
    logo: z.object({
      url: z.string().url(),
      width: z.number().min(1),
      height: z.number().min(1),
      position: z.enum(['left', 'center', 'right']),
    }).optional(),
    showGSTBreakdown: z.boolean().default(true),
    showHSNCodes: z.boolean().default(true),
  }),
  businessInfo: BusinessInfoSchema,
  fields: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(['text', 'number', 'date', 'boolean', 'image', 'table', 'gst_breakdown']),
    label: z.string(),
    value: z.any().optional(),
    required: z.boolean().default(false),
    position: z.object({
      x: z.number().min(0),
      y: z.number().min(0),
      width: z.number().min(1),
      height: z.number().min(1),
    }),
  })),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// App settings validation schema
export const AppSettingsSchema = z.object({
  id: z.string(),
  shopDomain: z.string(),
  gstConfiguration: GSTConfigurationSchema,
  businessInfo: BusinessInfoSchema,
  defaultTemplate: z.string(),
  preferences: z.object({
    autoCalculateGST: z.boolean().default(true),
    showGSTInOrderList: z.boolean().default(true),
    defaultExportFormat: z.enum(['pdf', 'csv']).default('pdf'),
    dateFormat: z.string().default('DD/MM/YYYY'),
    currency: z.string().default('INR'),
    timezone: z.string().default('Asia/Kolkata'),
  }),
  webhooks: z.object({
    ordersCreate: z.boolean().default(true),
    ordersUpdate: z.boolean().default(true),
    appUninstalled: z.boolean().default(true),
  }),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Bulk print request validation schema
export const BulkPrintRequestSchema = z.object({
  orderIds: z.array(z.string()).min(1, 'At least one order must be selected'),
  templateId: z.string(),
  format: z.enum(['pdf', 'csv']),
  options: z.object({
    includeGSTBreakdown: z.boolean().default(true),
    groupByDate: z.boolean().default(false),
    filename: z.string().optional(),
  }).optional(),
});

// Validation helper functions
export function validateGSTIN(gstin: string): boolean {
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return gstinRegex.test(gstin);
}

export function validatePincode(pincode: string): boolean {
  const pincodeRegex = /^[1-9][0-9]{5}$/;
  return pincodeRegex.test(pincode);
}

export function validateIFSC(ifsc: string): boolean {
  const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
  return ifscRegex.test(ifsc);
}

export function validateIndianState(stateCode: string): boolean {
  return stateCode in INDIAN_STATES;
}

export function validateGSTRate(rate: number): boolean {
  return rate === GST_RATES.LOW_RATE || rate === GST_RATES.HIGH_RATE;
}

export function validateHSNCode(hsnCode: string): boolean {
  const hsnRegex = /^[0-9]{4}(\.[0-9]{2}){0,2}$/;
  return hsnRegex.test(hsnCode);
}

// Type guards
export function isValidGSTBreakdown(obj: any): obj is import('./shopify').GSTBreakdown {
  try {
    GSTBreakdownSchema.parse(obj);
    return true;
  } catch {
    return false;
  }
}

export function isValidBusinessInfo(obj: any): obj is import('./shopify').BusinessInfo {
  try {
    BusinessInfoSchema.parse(obj);
    return true;
  } catch {
    return false;
  }
}

export function isValidTemplate(obj: any): obj is import('./shopify').Template {
  try {
    TemplateSchema.parse(obj);
    return true;
  } catch {
    return false;
  }
}

export function isValidAppSettings(obj: any): obj is import('./shopify').AppSettings {
  try {
    AppSettingsSchema.parse(obj);
    return true;
  } catch {
    return false;
  }
}