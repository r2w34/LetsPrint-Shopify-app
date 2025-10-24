// Stub template service - simplified version without GraphQL dependency
import { Session } from '@shopify/shopify-api';
import { Template } from '~/types/shopify';

export class TemplateService {
  private session: Session;

  constructor(session: Session) {
    this.session = session;
  }

  async getTemplate(id: string): Promise<Template | null> {
    // Return default template
    return {
      id: 'default',
      name: 'Default Invoice Template',
      type: 'invoice',
      isDefault: true,
      content: '<html><body>Invoice Template</body></html>',
      metadata: {},
    };
  }

  async getDefaultTemplate(type: string = 'invoice'): Promise<Template | null> {
    return this.getTemplate('default');
  }
}
