import type { ShopifyOrder, LineItem, Customer, Address } from '../../types/shopify'

/**
 * Utility functions for order data processing and transformation
 */

/**
 * Transform GraphQL order response to our internal order format
 */
export function transformGraphQLOrder(graphqlOrder: any): ShopifyOrder {
  return {
    id: graphqlOrder.id,
    admin_graphql_api_id: graphqlOrder.id,
    app_id: null,
    browser_ip: null,
    buyer_accepts_marketing: graphqlOrder.customer?.acceptsMarketing || false,
    cancel_reason: null,
    cancelled_at: graphqlOrder.cancelledAt,
    cart_token: null,
    checkout_id: null,
    checkout_token: null,
    client_details: null,
    closed_at: graphqlOrder.closedAt,
    confirmed: true,
    contact_email: graphqlOrder.email,
    created_at: graphqlOrder.createdAt,
    currency: graphqlOrder.currencyCode,
    current_subtotal_price: graphqlOrder.subtotalPriceSet?.shopMoney?.amount || '0',
    current_subtotal_price_set: transformPriceSet(graphqlOrder.subtotalPriceSet),
    current_total_discounts: graphqlOrder.totalDiscountsSet?.shopMoney?.amount || '0',
    current_total_discounts_set: transformPriceSet(graphqlOrder.totalDiscountsSet),
    current_total_duties_set: null,
    current_total_price: graphqlOrder.totalPriceSet?.shopMoney?.amount || '0',
    current_total_price_set: transformPriceSet(graphqlOrder.totalPriceSet),
    current_total_tax: graphqlOrder.totalTaxSet?.shopMoney?.amount || '0',
    current_total_tax_set: transformPriceSet(graphqlOrder.totalTaxSet),
    customer_locale: null,
    device_id: null,
    discount_codes: [],
    email: graphqlOrder.email,
    estimated_taxes: false,
    financial_status: graphqlOrder.financialStatus?.toLowerCase() || 'pending',
    fulfillment_status: graphqlOrder.fulfillmentStatus?.toLowerCase() || null,
    gateway: '',
    landing_site: null,
    landing_site_ref: null,
    location_id: null,
    name: graphqlOrder.name,
    note: graphqlOrder.note,
    note_attributes: [],
    number: parseInt(graphqlOrder.orderNumber) || 0,
    order_number: parseInt(graphqlOrder.orderNumber) || 0,
    order_status_url: '',
    original_total_duties_set: null,
    payment_gateway_names: [],
    phone: graphqlOrder.phone,
    presentment_currency: graphqlOrder.currencyCode,
    processed_at: graphqlOrder.processedAt,
    processing_method: 'direct',
    reference: null,
    referring_site: null,
    source_identifier: null,
    source_name: 'web',
    source_url: null,
    subtotal_price: graphqlOrder.subtotalPriceSet?.shopMoney?.amount || '0',
    subtotal_price_set: transformPriceSet(graphqlOrder.subtotalPriceSet),
    tags: graphqlOrder.tags || '',
    tax_lines: transformTaxLines(graphqlOrder.taxLines || []),
    taxes_included: false,
    test: false,
    token: '',
    total_discounts: graphqlOrder.totalDiscountsSet?.shopMoney?.amount || '0',
    total_discounts_set: transformPriceSet(graphqlOrder.totalDiscountsSet),
    total_line_items_price: graphqlOrder.subtotalPriceSet?.shopMoney?.amount || '0',
    total_line_items_price_set: transformPriceSet(graphqlOrder.subtotalPriceSet),
    total_outstanding: '0',
    total_price: graphqlOrder.totalPriceSet?.shopMoney?.amount || '0',
    total_price_set: transformPriceSet(graphqlOrder.totalPriceSet),
    total_price_usd: graphqlOrder.totalPriceSet?.shopMoney?.amount || '0',
    total_shipping_price_set: transformPriceSet(null),
    total_tax: graphqlOrder.totalTaxSet?.shopMoney?.amount || '0',
    total_tax_set: transformPriceSet(graphqlOrder.totalTaxSet),
    total_tip_received: '0',
    total_weight: 0,
    updated_at: graphqlOrder.updatedAt,
    user_id: null,
    billing_address: transformAddress(graphqlOrder.billingAddress),
    customer: transformCustomer(graphqlOrder.customer),
    discount_applications: [],
    fulfillments: [],
    line_items: transformLineItems(graphqlOrder.lineItems?.edges || []),
    payment_terms: null,
    refunds: [],
    shipping_address: transformAddress(graphqlOrder.shippingAddress),
    shipping_lines: []
  }
}

/**
 * Transform GraphQL price set to our format
 */
function transformPriceSet(priceSet: any): any {
  if (!priceSet) {
    return {
      shop_money: { amount: '0', currency_code: 'INR' },
      presentment_money: { amount: '0', currency_code: 'INR' }
    }
  }

  return {
    shop_money: {
      amount: priceSet.shopMoney?.amount || '0',
      currency_code: priceSet.shopMoney?.currencyCode || 'INR'
    },
    presentment_money: {
      amount: priceSet.presentmentMoney?.amount || '0',
      currency_code: priceSet.presentmentMoney?.currencyCode || 'INR'
    }
  }
}

/**
 * Transform GraphQL customer to our format
 */
function transformCustomer(customer: any): Customer | null {
  if (!customer) return null

  return {
    id: parseInt(customer.id.replace('gid://shopify/Customer/', '')) || 0,
    email: customer.email,
    accepts_marketing: customer.acceptsMarketing || false,
    created_at: customer.createdAt,
    updated_at: customer.updatedAt,
    first_name: customer.firstName || '',
    last_name: customer.lastName || '',
    orders_count: customer.ordersCount || 0,
    state: 'enabled',
    total_spent: customer.totalSpent || '0',
    last_order_id: null,
    note: null,
    verified_email: true,
    multipass_identifier: null,
    tax_exempt: false,
    phone: customer.phone,
    tags: customer.tags || '',
    last_order_name: null,
    currency: 'INR',
    accepts_marketing_updated_at: customer.updatedAt,
    marketing_opt_in_level: null,
    tax_exemptions: [],
    admin_graphql_api_id: customer.id,
    default_address: transformAddress(customer.defaultAddress)
  }
}

/**
 * Transform GraphQL address to our format
 */
function transformAddress(address: any): Address | null {
  if (!address) return null

  return {
    id: address.id ? parseInt(address.id.replace('gid://shopify/MailingAddress/', '')) : undefined,
    first_name: address.firstName,
    last_name: address.lastName,
    company: address.company,
    address1: address.address1,
    address2: address.address2,
    city: address.city,
    province: address.province,
    country: address.country,
    zip: address.zip,
    phone: address.phone,
    name: `${address.firstName || ''} ${address.lastName || ''}`.trim() || null,
    province_code: address.provinceCode,
    country_code: address.countryCode,
    country_name: address.country,
    default: false
  }
}

/**
 * Transform GraphQL line items to our format
 */
function transformLineItems(lineItemEdges: any[]): LineItem[] {
  return lineItemEdges.map(edge => {
    const item = edge.node
    return {
      id: parseInt(item.id.replace('gid://shopify/LineItem/', '')) || 0,
      admin_graphql_api_id: item.id,
      fulfillable_quantity: item.fulfillableQuantity || 0,
      fulfillment_service: 'manual',
      fulfillment_status: item.fulfillmentStatus?.toLowerCase() || null,
      gift_card: item.giftCard || false,
      grams: 0,
      name: item.name,
      origin_location: null,
      price: item.discountedUnitPriceSet?.shopMoney?.amount || '0',
      price_set: transformPriceSet(item.discountedUnitPriceSet),
      product_exists: !!item.product,
      product_id: item.productId ? parseInt(item.productId.replace('gid://shopify/Product/', '')) : null,
      properties: transformCustomAttributes(item.customAttributes || []),
      quantity: item.quantity,
      requires_shipping: item.requiresShipping || false,
      sku: item.sku,
      taxable: item.taxable || false,
      title: item.title,
      total_discount: '0',
      total_discount_set: transformPriceSet(null),
      variant_id: item.variantId ? parseInt(item.variantId.replace('gid://shopify/ProductVariant/', '')) : null,
      variant_inventory_management: null,
      variant_title: item.variantTitle,
      vendor: item.vendor,
      tax_lines: [],
      duties: [],
      discount_allocations: []
    }
  })
}

/**
 * Transform custom attributes to properties
 */
function transformCustomAttributes(attributes: any[]): any[] {
  return attributes.map(attr => ({
    name: attr.key,
    value: attr.value
  }))
}

/**
 * Transform GraphQL tax lines to our format
 */
function transformTaxLines(taxLines: any[]): any[] {
  return taxLines.map(taxLine => ({
    channel_liable: null,
    price: taxLine.priceSet?.shopMoney?.amount || '0',
    price_set: transformPriceSet(taxLine.priceSet),
    rate: taxLine.rate || 0,
    title: taxLine.title
  }))
}

/**
 * Extract T-shirt specific details from line items
 */
export function extractTShirtDetails(lineItem: LineItem): {
  size?: string
  color?: string
  design?: string
  material?: string
  hsnCode?: string
} {
  const details: any = {}
  
  // Extract from properties
  lineItem.properties?.forEach(prop => {
    const key = prop.name.toLowerCase()
    if (key.includes('size')) {
      details.size = prop.value
    } else if (key.includes('color') || key.includes('colour')) {
      details.color = prop.value
    } else if (key.includes('design') || key.includes('print')) {
      details.design = prop.value
    } else if (key.includes('material') || key.includes('fabric')) {
      details.material = prop.value
    } else if (key.includes('hsn') || key.includes('harmonized')) {
      details.hsnCode = prop.value
    }
  })

  // Extract from variant title if available
  if (lineItem.variant_title) {
    const variantParts = lineItem.variant_title.split(' / ')
    variantParts.forEach(part => {
      const trimmed = part.trim()
      // Common size patterns
      if (/^(XS|S|M|L|XL|XXL|XXXL|\d+)$/i.test(trimmed)) {
        details.size = trimmed
      }
      // Common color patterns (basic colors)
      else if (/^(black|white|red|blue|green|yellow|pink|purple|orange|gray|grey|brown)$/i.test(trimmed)) {
        details.color = trimmed
      }
    })
  }

  // Add HSN code if not found in properties
  if (!details.hsnCode) {
    details.hsnCode = getHSNCode(lineItem)
  }

  return details
}

/**
 * Filter orders by date range
 */
export function filterOrdersByDateRange(
  orders: ShopifyOrder[],
  dateFrom: Date,
  dateTo: Date
): ShopifyOrder[] {
  return orders.filter(order => {
    const orderDate = new Date(order.created_at)
    return orderDate >= dateFrom && orderDate <= dateTo
  })
}

/**
 * Filter orders by status
 */
export function filterOrdersByStatus(
  orders: ShopifyOrder[],
  status: 'open' | 'closed' | 'cancelled'
): ShopifyOrder[] {
  return orders.filter(order => {
    switch (status) {
      case 'open':
        return !order.closed_at && !order.cancelled_at
      case 'closed':
        return !!order.closed_at
      case 'cancelled':
        return !!order.cancelled_at
      default:
        return true
    }
  })
}

/**
 * Filter orders by financial status
 */
export function filterOrdersByFinancialStatus(
  orders: ShopifyOrder[],
  financialStatus: string
): ShopifyOrder[] {
  return orders.filter(order => order.financial_status === financialStatus)
}

/**
 * Sort orders by date
 */
export function sortOrdersByDate(
  orders: ShopifyOrder[],
  direction: 'asc' | 'desc' = 'desc'
): ShopifyOrder[] {
  return [...orders].sort((a, b) => {
    const dateA = new Date(a.created_at).getTime()
    const dateB = new Date(b.created_at).getTime()
    return direction === 'desc' ? dateB - dateA : dateA - dateB
  })
}

/**
 * Get order total in number format
 */
export function getOrderTotal(order: ShopifyOrder): number {
  return parseFloat(order.total_price) || 0
}

/**
 * Get order subtotal in number format
 */
export function getOrderSubtotal(order: ShopifyOrder): number {
  return parseFloat(order.subtotal_price) || 0
}

/**
 * Get customer full name
 */
export function getCustomerFullName(customer: Customer | null): string {
  if (!customer) return 'Guest'
  return `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Unknown Customer'
}

/**
 * Format address as string
 */
export function formatAddress(address: Address | null): string {
  if (!address) return ''
  
  const parts = [
    address.address1,
    address.address2,
    address.city,
    address.province,
    address.zip,
    address.country
  ].filter(Boolean)
  
  return parts.join(', ')
}

/**
 * Get HSN code from product metafields or default for textiles
 */
export function getHSNCode(lineItem: LineItem): string {
  // Check if HSN code is stored in product properties
  const hsnProperty = lineItem.properties?.find(prop => 
    prop.name.toLowerCase().includes('hsn') || 
    prop.name.toLowerCase().includes('harmonized')
  )
  
  if (hsnProperty) {
    return hsnProperty.value
  }
  
  // Default HSN code for textile products (T-shirts)
  return '6109' // HSN code for T-shirts, singlets and other vests, knitted or crocheted
}

/**
 * Format currency amount with Indian Rupee symbol
 */
export function formatCurrency(amount: number, currency: string = 'INR'): string {
  if (currency === 'INR') {
    return `₹${amount.toFixed(2)}`
  }
  
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

/**
 * Format date in various formats
 */
export function formatDate(dateString: string, format: string = 'DD/MM/YYYY'): string {
  const date = new Date(dateString)
  
  if (isNaN(date.getTime())) {
    return 'Invalid Date'
  }
  
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  
  switch (format) {
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`
    case 'MM/DD/YYYY':
      return `${month}/${day}/${year}`
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`
    case 'DD MMM YYYY':
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                         'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      return `${day} ${monthNames[date.getMonth()]} ${year}`
    case 'DD/MM/YYYY HH:mm':
      return `${day}/${month}/${year} ${hours}:${minutes}`
    default:
      return `${day}/${month}/${year}`
  }
}

/**
 * Generate filename for PDF with timestamp
 */
export function generatePDFFilename(prefix: string, orderId?: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
  const orderPart = orderId ? `_${orderId}` : ''
  return `${prefix}${orderPart}_${timestamp}.pdf`
}

/**
 * Validate order data for PDF generation
 */
export function validateOrderForPDF(order: ShopifyOrder): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!order.id) {
    errors.push('Order ID is required')
  }
  
  if (!order.order_number) {
    errors.push('Order number is required')
  }
  
  if (!order.created_at) {
    errors.push('Order creation date is required')
  }
  
  if (!order.line_items || order.line_items.length === 0) {
    errors.push('Order must have at least one line item')
  }
  
  if (!order.total_price || parseFloat(order.total_price) <= 0) {
    errors.push('Order total must be greater than 0')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}