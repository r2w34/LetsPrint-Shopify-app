// Note: This service is from the original Next.js app and uses metafields
// In Remix, we use Prisma database models instead
// All methods return "not implemented" - use database routes instead

import { 
  Template, 
  TemplateLayout, 
  BusinessInfo, 
  TemplateField,
  MetafieldInput,
  ApiResponse 
} from '../../types/shopify';

export class TemplateService {
  private readonly TEMPLATE_NAMESPACE = 'order_printer_templates';
  private readonly BUSINESS_INFO_NAMESPACE = 'order_printer_business';
  private readonly DEFAULT_TEMPLATE_KEY = 'default_template';

  constructor(session: { shop: string; accessToken: string }) {
    // Note: Metafield approach disabled in favor of Prisma database
  }

  async createTemplate(template: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Template>> {
    return {
      success: false,
      error: 'Method not implemented - use Prisma database models'
    };
  }

  async getTemplates(): Promise<ApiResponse<Template[]>> {
    return {
      success: false,
      error: 'Method not implemented - use Prisma database models'
    };
  }

  async getTemplate(templateId: string): Promise<ApiResponse<Template>> {
    return {
      success: false,
      error: 'Method not implemented - use Prisma database models'
    };
  }

  async updateTemplate(templateId: string, updates: Partial<Template>): Promise<ApiResponse<Template>> {
    return {
      success: false,
      error: 'Method not implemented - use Prisma database models'
    };
  }

  async deleteTemplate(templateId: string): Promise<ApiResponse<void>> {
    return {
      success: false,
      error: 'Method not implemented - use Prisma database models'
    };
  }

  async setDefaultTemplate(templateId: string): Promise<ApiResponse<void>> {
    return {
      success: false,
      error: 'Method not implemented - use Prisma database models'
    };
  }

  async getDefaultTemplate(): Promise<ApiResponse<Template>> {
    return {
      success: false,
      error: 'Method not implemented - use Prisma database models'
    };
  }

  async saveBusinessInfo(businessInfo: BusinessInfo): Promise<ApiResponse<BusinessInfo>> {
    return {
      success: false,
      error: 'Method not implemented - use Prisma database models'
    };
  }

  async getBusinessInfo(): Promise<ApiResponse<BusinessInfo>> {
    return {
      success: false,
      error: 'Method not implemented - use Prisma database models'
    };
  }

  private async getShopGid(): Promise<string> {
    return 'gid://shopify/Shop/0';
  }
}
