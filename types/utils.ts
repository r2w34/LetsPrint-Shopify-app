// Utility types for the Shopify Order Printer app

// Generic utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

// Date utility types
export type DateString = string; // ISO 8601 date string
export type TimestampString = string; // ISO 8601 timestamp string

// Currency utility types
export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP';
export type MoneyAmount = string; // Decimal string representation

// ID utility types
export type ShopifyID = string; // Shopify GraphQL ID
export type NumericID = number; // Shopify REST API ID
export type UUID = string; // App-generated UUID

// Status utility types
export type OrderStatus = 'pending' | 'authorized' | 'partially_paid' | 'paid' | 'partially_refunded' | 'refunded' | 'voided';
export type FulfillmentStatus = 'fulfilled' | 'null' | 'partial' | 'restocked';
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

// File utility types
export type MimeType = 'application/pdf' | 'text/csv' | 'image/png' | 'image/jpeg' | 'image/svg+xml';
export type FileExtension = '.pdf' | '.csv' | '.png' | '.jpg' | '.jpeg' | '.svg';

// Validation utility types
export type ValidationResult<T> = {
  isValid: true;
  data: T;
} | {
  isValid: false;
  errors: string[];
};

// Environment utility types
export type Environment = 'development' | 'staging' | 'production';

// Feature flag utility types
export type FeatureFlag = {
  [key: string]: boolean;
};

// Configuration utility types
export type AppConfig = {
  environment: Environment;
  shopify: {
    apiVersion: string;
    scopes: string[];
    webhooks: string[];
  };
  database: {
    url: string;
    maxConnections: number;
  };
  features: FeatureFlag;
};

// Event utility types
export type EventType = 'order.created' | 'order.updated' | 'template.created' | 'template.updated' | 'job.completed' | 'job.failed';

export type EventPayload<T = any> = {
  type: EventType;
  timestamp: TimestampString;
  data: T;
  metadata?: Record<string, any>;
};

// Cache utility types
export type CacheKey = string;
export type CacheTTL = number; // Time to live in seconds

export type CacheEntry<T> = {
  key: CacheKey;
  value: T;
  expiresAt: number;
  createdAt: number;
};

// Logging utility types
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogEntry = {
  level: LogLevel;
  message: string;
  timestamp: TimestampString;
  context?: Record<string, any>;
  error?: Error;
};

// Metrics utility types
export type MetricType = 'counter' | 'gauge' | 'histogram' | 'timer';

export type Metric = {
  name: string;
  type: MetricType;
  value: number;
  tags?: Record<string, string>;
  timestamp: TimestampString;
};

// Search utility types
export type SearchQuery = {
  term: string;
  filters?: Record<string, any>;
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  pagination?: {
    page: number;
    limit: number;
  };
};

export type SearchResult<T> = {
  items: T[];
  totalCount: number;
  page: number;
  limit: number;
  hasMore: boolean;
};

// Audit utility types
export type AuditAction = 'create' | 'update' | 'delete' | 'view' | 'export';

export type AuditLog = {
  id: UUID;
  action: AuditAction;
  resource: string;
  resourceId: string;
  userId?: string;
  userEmail?: string;
  timestamp: TimestampString;
  changes?: Record<string, any>;
  metadata?: Record<string, any>;
};

// Permission utility types
export type Permission = 'read' | 'write' | 'delete' | 'admin';

export type ResourcePermission = {
  resource: string;
  permissions: Permission[];
};

// Notification utility types
export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export type Notification = {
  id: UUID;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: TimestampString;
  read: boolean;
  actions?: Array<{
    label: string;
    action: string;
  }>;
};