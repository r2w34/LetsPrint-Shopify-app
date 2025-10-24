import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Button,
  BlockStack,
  InlineStack,
  Text,
  Badge,
  DataTable,
  Banner,
  Modal,
  TextField,
  TextContainer,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";
import { useState } from "react";

const DEFAULT_TEMPLATE_CONTENT = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>GST Invoice</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .invoice-details { margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
    .totals { text-align: right; }
    .footer { margin-top: 30px; text-align: center; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>{{businessName}}</h1>
    <p>GSTIN: {{gstin}}</p>
    <p>{{address}}</p>
  </div>
  
  <div class="invoice-details">
    <p><strong>Invoice Number:</strong> {{invoiceNumber}}</p>
    <p><strong>Date:</strong> {{invoiceDate}}</p>
    <p><strong>Order:</strong> {{orderName}}</p>
  </div>
  
  <h3>Bill To:</h3>
  <p>{{customerName}}<br>{{customerAddress}}</p>
  
  <h3>Items:</h3>
  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th>HSN</th>
        <th>Qty</th>
        <th>Rate</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>
      {{lineItems}}
    </tbody>
  </table>
  
  <div class="totals">
    <p>Subtotal: ₹{{subtotal}}</p>
    <p>CGST: ₹{{cgst}}</p>
    <p>SGST: ₹{{sgst}}</p>
    <p>IGST: ₹{{igst}}</p>
    <p><strong>Total: ₹{{total}}</strong></p>
  </div>
  
  <div class="footer">
    <p>This is a computer-generated invoice</p>
  </div>
</body>
</html>`;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const templates = await db.template.findMany({
    where: { shop: session.shop },
    orderBy: { createdAt: "desc" },
  });

  return json({ templates, session });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  try {
    if (intent === "create") {
      const name = formData.get("name") as string;
      const description = formData.get("description") as string;
      const content = formData.get("content") as string || DEFAULT_TEMPLATE_CONTENT;

      const template = await db.template.create({
        data: {
          shop: session.shop,
          name,
          description,
          content,
          isDefault: false,
        },
      });

      return json({ success: true, template, message: "Template created successfully" });
    }

    if (intent === "delete") {
      const id = formData.get("id") as string;

      await db.template.delete({
        where: { id },
      });

      return json({ success: true, message: "Template deleted successfully" });
    }

    if (intent === "set-default") {
      const id = formData.get("id") as string;

      // Unset all default templates
      await db.template.updateMany({
        where: { shop: session.shop, isDefault: true },
        data: { isDefault: false },
      });

      // Set new default
      await db.template.update({
        where: { id },
        data: { isDefault: true },
      });

      return json({ success: true, message: "Default template updated" });
    }

    return json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Template action error:", error);
    return json({ success: false, error: error.message }, { status: 500 });
  }
};

export default function TemplatesPage() {
  const { templates } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigation = useNavigation();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateDescription, setNewTemplateDescription] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const isProcessing = navigation.state === "submitting";

  const handleCreate = () => {
    const formData = new FormData();
    formData.append("intent", "create");
    formData.append("name", newTemplateName);
    formData.append("description", newTemplateDescription);
    formData.append("content", DEFAULT_TEMPLATE_CONTENT);
    submit(formData, { method: "post" });
    setShowCreateModal(false);
    setNewTemplateName("");
    setNewTemplateDescription("");
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this template?")) {
      const formData = new FormData();
      formData.append("intent", "delete");
      formData.append("id", id);
      submit(formData, { method: "post" });
    }
  };

  const handleSetDefault = (id: string) => {
    const formData = new FormData();
    formData.append("intent", "set-default");
    formData.append("id", id);
    submit(formData, { method: "post" });
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const templateRows = templates.map((template) => [
    <div key={`name-${template.id}`}>
      <Text as="p" fontWeight="semibold">
        {template.name}
      </Text>
      {template.isDefault && (
        <Badge tone="success" size="small">
          Default
        </Badge>
      )}
    </div>,
    template.description || "—",
    formatDate(template.createdAt),
    <InlineStack key={`actions-${template.id}`} gap="200">
      {!template.isDefault && (
        <Button size="slim" onClick={() => handleSetDefault(template.id)}>
          Set as Default
        </Button>
      )}
      <Button size="slim" tone="critical" onClick={() => handleDelete(template.id)}>
        Delete
      </Button>
    </InlineStack>,
  ]);

  return (
    <Page
      title="Invoice Templates"
      subtitle="Manage your GST invoice templates"
      primaryAction={{
        content: "Create Template",
        onAction: () => setShowCreateModal(true),
      }}
    >
      <BlockStack gap="500">
        {showSuccess && (
          <Banner tone="success" onDismiss={() => setShowSuccess(false)}>
            Template action completed successfully!
          </Banner>
        )}

        <Layout>
          <Layout.Section>
            <Card>
              {templates.length > 0 ? (
                <DataTable
                  columnContentTypes={["text", "text", "text", "text"]}
                  headings={["Template Name", "Description", "Created", "Actions"]}
                  rows={templateRows}
                />
              ) : (
                <BlockStack gap="400" inlineAlign="center">
                  <Text as="p" tone="subdued">
                    No templates yet
                  </Text>
                  <Button onClick={() => setShowCreateModal(true)}>Create Your First Template</Button>
                </BlockStack>
              )}
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <BlockStack gap="500">
              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">
                    Template Variables
                  </Text>

                  <Text as="p" variant="bodySm">
                    Use these variables in your templates:
                  </Text>

                  <BlockStack gap="100">
                    <Text as="p" variant="bodyXs" tone="subdued">
                      • {`{{businessName}}`} - Your business name
                    </Text>
                    <Text as="p" variant="bodyXs" tone="subdued">
                      • {`{{gstin}}`} - Your GSTIN
                    </Text>
                    <Text as="p" variant="bodyXs" tone="subdued">
                      • {`{{invoiceNumber}}`} - Invoice number
                    </Text>
                    <Text as="p" variant="bodyXs" tone="subdued">
                      • {`{{orderName}}`} - Order number
                    </Text>
                    <Text as="p" variant="bodyXs" tone="subdued">
                      • {`{{customerName}}`} - Customer name
                    </Text>
                    <Text as="p" variant="bodyXs" tone="subdued">
                      • {`{{total}}`} - Total amount
                    </Text>
                    <Text as="p" variant="bodyXs" tone="subdued">
                      • {`{{cgst}}`} - CGST amount
                    </Text>
                    <Text as="p" variant="bodyXs" tone="subdued">
                      • {`{{sgst}}`} - SGST amount
                    </Text>
                    <Text as="p" variant="bodyXs" tone="subdued">
                      • {`{{igst}}`} - IGST amount
                    </Text>
                  </BlockStack>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">
                    Quick Tips
                  </Text>

                  <Text as="p" variant="bodySm">
                    • Templates use HTML for structure and CSS for styling
                  </Text>

                  <Text as="p" variant="bodySm">
                    • Set one template as default for automatic use
                  </Text>

                  <Text as="p" variant="bodySm">
                    • You can create multiple templates for different purposes
                  </Text>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>

        {/* Create Template Modal */}
        <Modal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Create New Template"
          primaryAction={{
            content: "Create",
            onAction: handleCreate,
            disabled: !newTemplateName,
            loading: isProcessing,
          }}
          secondaryActions={[
            {
              content: "Cancel",
              onAction: () => setShowCreateModal(false),
            },
          ]}
        >
          <Modal.Section>
            <BlockStack gap="400">
              <TextField
                label="Template Name"
                value={newTemplateName}
                onChange={setNewTemplateName}
                placeholder="e.g., Default GST Invoice"
                autoComplete="off"
              />

              <TextField
                label="Description (optional)"
                value={newTemplateDescription}
                onChange={setNewTemplateDescription}
                placeholder="Brief description of this template"
                multiline={2}
                autoComplete="off"
              />

              <TextContainer>
                <Text as="p" variant="bodySm" tone="subdued">
                  A default HTML template will be created. You can customize it later by editing the template content.
                </Text>
              </TextContainer>
            </BlockStack>
          </Modal.Section>
        </Modal>
      </BlockStack>
    </Page>
  );
}
