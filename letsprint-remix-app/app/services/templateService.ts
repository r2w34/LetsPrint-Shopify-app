import { ShopifyGraphQLClient } from './graphqlClient';
import { 
  Template, 
  TemplateLayout, 
  BusinessInfo, 
  TemplateField,
  MetafieldInput,
  ApiResponse 
} from '../../types/shopify';

export class TemplateService {
  private graphqlClient: ShopifyGraphQLClient;
  private readonly TEMPLATE_NAMESPACE = 'order_printer_templates';
  private readonly BUSINESS_INFO_NAMESPACE = 'order_printer_business';
  private readonly DEFAULT_TEMPLATE_KEY = 'default_template';

  constructor(session: { shop: string; accessToken: string }) {
    this.graphqlClient = new ShopifyGraphQLClient(session as any);
  }

  /**
   * Create a new template and store it in Shopify metafields
   */
  async createTemplate(template: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Template>> {
    try {
      const templateId = `template_${Date.now()}`;
      const now = new Date().toISOString();
      
      const fullTemplate: Template = {
        ...template,
        id: templateId,
        createdAt: now,
        updatedAt: now
      };

      const mutation = `
        mutation metafieldSet($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            metafields {
              id
              namespace
              key
              value
              type
              createdAt
              updatedAt
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const variables = {
        metafields: [{
          namespace: this.TEMPLATE_NAMESPACE,
          key: templateId,
          value: JSON.stringify(fullTemplate),
          type: 'json_string',
          description: `Template: ${template.name}`,
          ownerId: await this.getShopGid()
        }]
      };

      const response = await this.graphqlClient.mutate(mutation, variables);

      if (response.metafieldsSet.userErrors.length > 0) {
        throw new Error(response.metafieldsSet.userErrors[0].message);
      }

      // If this is marked as default, update the default template reference
      if (template.isDefault) {
        await this.setDefaultTemplate(templateId);
      }

      return {
        success: true,
        data: fullTemplate,
        message: 'Template created successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create template'
      };
    }
  }

  /**
   * Get all templates from Shopify metafields
   */
  async getTemplates(): Promise<ApiResponse<Template[]>> {
    try {
      const query = `
        query getTemplateMetafields($namespace: String!) {
          shop {
            metafields(namespace: $namespace, first: 50) {
              edges {
                node {
                  id
                  namespace
                  key
                  value
                  type
                  createdAt
                  updatedAt
                }
              }
            }
          }
        }
      `;

      const variables = { namespace: this.TEMPLATE_NAMESPACE };
      const response = await this.graphqlClient.query(query, variables);

      const templates: Template[] = response.shop.metafields.edges
        .map((edge: any) => {
          try {
            return JSON.parse(edge.node.value) as Template;
          } catch (error) {
            console.error(`Failed to parse template ${edge.node.key}:`, error);
            return null;
          }
        })
        .filter((template: Template | null): template is Template => template !== null);

      return {
        success: true,
        data: templates,
        message: `Retrieved ${templates.length} templates`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve templates',
        data: []
      };
    }
  }

  /**
   * Get a specific template by ID
   */
  async getTemplate(templateId: string): Promise<ApiResponse<Template>> {
    try {
      const query = `
        query getTemplateMetafield($namespace: String!, $key: String!) {
          shop {
            metafield(namespace: $namespace, key: $key) {
              id
              namespace
              key
              value
              type
              createdAt
              updatedAt
            }
          }
        }
      `;

      const variables = { 
        namespace: this.TEMPLATE_NAMESPACE, 
        key: templateId 
      };
      
      const response = await this.graphqlClient.query(query, variables);

      if (!response.shop.metafield) {
        return {
          success: false,
          error: 'Template not found'
        };
      }

      const template = JSON.parse(response.shop.metafield.value) as Template;

      return {
        success: true,
        data: template,
        message: 'Template retrieved successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve template'
      };
    }
  }

  /**
   * Update an existing template
   */
  async updateTemplate(templateId: string, updates: Partial<Template>): Promise<ApiResponse<Template>> {
    try {
      // First get the existing template
      const existingResult = await this.getTemplate(templateId);
      if (!existingResult.success || !existingResult.data) {
        return {
          success: false,
          error: 'Template not found'
        };
      }

      const updatedTemplate: Template = {
        ...existingResult.data,
        ...updates,
        id: templateId, // Ensure ID doesn't change
        updatedAt: new Date().toISOString()
      };

      const mutation = `
        mutation metafieldSet($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            metafields {
              id
              namespace
              key
              value
              type
              updatedAt
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const variables = {
        metafields: [{
          namespace: this.TEMPLATE_NAMESPACE,
          key: templateId,
          value: JSON.stringify(updatedTemplate),
          type: 'json_string',
          ownerId: await this.getShopGid()
        }]
      };

      const response = await this.graphqlClient.mutate(mutation, variables);

      if (response.metafieldsSet.userErrors.length > 0) {
        throw new Error(response.metafieldsSet.userErrors[0].message);
      }

      // Handle default template changes
      if (updates.isDefault === true) {
        await this.setDefaultTemplate(templateId);
      } else if (updates.isDefault === false && existingResult.data.isDefault) {
        await this.clearDefaultTemplate();
      }

      return {
        success: true,
        data: updatedTemplate,
        message: 'Template updated successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update template'
      };
    }
  }

  /**
   * Delete a template
   */
  async deleteTemplate(templateId: string): Promise<ApiResponse<void>> {
    try {
      // Check if this is the default template
      const templateResult = await this.getTemplate(templateId);
      if (templateResult.success && templateResult.data?.isDefault) {
        await this.clearDefaultTemplate();
      }

      const mutation = `
        mutation metafieldDelete($input: MetafieldDeleteInput!) {
          metafieldDelete(input: $input) {
            deletedId
            userErrors {
              field
              message
            }
          }
        }
      `;

      // First get the metafield ID
      const metafieldId = await this.getMetafieldId(this.TEMPLATE_NAMESPACE, templateId);
      if (!metafieldId) {
        return {
          success: false,
          error: 'Template not found'
        };
      }

      const variables = {
        input: {
          id: metafieldId
        }
      };

      const response = await this.graphqlClient.mutate(mutation, variables);

      if (response.metafieldDelete.userErrors.length > 0) {
        throw new Error(response.metafieldDelete.userErrors[0].message);
      }

      return {
        success: true,
        message: 'Template deleted successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete template'
      };
    }
  }

  /**
   * Create default template with Indian business compliance fields
   */
  async createDefaultTemplate(): Promise<ApiResponse<Template>> {
    const defaultTemplate: Omit<Template, 'id' | 'createdAt' | 'updatedAt'> = {
      name: 'Indian GST Invoice Template',
      isDefault: true,
      layout: this.getDefaultLayout(),
      businessInfo: this.getDefaultBusinessInfo(),
      fields: this.getDefaultFields()
    };

    return this.createTemplate(defaultTemplate);
  }

  /**
   * Get the default template
   */
  async getDefaultTemplate(): Promise<ApiResponse<Template>> {
    try {
      const defaultTemplateId = await this.getDefaultTemplateId();
      if (!defaultTemplateId) {
        // Create default template if none exists
        return this.createDefaultTemplate();
      }

      return this.getTemplate(defaultTemplateId);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get default template'
      };
    }
  }

  /**
   * Store business information in metafields
   */
  async saveBusinessInfo(businessInfo: BusinessInfo): Promise<ApiResponse<BusinessInfo>> {
    try {
      const mutation = `
        mutation metafieldSet($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            metafields {
              id
              namespace
              key
              value
              type
              updatedAt
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const variables = {
        metafields: [{
          namespace: this.BUSINESS_INFO_NAMESPACE,
          key: 'business_info',
          value: JSON.stringify(businessInfo),
          type: 'json_string',
          description: 'Business information for GST compliance',
          ownerId: await this.getShopGid()
        }]
      };

      const response = await this.graphqlClient.mutate(mutation, variables);

      if (response.metafieldsSet.userErrors.length > 0) {
        throw new Error(response.metafieldsSet.userErrors[0].message);
      }

      return {
        success: true,
        data: businessInfo,
        message: 'Business information saved successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save business information'
      };
    }
  }

  /**
   * Get business information from metafields
   */
  async getBusinessInfo(): Promise<ApiResponse<BusinessInfo>> {
    try {
      const query = `
        query getBusinessInfoMetafield($namespace: String!, $key: String!) {
          shop {
            metafield(namespace: $namespace, key: $key) {
              id
              namespace
              key
              value
              type
              updatedAt
            }
          }
        }
      `;

      const variables = { 
        namespace: this.BUSINESS_INFO_NAMESPACE, 
        key: 'business_info' 
      };
      
      const response = await this.graphqlClient.query(query, variables);

      if (!response.shop.metafield) {
        // Return default business info structure
        return {
          success: true,
          data: this.getDefaultBusinessInfo(),
          message: 'Using default business information'
        };
      }

      const businessInfo = JSON.parse(response.shop.metafield.value) as BusinessInfo;

      return {
        success: true,
        data: businessInfo,
        message: 'Business information retrieved successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve business information'
      };
    }
  }

  // Private helper methods

  private async getShopGid(): Promise<string> {
    const query = `
      query {
        shop {
          id
        }
      }
    `;

    const response = await this.graphqlClient.query(query);
    return response.shop.id;
  }

  private async getMetafieldId(namespace: string, key: string): Promise<string | null> {
    const query = `
      query getMetafieldId($namespace: String!, $key: String!) {
        shop {
          metafield(namespace: $namespace, key: $key) {
            id
          }
        }
      }
    `;

    const variables = { namespace, key };
    const response = await this.graphqlClient.query(query, variables);
    
    return response.shop.metafield?.id || null;
  }

  private async setDefaultTemplate(templateId: string): Promise<void> {
    const mutation = `
      mutation metafieldSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields {
            id
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const variables = {
      metafields: [{
        namespace: this.TEMPLATE_NAMESPACE,
        key: this.DEFAULT_TEMPLATE_KEY,
        value: templateId,
        type: 'string',
        description: 'Default template ID',
        ownerId: await this.getShopGid()
      }]
    };

    await this.graphqlClient.mutate(mutation, variables);
  }

  private async clearDefaultTemplate(): Promise<void> {
    const metafieldId = await this.getMetafieldId(this.TEMPLATE_NAMESPACE, this.DEFAULT_TEMPLATE_KEY);
    if (!metafieldId) return;

    const mutation = `
      mutation metafieldDelete($input: MetafieldDeleteInput!) {
        metafieldDelete(input: $input) {
          deletedId
          userErrors {
            field
            message
          }
        }
      }
    `;

    const variables = {
      input: { id: metafieldId }
    };

    await this.graphqlClient.mutate(mutation, variables);
  }

  private async getDefaultTemplateId(): Promise<string | null> {
    const query = `
      query getDefaultTemplate($namespace: String!, $key: String!) {
        shop {
          metafield(namespace: $namespace, key: $key) {
            value
          }
        }
      }
    `;

    const variables = { 
      namespace: this.TEMPLATE_NAMESPACE, 
      key: this.DEFAULT_TEMPLATE_KEY 
    };
    
    const response = await this.graphqlClient.query(query, variables);
    return response.shop.metafield?.value || null;
  }

  private getDefaultLayout(): TemplateLayout {
    return {
      pageSize: 'A4',
      orientation: 'portrait',
      margins: {
        top: 20,
        right: 20,
        bottom: 20,
        left: 20
      },
      fonts: {
        primary: 'Arial, sans-serif',
        secondary: 'Arial, sans-serif',
        size: {
          header: 18,
          body: 12,
          footer: 10
        }
      },
      colors: {
        primary: '#000000',
        secondary: '#666666',
        text: '#333333',
        background: '#ffffff'
      },
      showGSTBreakdown: true,
      showHSNCodes: true
    };
  }

  private getDefaultBusinessInfo(): BusinessInfo {
    return {
      companyName: '',
      gstin: '',
      address: {
        line1: '',
        line2: '',
        city: '',
        state: '',
        pincode: '',
        country: 'India'
      },
      contact: {
        phone: '',
        email: '',
        website: ''
      },
      bankDetails: {
        accountName: '',
        accountNumber: '',
        ifscCode: '',
        bankName: ''
      }
    };
  }

  private getDefaultFields(): TemplateField[] {
    return [
      {
        id: 'company_name',
        name: 'companyName',
        type: 'text',
        label: 'Company Name',
        required: true,
        position: { x: 0, y: 0, width: 100, height: 30 }
      },
      {
        id: 'gstin',
        name: 'gstin',
        type: 'text',
        label: 'GSTIN',
        required: true,
        position: { x: 0, y: 40, width: 100, height: 20 }
      },
      {
        id: 'invoice_number',
        name: 'invoiceNumber',
        type: 'text',
        label: 'Invoice Number',
        required: true,
        position: { x: 200, y: 0, width: 100, height: 20 }
      },
      {
        id: 'invoice_date',
        name: 'invoiceDate',
        type: 'date',
        label: 'Invoice Date',
        required: true,
        position: { x: 200, y: 30, width: 100, height: 20 }
      },
      {
        id: 'customer_details',
        name: 'customerDetails',
        type: 'text',
        label: 'Customer Details',
        required: true,
        position: { x: 0, y: 80, width: 200, height: 60 }
      },
      {
        id: 'order_items',
        name: 'orderItems',
        type: 'text',
        label: 'Order Items',
        required: true,
        position: { x: 0, y: 160, width: 300, height: 100 }
      },
      {
        id: 'gst_breakdown',
        name: 'gstBreakdown',
        type: 'text',
        label: 'GST Breakdown',
        required: true,
        position: { x: 0, y: 280, width: 300, height: 80 }
      }
    ];
  }
}