// Constants for GST calculations and Indian compliance

export const GST_RATES = {
  LOW_RATE: 0.05, // 5% for orders < ₹1000
  HIGH_RATE: 0.12, // 12% for orders >= ₹1000
  THRESHOLD: 1000, // ₹1000 threshold
} as const;

export const GST_TYPES = {
  CGST_SGST: 'CGST_SGST',
  IGST: 'IGST',
} as const;

export const INDIAN_STATES = {
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
  'TS': { name: 'Telangana', code: 'TS', gstCode: '36' },
  'TR': { name: 'Tripura', code: 'TR', gstCode: '16' },
  'UP': { name: 'Uttar Pradesh', code: 'UP', gstCode: '09' },
  'UK': { name: 'Uttarakhand', code: 'UK', gstCode: '05' },
  'WB': { name: 'West Bengal', code: 'WB', gstCode: '19' },
} as const;

export const HSN_CODES = {
  TEXTILES: {
    COTTON_TSHIRTS: '6109.10.00',
    POLYESTER_TSHIRTS: '6109.90.10',
    BLEND_TSHIRTS: '6109.90.90',
    COTTON_FABRIC: '5208.00.00',
    POLYESTER_FABRIC: '5407.00.00',
    KNITTED_FABRIC: '6002.00.00',
  },
  APPAREL: {
    MENS_SHIRTS: '6205.00.00',
    WOMENS_SHIRTS: '6206.00.00',
    TROUSERS: '6203.00.00',
    DRESSES: '6204.00.00',
  },
} as const;

export const TEMPLATE_DEFAULTS = {
  PAGE_SIZE: 'A4',
  ORIENTATION: 'portrait',
  MARGINS: {
    top: 20,
    right: 20,
    bottom: 20,
    left: 20,
  },
  FONTS: {
    primary: 'Arial, sans-serif',
    secondary: 'Times New Roman, serif',
    size: {
      header: 16,
      body: 12,
      footer: 10,
    },
  },
  COLORS: {
    primary: '#000000',
    secondary: '#666666',
    text: '#333333',
    background: '#ffffff',
  },
} as const;

export const API_LIMITS = {
  MAX_ORDERS_PER_REQUEST: 250,
  MAX_BULK_PRINT_ORDERS: 1000,
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_TEMPLATE_SIZE: 1024 * 1024, // 1MB
  RATE_LIMIT_REQUESTS: 100,
  RATE_LIMIT_WINDOW: 60 * 1000, // 1 minute
} as const;

export const SHOPIFY_SCOPES = [
  'read_orders',
  'read_products',
  'read_customers',
  'read_inventory',
  'write_files',
  'read_shop_data',
  'write_metafields',
  'read_metafields',
] as const;

export const WEBHOOK_TOPICS = [
  'orders/create',
  'orders/updated',
  'orders/paid',
  'orders/cancelled',
  'app/uninstalled',
] as const;

export const FILE_TYPES = {
  PDF: 'application/pdf',
  CSV: 'text/csv',
  PNG: 'image/png',
  JPEG: 'image/jpeg',
  SVG: 'image/svg+xml',
} as const;

export const DATE_FORMATS = {
  ISO: 'YYYY-MM-DD',
  INDIAN: 'DD/MM/YYYY',
  US: 'MM/DD/YYYY',
  DISPLAY: 'DD MMM YYYY',
  TIMESTAMP: 'YYYY-MM-DD HH:mm:ss',
} as const;

export const CURRENCIES = {
  INR: {
    code: 'INR',
    symbol: '₹',
    name: 'Indian Rupee',
    decimals: 2,
  },
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    decimals: 2,
  },
} as const;

export const ERROR_CODES = {
  // Authentication errors
  AUTH_INVALID_TOKEN: 'AUTH_INVALID_TOKEN',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_INSUFFICIENT_SCOPE: 'AUTH_INSUFFICIENT_SCOPE',
  
  // Validation errors
  VALIDATION_REQUIRED_FIELD: 'VALIDATION_REQUIRED_FIELD',
  VALIDATION_INVALID_FORMAT: 'VALIDATION_INVALID_FORMAT',
  VALIDATION_OUT_OF_RANGE: 'VALIDATION_OUT_OF_RANGE',
  
  // GST calculation errors
  GST_INVALID_STATE: 'GST_INVALID_STATE',
  GST_MISSING_ADDRESS: 'GST_MISSING_ADDRESS',
  GST_CALCULATION_FAILED: 'GST_CALCULATION_FAILED',
  
  // Template errors
  TEMPLATE_NOT_FOUND: 'TEMPLATE_NOT_FOUND',
  TEMPLATE_RENDER_FAILED: 'TEMPLATE_RENDER_FAILED',
  TEMPLATE_INVALID_FORMAT: 'TEMPLATE_INVALID_FORMAT',
  
  // File errors
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  FILE_INVALID_TYPE: 'FILE_INVALID_TYPE',
  FILE_UPLOAD_FAILED: 'FILE_UPLOAD_FAILED',
  
  // API errors
  API_RATE_LIMITED: 'API_RATE_LIMITED',
  API_SHOPIFY_ERROR: 'API_SHOPIFY_ERROR',
  API_INTERNAL_ERROR: 'API_INTERNAL_ERROR',
} as const;