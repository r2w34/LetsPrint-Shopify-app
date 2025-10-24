import { useEffect } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  Box,
  List,
  InlineStack,
  Badge,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  // Fetch recent orders
  const ordersResponse = await admin.graphql(
    `#graphql
      query getRecentOrders($first: Int!) {
        orders(first: $first, sortKey: CREATED_AT, reverse: true) {
          edges {
            node {
              id
              name
              createdAt
              displayFinancialStatus
              totalPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
            }
          }
        }
      }
    `,
    {
      variables: {
        first: 10,
      },
    }
  );

  const ordersJson = await ordersResponse.json();
  const orders = ordersJson.data?.orders?.edges || [];

  // Fetch product count
  const productsResponse = await admin.graphql(
    `#graphql
      query getProductCount {
        productsCount {
          count
        }
      }
    `
  );

  const productsJson = await productsResponse.json();
  const productCount = productsJson.data?.productsCount?.count || 0;

  return json({
    orders: orders.map((edge: any) => edge.node),
    productCount,
    shop: session.shop,
  });
};

export default function Index() {
  const { orders, productCount, shop } = useLoaderData<typeof loader>();

  const totalRevenue = orders.reduce((sum: number, order: any) => {
    return sum + parseFloat(order.totalPriceSet.shopMoney.amount);
  }, 0);

  const paidOrders = orders.filter(
    (order: any) => order.displayFinancialStatus === "PAID"
  );

  return (
    <Page>
      <TitleBar title="LetsPrint - GST Invoice Manager" />
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="500">
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Welcome to LetsPrint 🧾
                  </Text>
                  <Text variant="bodyMd" as="p">
                    Your complete GST invoice generation and management solution
                    for Indian e-commerce businesses. Generate compliant invoices
                    with automatic CGST/SGST/IGST calculations, HSN codes, and
                    more.
                  </Text>
                </BlockStack>

                <div style={{ 
                  display: "grid", 
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
                  gap: "16px" 
                }}>
                  <Card background="bg-surface-secondary">
                    <div style={{ padding: "16px" }}>
                      <Text as="h3" variant="headingSm" tone="subdued">
                        Total Orders
                      </Text>
                      <Text as="p" variant="heading2xl">
                        {orders.length}
                      </Text>
                    </div>
                  </Card>

                  <Card background="bg-surface-secondary">
                    <div style={{ padding: "16px" }}>
                      <Text as="h3" variant="headingSm" tone="subdued">
                        Revenue (Last 10)
                      </Text>
                      <Text as="p" variant="heading2xl">
                        ₹{totalRevenue.toFixed(2)}
                      </Text>
                    </div>
                  </Card>

                  <Card background="bg-surface-secondary">
                    <div style={{ padding: "16px" }}>
                      <Text as="h3" variant="headingSm" tone="subdued">
                        Paid Orders
                      </Text>
                      <Text as="p" variant="heading2xl">
                        {paidOrders.length}
                      </Text>
                    </div>
                  </Card>

                  <Card background="bg-surface-secondary">
                    <div style={{ padding: "16px" }}>
                      <Text as="h3" variant="headingSm" tone="subdued">
                        Total Products
                      </Text>
                      <Text as="p" variant="heading2xl">
                        {productCount}
                      </Text>
                    </div>
                  </Card>
                </div>

                <BlockStack gap="200">
                  <Text as="h3" variant="headingMd">
                    Quick Actions
                  </Text>
                  <InlineStack gap="300">
                    <Button url="/app/orders" variant="primary">
                      View All Orders
                    </Button>
                    <Button url="/app/bulk-print">
                      Bulk Print
                    </Button>
                    <Button url="/app/templates">
                      Templates
                    </Button>
                    <Button url="/app/settings">
                      Settings
                    </Button>
                  </InlineStack>
                </BlockStack>

                {orders.length > 0 && (
                  <BlockStack gap="200">
                    <Text as="h3" variant="headingMd">
                      Recent Orders
                    </Text>
                    <div style={{ 
                      maxHeight: "300px", 
                      overflowY: "auto",
                      border: "1px solid var(--p-border-subdued)",
                      borderRadius: "8px",
                      padding: "8px"
                    }}>
                      {orders.slice(0, 5).map((order: any) => (
                        <Card key={order.id}>
                          <div style={{ padding: "12px" }}>
                            <InlineStack align="space-between" blockAlign="center">
                              <BlockStack gap="100">
                                <Text as="span" variant="bodyMd" fontWeight="bold">
                                  {order.name}
                                </Text>
                                <Text as="span" variant="bodySm" tone="subdued">
                                  {new Date(order.createdAt).toLocaleDateString()}
                                </Text>
                              </BlockStack>
                              <InlineStack gap="200" align="end" blockAlign="center">
                                <Text as="span" variant="bodyMd" fontWeight="bold">
                                  ₹{parseFloat(order.totalPriceSet.shopMoney.amount).toFixed(2)}
                                </Text>
                                <Badge
                                  tone={
                                    order.displayFinancialStatus === "PAID"
                                      ? "success"
                                      : "warning"
                                  }
                                >
                                  {order.displayFinancialStatus}
                                </Badge>
                                <Button
                                  size="slim"
                                  url={`/app/orders/${order.id.split("/").pop()}`}
                                >
                                  View
                                </Button>
                              </InlineStack>
                            </InlineStack>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </BlockStack>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <BlockStack gap="500">
              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Features
                  </Text>
                  <List>
                    <List.Item>✅ Automatic GST Calculation (CGST/SGST/IGST)</List.Item>
                    <List.Item>✅ HSN Code Management</List.Item>
                    <List.Item>✅ PDF Invoice Generation</List.Item>
                    <List.Item>✅ Bulk Invoice Processing</List.Item>
                    <List.Item>✅ Email Automation</List.Item>
                    <List.Item>✅ GST Reports & Analytics</List.Item>
                    <List.Item>✅ GSTR-1 Export</List.Item>
                    <List.Item>🔄 WhatsApp Integration (Coming Soon)</List.Item>
                  </List>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Setup Checklist
                  </Text>
                  <List>
                    <List.Item>
                      <Link to="/app/settings">
                        Configure business details & GSTIN
                      </Link>
                    </List.Item>
                    <List.Item>
                      <Link to="/app/hsn-codes">
                        Assign HSN codes to products
                      </Link>
                    </List.Item>
                    <List.Item>
                      <Link to="/app/orders">
                        Start generating invoices
                      </Link>
                    </List.Item>
                  </List>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Need Help?
                  </Text>
                  <Text variant="bodyMd" as="p">
                    Contact support at support@letsprint.com
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
