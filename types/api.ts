// API-specific types and interfaces

export interface PaginationParams {
  limit?: number;
  cursor?: string;
  direction?: 'forward' | 'backward';
}

export interface FilterParams {
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  customerId?: string;
  search?: string;
}

export interface SortParams {
  field: string;
  direction: 'asc' | 'desc';
}

export interface QueryParams extends PaginationParams, FilterParams {
  sort?: SortParams;
}

// API endpoint response types
export interface OrdersListResponse {
  orders: import('./shopify').OrderWithGST[];
  pagination: import('./shopify').PaginationInfo;
  totalCount: number;
  filters: FilterParams;
}

export interface TemplatesListResponse {
  templates: import('./shopify').Template[];
  totalCount: number;
}

export interface BulkPrintResponse {
  jobId: string;
  status: 'queued' | 'processing';
  estimatedTime?: number;
}

export interface JobStatusResponse {
  job: import('./shopify').BulkPrintJob;
}

// Request body types
export interface CreateTemplateRequest {
  name: string;
  layout: import('./shopify').TemplateLayout;
  businessInfo: import('./shopify').BusinessInfo;
  fields: import('./shopify').TemplateField[];
  isDefault?: boolean;
}

export interface UpdateTemplateRequest extends Partial<CreateTemplateRequest> {
  id: string;
}

// BulkPrintRequest is defined in shopify.ts to avoid duplication

export interface UpdateSettingsRequest {
  gstConfiguration?: Partial<import('./shopify').GSTConfiguration>;
  businessInfo?: Partial<import('./shopify').BusinessInfo>;
  preferences?: Partial<import('./shopify').AppSettings['preferences']>;
}

// Webhook types
export interface WebhookVerification {
  isValid: boolean;
  shop: string;
  topic: string;
}

export interface WebhookHandler<T = any> {
  topic: string;
  handler: (payload: T, shop: string) => Promise<void>;
}

// Error types
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: ValidationError[];
  };
  timestamp: string;
  path: string;
}

// Rate limiting types
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

export interface RateLimitedResponse<T> {
  data: T;
  rateLimit: RateLimitInfo;
}

// File handling types
export interface FileDownloadResponse {
  filename: string;
  contentType: string;
  size: number;
  downloadUrl: string;
  expiresAt: string;
}

export interface FileUploadResponse {
  fileId: string;
  filename: string;
  size: number;
  url: string;
}

// Health check types
export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    database: 'up' | 'down';
    shopify: 'up' | 'down';
    storage: 'up' | 'down';
  };
  version: string;
}