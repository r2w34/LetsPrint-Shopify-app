// Main types export file for the Shopify Order Printer app

// Core Shopify types
export * from './shopify';

// GST-specific types
export * from './gst';

// Template types
export * from './templates';

// API types
export * from './api';

// Utility types
export * from './utils';

// Constants
export * from './constants';

// Validation utilities
export * from './validation';

// Re-export commonly used types with aliases for convenience
export type {
  ShopifyOrder,
  OrderWithGST,
  GSTBreakdown,
  Template,
  BusinessInfo,
  AppSettings,
  BulkPrintJob,
  GraphQLResponse,
  ApiResponse
} from './shopify';

export type {
  GSTCalculationResult,
  GSTType,
  GSTRate
} from './gst';

export type {
  TemplateFieldType,
  PageSize,
  PageOrientation,
  TemplateCategory
} from './templates';

export type {
  QueryParams,
  ApiErrorResponse,
  ValidationError
} from './api';