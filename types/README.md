# Shopify Order Printer - Type Definitions

This directory contains comprehensive TypeScript type definitions for the Shopify Order Printer app, specifically designed for Indian T-shirt stores with GST compliance.

## File Structure

### Core Type Files

- **`shopify.ts`** - Main Shopify-specific types including orders, customers, products, and app-specific extensions
- **`gst.ts`** - GST-specific types for Indian tax compliance calculations
- **`templates.ts`** - Template management and rendering types
- **`api.ts`** - API request/response types and interfaces
- **`utils.ts`** - Utility types and generic type helpers
- **`constants.ts`** - Type-safe constants for GST rates, state codes, HSN codes, etc.
- **`validation.ts`** - Zod schemas and validation utilities
- **`index.ts`** - Main export file for all types

## Key Features

### 1. Shopify Order Data Structure
- Complete TypeScript interfaces for Shopify REST API order objects
- Extended order types with GST breakdown integration
- Customer, address, and line item type definitions
- GraphQL response wrapper types

### 2. GST-Specific Types for Indian Tax Compliance
- `GSTBreakdown` interface for tax calculations
- `GSTConfiguration` for app settings
- Support for CGST/SGST vs IGST calculations
- HSN code integration for textile products
- Indian state mapping with GST codes

### 3. Template and App Settings Interfaces
- Comprehensive template layout and field definitions
- Business information types with Indian compliance fields
- App settings with GST configuration
- Template validation and rendering types

### 4. Utility Types for GraphQL Responses and Metafield Data
- Generic GraphQL response wrappers
- Shopify metafield types and input interfaces
- Pagination and API response utilities
- Error handling and validation types

## Usage Examples

### Importing Types
```typescript
// Import all types
import * from '@/types';

// Import specific types
import { ShopifyOrder, GSTBreakdown, Template } from '@/types';

// Import constants
import { GST_RATES, INDIAN_STATES } from '@/types';
```

### Using GST Types
```typescript
import { GSTBreakdown, GSTCalculationInput } from '@/types';

const calculateGST = (input: GSTCalculationInput): GSTBreakdown => {
  // Implementation
};
```

### Using Template Types
```typescript
import { Template, TemplateLayout } from '@/types';

const createTemplate = (layout: TemplateLayout): Template => {
  // Implementation
};
```

### Using Validation
```typescript
import { validateGSTIN, BusinessInfoSchema } from '@/types';

const isValidGSTIN = validateGSTIN('22AAAAA0000A1Z5');
const businessInfo = BusinessInfoSchema.parse(data);
```

## Type Safety Features

### 1. Strict GST Validation
- GSTIN format validation with regex
- Indian state code validation
- HSN code format checking
- Tax rate validation

### 2. Template Validation
- Zod schemas for runtime validation
- Type guards for safe type checking
- Comprehensive field validation

### 3. API Response Types
- Strongly typed GraphQL responses
- Error handling with specific error codes
- Pagination and filtering types

## Constants and Enums

### GST Constants
- `GST_RATES`: Tax rates (5% and 12%)
- `GST_TYPES`: CGST_SGST and IGST
- `INDIAN_STATES`: Complete state mapping with GST codes

### HSN Codes
- `HSN_CODES`: Textile-specific HSN codes
- Product type mappings for T-shirts

### API Limits
- Request limits and rate limiting constants
- File size and upload restrictions

## Validation Utilities

### Built-in Validators
- `validateGSTIN()`: GSTIN format validation
- `validatePincode()`: Indian pincode validation
- `validateIFSC()`: Bank IFSC code validation
- `validateIndianState()`: State code validation

### Zod Schemas
- `GSTBreakdownSchema`: GST calculation validation
- `BusinessInfoSchema`: Business information validation
- `TemplateSchema`: Template structure validation
- `AppSettingsSchema`: App configuration validation

## Requirements Compliance

This type system addresses the following requirements:

- **Requirement 3.5**: GST breakdown types and calculations
- **Requirement 5.4**: Indian business compliance types
- **Requirement 6.6**: Shopify app data storage types

The types support:
- ✅ Shopify order data structure
- ✅ GST-specific types for Indian tax compliance
- ✅ Template and app settings interfaces
- ✅ Utility types for GraphQL responses and metafield data
- ✅ Comprehensive validation and type safety
- ✅ Indian T-shirt store specific requirements
- ✅ HSN code integration
- ✅ State-based GST calculations