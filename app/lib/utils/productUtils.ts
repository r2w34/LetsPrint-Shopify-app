import { LineItem } from '@/types/shopify'

export interface TShirtDetails {
  size?: string
  color?: string
  design?: string
  material?: string
  fit?: string
  sleeve?: string
  neckline?: string
  brand?: string
  collection?: string
}

/**
 * Extract T-shirt specific details from a Shopify line item
 */
export function extractTShirtDetails(lineItem: LineItem): TShirtDetails {
  const details: TShirtDetails = {}
  
  // Check variant title for size/color/style info
  if (lineItem.variant_title) {
    const variants = lineItem.variant_title.split(' / ')
    variants.forEach(variant => {
      const trimmed = variant.trim()
      
      // T-shirt size patterns (including Indian sizes)
      if (/^(XS|S|M|L|XL|XXL|XXXL|28|30|32|34|36|38|40|42|44|46|48|50)$/i.test(trimmed)) {
        details.size = trimmed.toUpperCase()
      }
      // Color patterns
      else if (/^(black|white|red|blue|green|yellow|pink|purple|orange|gray|grey|brown|navy|maroon|olive|beige|cream|gold|silver|cyan|magenta|lime|indigo|violet|turquoise|coral|salmon|khaki|tan|burgundy|teal|mint)$/i.test(trimmed)) {
        details.color = trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase()
      }
      // Fit patterns
      else if (/^(slim|regular|loose|oversized|fitted|relaxed|athletic|classic)$/i.test(trimmed)) {
        details.fit = trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase()
      }
      // Sleeve patterns
      else if (/^(short|long|sleeveless|half|full|3\/4|quarter).*sleeve/i.test(trimmed)) {
        details.sleeve = trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase()
      }
      // Neckline patterns
      else if (/^(round|v-neck|crew|collar|polo|henley|scoop|boat).*neck/i.test(trimmed) || /^(round|v|crew|collar|polo|henley|scoop|boat)$/i.test(trimmed)) {
        details.neckline = trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase()
      }
      else {
        // If it doesn't match specific patterns, it might be a design or collection name
        if (!details.design) {
          details.design = trimmed
        }
      }
    })
  }

  // Check properties for additional details
  lineItem.properties?.forEach(prop => {
    const key = prop.name.toLowerCase()
    const value = prop.value

    if (key.includes('size')) {
      details.size = value.toUpperCase()
    } else if (key.includes('color') || key.includes('colour')) {
      details.color = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
    } else if (key.includes('design') || key.includes('print') || key.includes('pattern')) {
      details.design = value
    } else if (key.includes('material') || key.includes('fabric')) {
      details.material = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
    } else if (key.includes('fit') || key.includes('style')) {
      details.fit = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
    } else if (key.includes('sleeve')) {
      details.sleeve = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
    } else if (key.includes('neck') || key.includes('collar')) {
      details.neckline = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
    } else if (key.includes('brand')) {
      details.brand = value
    } else if (key.includes('collection') || key.includes('series')) {
      details.collection = value
    }
  })

  // Extract material from product title if not found in properties
  if (!details.material && lineItem.title) {
    const title = lineItem.title.toLowerCase()
    if (title.includes('cotton')) {
      details.material = 'Cotton'
    } else if (title.includes('polyester')) {
      details.material = 'Polyester'
    } else if (title.includes('blend')) {
      details.material = 'Blend'
    } else if (title.includes('linen')) {
      details.material = 'Linen'
    } else if (title.includes('silk')) {
      details.material = 'Silk'
    } else if (title.includes('wool')) {
      details.material = 'Wool'
    } else if (title.includes('bamboo')) {
      details.material = 'Bamboo'
    } else if (title.includes('modal')) {
      details.material = 'Modal'
    }
  }

  // Extract design/print information from title
  if (!details.design && lineItem.title) {
    const title = lineItem.title.toLowerCase()
    if (title.includes('printed')) {
      details.design = 'Printed'
    } else if (title.includes('plain') || title.includes('solid')) {
      details.design = 'Plain'
    } else if (title.includes('striped')) {
      details.design = 'Striped'
    } else if (title.includes('graphic')) {
      details.design = 'Graphic'
    } else if (title.includes('logo')) {
      details.design = 'Logo'
    }
  }

  return details
}

/**
 * Format T-shirt details for display
 */
export function formatTShirtDetails(details: TShirtDetails): string[] {
  const formatted: string[] = []

  if (details.size) {
    formatted.push(`Size: ${details.size}`)
  }
  if (details.color) {
    formatted.push(`Color: ${details.color}`)
  }
  if (details.material) {
    formatted.push(`Material: ${details.material}`)
  }
  if (details.fit) {
    formatted.push(`Fit: ${details.fit}`)
  }
  if (details.sleeve) {
    formatted.push(`Sleeve: ${details.sleeve}`)
  }
  if (details.neckline) {
    formatted.push(`Neckline: ${details.neckline}`)
  }
  if (details.design) {
    formatted.push(`Design: ${details.design}`)
  }
  if (details.brand) {
    formatted.push(`Brand: ${details.brand}`)
  }
  if (details.collection) {
    formatted.push(`Collection: ${details.collection}`)
  }

  return formatted
}

/**
 * Get HSN code for textile products based on material
 */
export function getTextileHSNCode(material?: string): string {
  if (!material) return '6109' // Default for T-shirts

  const materialLower = material.toLowerCase()
  
  if (materialLower.includes('cotton')) {
    return '6109' // Cotton T-shirts
  } else if (materialLower.includes('polyester')) {
    return '6110' // Synthetic fiber T-shirts
  } else if (materialLower.includes('blend') || materialLower.includes('mix')) {
    return '6109' // Mixed fiber T-shirts (usually cotton blend)
  } else if (materialLower.includes('wool')) {
    return '6110' // Wool T-shirts
  } else if (materialLower.includes('silk')) {
    return '6106' // Silk T-shirts
  } else if (materialLower.includes('linen')) {
    return '6205' // Linen shirts
  }

  return '6109' // Default for T-shirts
}

/**
 * Determine if a product is likely a T-shirt based on title and properties
 */
export function isTShirtProduct(lineItem: LineItem): boolean {
  const title = lineItem.title.toLowerCase()
  const productType = lineItem.name?.toLowerCase() || ''

  // Check for T-shirt keywords
  const tshirtKeywords = [
    't-shirt', 'tshirt', 't shirt', 'tee', 'top', 'shirt'
  ]

  const excludeKeywords = [
    'dress', 'pants', 'jeans', 'shorts', 'skirt', 'jacket', 'hoodie', 'sweater'
  ]

  // Check if title contains T-shirt keywords
  const hasTShirtKeyword = tshirtKeywords.some(keyword => 
    title.includes(keyword) || productType.includes(keyword)
  )

  // Check if title contains excluding keywords
  const hasExcludeKeyword = excludeKeywords.some(keyword => 
    title.includes(keyword) || productType.includes(keyword)
  )

  return hasTShirtKeyword && !hasExcludeKeyword
}

/**
 * Get product category for GST calculation
 */
export function getProductCategory(lineItem: LineItem): 'textiles' | 'apparel' | 'other' {
  if (isTShirtProduct(lineItem)) {
    return 'textiles'
  }

  const title = lineItem.title.toLowerCase()
  const apparelKeywords = [
    'clothing', 'apparel', 'garment', 'wear', 'dress', 'pants', 'jeans', 
    'shorts', 'skirt', 'jacket', 'hoodie', 'sweater', 'coat'
  ]

  const hasApparelKeyword = apparelKeywords.some(keyword => title.includes(keyword))
  
  if (hasApparelKeyword) {
    return 'apparel'
  }

  return 'other'
}