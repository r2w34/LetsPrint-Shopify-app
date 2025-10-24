// Template-specific types and interfaces

export type TemplateFieldType = 'text' | 'number' | 'date' | 'boolean' | 'image' | 'table' | 'gst_breakdown';

export type PageSize = 'A4' | 'A5' | 'Letter' | 'Legal';

export type PageOrientation = 'portrait' | 'landscape';

export type LogoPosition = 'left' | 'center' | 'right';

export interface TemplateValidationRule {
  field: string;
  rule: 'required' | 'min_length' | 'max_length' | 'pattern' | 'custom';
  value?: any;
  message: string;
}

export interface TemplatePreviewData {
  order: import('./shopify').ShopifyOrder;
  gstBreakdown: import('./shopify').GSTBreakdown;
  businessInfo: import('./shopify').BusinessInfo;
}

export interface TemplateRenderOptions {
  templateId: string;
  data: TemplatePreviewData;
  format: 'html' | 'pdf';
  quality?: 'low' | 'medium' | 'high';
}

export interface TemplateExportOptions {
  includeImages: boolean;
  includeStyles: boolean;
  minify: boolean;
}

export interface TemplateImportResult {
  success: boolean;
  template?: import('./shopify').Template;
  errors: string[];
  warnings: string[];
}

export interface TemplateUsageStats {
  templateId: string;
  usageCount: number;
  lastUsed: string;
  averageRenderTime: number;
  errorRate: number;
}

// Default template configurations
export interface DefaultTemplateConfig {
  name: string;
  description: string;
  layout: import('./shopify').TemplateLayout;
  fields: import('./shopify').TemplateField[];
  validationRules: TemplateValidationRule[];
}

export type TemplateCategory = 'invoice' | 'receipt' | 'packing_slip' | 'tax_invoice' | 'custom';

export interface TemplateMetadata {
  category: TemplateCategory;
  tags: string[];
  description: string;
  version: string;
  author: string;
  compatibility: string[];
}