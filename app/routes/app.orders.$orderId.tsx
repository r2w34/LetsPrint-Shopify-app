import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate, useSubmit, useNavigation, useActionData } from "@remix-run/react";
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
  Divider,
  Banner,
  Spinner,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { PDFService } from "../lib/services/pdfService";
import { GSTService } from "../lib/services/gstService";
import React, { useState } from "react";

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const orderId = params.orderId;

  try {
    const response = await admin.graphql(
      `#graphql
        query getOrder($id: ID!) {
          order(id: $id) {
            id
            name
            createdAt
            displayFinancialStatus
            displayFulfillmentStatus
            totalPriceSet {
              shopMoney {
                amount
                currencyCode
              }
            }
            subtotalPriceSet {
              shopMoney {
                amount
              }
            }
            totalTaxSet {
              shopMoney {
                amount
              }
            }
            totalShippingPriceSet {
              shopMoney {
                amount
              }
            }
            lineItems(first: 100) {
              edges {
                node {
                  id
                  title
                  quantity
                  originalUnitPriceSet {
                    shopMoney {
                      amount
                    }
                  }
                  taxLines {
                    title
                    rate
                  }
                  variant {
                    sku
                  }
                }
              }
            }
            customer {
              id
              firstName
              lastName
              email
              phone
            }
            shippingAddress {
              address1
              address2
              city
              provinceCode
              province
              zip
              country
            }
            billingAddress {
              address1
              address2
              city
              provinceCode
              province
              zip
              country
            }
          }
        }
      `,
      {
        variables: {
          id: `gid://shopify/Order/${orderId}`,
        },
      }
    );

    const responseJson = await response.json();
    const order = responseJson.data?.order;

    if (!order) {
      throw new Response("Order not found", { status: 404 });
    }

    // Calculate GST breakdown
    const gstService = new GSTService(process.env.DEFAULT_STORE_STATE || "MH");
    const customerState = order.shippingAddress?.provinceCode || "MH";
    const storeState = process.env.DEFAULT_STORE_STATE || "MH";
    
    const total = parseFloat(order.totalPriceSet.shopMoney.amount);
    const taxAmount = parseFloat(order.totalTaxSet?.shopMoney.amount || "0");
    
    let gstBreakdown = {
      cgst: 0,
      sgst: 0,
      igst: 0,
      total: taxAmount,
    };

    if (customerState === storeState) {
      // Intra-state: CGST + SGST
      gstBreakdown.cgst = taxAmount / 2;
      gstBreakdown.sgst = taxAmount / 2;
    } else {
      // Inter-state: IGST
      gstBreakdown.igst = taxAmount;
    }

    return json({
      order: {
        ...order,
        gstBreakdown,
        lineItems: order.lineItems.edges.map((edge: any) => edge.node),
      },
      session,
    });
  } catch (error) {
    console.error("Error fetching order:", error);
    throw new Response("Failed to load order", { status: 500 });
  }
};

export const action = async ({ params, request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "generate-invoice") {
    try {
      const orderId = params.orderId;
      if (!orderId) {
        throw new Error("Order ID is required");
      }

      // Call the print API internally
      const printRequest = new Request(`${new URL(request.url).origin}/api/print`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...Object.fromEntries(request.headers.entries()),
        },
        body: JSON.stringify({
          orderIds: [orderId],
          options: {
            includeGSTBreakdown: true,
            includeBusinessInfo: true,
          },
        }),
      });

      const printResponse = await fetch(printRequest);
      const printData = await printResponse.json();

      if (!printData.success) {
        throw new Error(printData.error || "Failed to generate invoice");
      }

      return json({
        success: true,
        message: "Invoice generated successfully!",
        downloadUrl: printData.downloadUrl,
        invoiceNumber: printData.invoiceNumber,
        pdfBase64: printData.pdfBase64,
        filename: printData.filename,
      });
    } catch (error: any) {
      console.error("Invoice generation error:", error);
      return json({
        success: false,
        error: error.message || "Failed to generate invoice",
      }, { status: 500 });
    }
  }

  return json({ success: false, error: "Invalid action" }, { status: 400 });
};

export default function OrderDetail() {
  const { order, session } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigate = useNavigate();
  const submit = useSubmit();
  const navigation = useNavigation();
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);

  const isGenerating = navigation.state === "submitting";

  // Handle PDF download when action returns success
  React.useEffect(() => {
    if (actionData?.success && actionData?.pdfBase64) {
      // Convert base64 to blob and trigger download
      const byteCharacters = atob(actionData.pdfBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = actionData.filename || `invoice-${order.name}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } else if (actionData?.success === false) {
      setShowError(true);
      setTimeout(() => setShowError(false), 5000);
    }
  }, [actionData]);

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(num);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, "success" | "attention" | "warning" | "info"> = {
      PAID: "success",
      PENDING: "attention",
      REFUNDED: "warning",
      FULFILLED: "success",
      UNFULFILLED: "attention",
      PARTIALLY_FULFILLED: "info",
    };
    return statusMap[status] || "info";
  };

  const handleGenerateInvoice = () => {
    const formData = new FormData();
    formData.append("intent", "generate-invoice");
    submit(formData, { method: "post" });
  };

  // Prepare line items data for table
  const lineItemsRows = order.lineItems.map((item: any) => {
    const unitPrice = parseFloat(item.originalUnitPriceSet.shopMoney.amount);
    const total = unitPrice * item.quantity;
    return [
      item.title,
      item.variant?.sku || "—",
      item.quantity.toString(),
      formatCurrency(unitPrice),
      formatCurrency(total),
    ];
  });

  return (
    <Page
      title={`Order ${order.name}`}
      backAction={{
        onAction: () => navigate("/app/orders"),
      }}
      titleMetadata={
        <Badge tone={getStatusBadge(order.displayFinancialStatus)}>
          {order.displayFinancialStatus}
        </Badge>
      }
      secondaryActions={[
        {
          content: "View in Shopify",
          url: `shopify://admin/orders/${order.id.split("/").pop()}`,
          external: true,
        },
      ]}
    >
      <BlockStack gap="500">
        {showSuccess && (
          <Banner tone="success" onDismiss={() => setShowSuccess(false)}>
            Invoice generated successfully! PDF download started.
          </Banner>
        )}
        
        {showError && actionData?.error && (
          <Banner tone="critical" onDismiss={() => setShowError(false)}>
            Error generating invoice: {actionData.error}
          </Banner>
        )}

        <Layout>
          <Layout.Section>
            <BlockStack gap="500">
              {/* Order Summary */}
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between">
                    <Text as="h2" variant="headingMd">
                      Order Summary
                    </Text>
                    <Badge tone={getStatusBadge(order.displayFulfillmentStatus)}>
                      {order.displayFulfillmentStatus}
                    </Badge>
                  </InlineStack>
                  
                  <Divider />
                  
                  <InlineStack align="space-between">
                    <Text as="p" tone="subdued">Order Date</Text>
                    <Text as="p" fontWeight="semibold">{formatDate(order.createdAt)}</Text>
                  </InlineStack>
                  
                  <InlineStack align="space-between">
                    <Text as="p" tone="subdued">Subtotal</Text>
                    <Text as="p">{formatCurrency(order.subtotalPriceSet.shopMoney.amount)}</Text>
                  </InlineStack>
                  
                  <InlineStack align="space-between">
                    <Text as="p" tone="subdued">Shipping</Text>
                    <Text as="p">{formatCurrency(order.totalShippingPriceSet?.shopMoney.amount || 0)}</Text>
                  </InlineStack>
                  
                  <InlineStack align="space-between">
                    <Text as="p" tone="subdued">Tax</Text>
                    <Text as="p">{formatCurrency(order.totalTaxSet.shopMoney.amount)}</Text>
                  </InlineStack>
                  
                  <Divider />
                  
                  <InlineStack align="space-between">
                    <Text as="h3" variant="headingMd">Total</Text>
                    <Text as="h3" variant="headingMd">
                      {formatCurrency(order.totalPriceSet.shopMoney.amount)}
                    </Text>
                  </InlineStack>
                </BlockStack>
              </Card>

              {/* Customer Information */}
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    Customer Information
                  </Text>
                  
                  <Divider />
                  
                  {order.customer ? (
                    <BlockStack gap="300">
                      <InlineStack align="space-between">
                        <Text as="p" tone="subdued">Name</Text>
                        <Text as="p">{order.customer.firstName} {order.customer.lastName}</Text>
                      </InlineStack>
                      
                      <InlineStack align="space-between">
                        <Text as="p" tone="subdued">Email</Text>
                        <Text as="p">{order.customer.email}</Text>
                      </InlineStack>
                      
                      {order.customer.phone && (
                        <InlineStack align="space-between">
                          <Text as="p" tone="subdued">Phone</Text>
                          <Text as="p">{order.customer.phone}</Text>
                        </InlineStack>
                      )}
                    </BlockStack>
                  ) : (
                    <Text as="p" tone="subdued">Guest checkout</Text>
                  )}
                </BlockStack>
              </Card>

              {/* Shipping Address */}
              {order.shippingAddress && (
                <Card>
                  <BlockStack gap="400">
                    <Text as="h2" variant="headingMd">
                      Shipping Address
                    </Text>
                    
                    <Divider />
                    
                    <BlockStack gap="100">
                      <Text as="p">{order.shippingAddress.address1}</Text>
                      {order.shippingAddress.address2 && (
                        <Text as="p">{order.shippingAddress.address2}</Text>
                      )}
                      <Text as="p">
                        {order.shippingAddress.city}, {order.shippingAddress.province} {order.shippingAddress.zip}
                      </Text>
                      <Text as="p">{order.shippingAddress.country}</Text>
                    </BlockStack>
                  </BlockStack>
                </Card>
              )}

              {/* Line Items */}
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    Items ({order.lineItems.length})
                  </Text>
                  
                  <DataTable
                    columnContentTypes={["text", "text", "numeric", "numeric", "numeric"]}
                    headings={["Product", "SKU", "Quantity", "Price", "Total"]}
                    rows={lineItemsRows}
                  />
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <BlockStack gap="500">
              {/* Actions */}
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    Actions
                  </Text>
                  
                  <Button
                    variant="primary"
                    fullWidth
                    onClick={handleGenerateInvoice}
                    loading={isGenerating}
                  >
                    {isGenerating ? "Generating..." : "Generate GST Invoice"}
                  </Button>
                  
                  <Button
                    fullWidth
                    onClick={() => navigate("/app/bulk-print")}
                  >
                    Bulk Print
                  </Button>
                </BlockStack>
              </Card>

              {/* GST Breakdown */}
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    GST Breakdown
                  </Text>
                  
                  <Divider />
                  
                  {order.gstBreakdown.cgst > 0 ? (
                    <>
                      <InlineStack align="space-between">
                        <Text as="p" tone="subdued">CGST (9%)</Text>
                        <Text as="p">{formatCurrency(order.gstBreakdown.cgst)}</Text>
                      </InlineStack>
                      
                      <InlineStack align="space-between">
                        <Text as="p" tone="subdued">SGST (9%)</Text>
                        <Text as="p">{formatCurrency(order.gstBreakdown.sgst)}</Text>
                      </InlineStack>
                    </>
                  ) : (
                    <InlineStack align="space-between">
                      <Text as="p" tone="subdued">IGST (18%)</Text>
                      <Text as="p">{formatCurrency(order.gstBreakdown.igst)}</Text>
                    </InlineStack>
                  )}
                  
                  <Divider />
                  
                  <InlineStack align="space-between">
                    <Text as="p" fontWeight="semibold">Total GST</Text>
                    <Text as="p" fontWeight="semibold">
                      {formatCurrency(order.gstBreakdown.total)}
                    </Text>
                  </InlineStack>
                  
                  <Text as="p" tone="subdued" variant="bodySm">
                    {order.shippingAddress?.provinceCode === (process.env.DEFAULT_STORE_STATE || "MH")
                      ? "Intra-state supply (CGST + SGST)"
                      : "Inter-state supply (IGST)"}
                  </Text>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
