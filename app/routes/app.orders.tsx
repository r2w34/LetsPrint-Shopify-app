import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  DataTable,
  Badge,
  Button,
  TextField,
  BlockStack,
  InlineStack,
  Text,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { useState } from "react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  
  const response = await admin.graphql(
    `#graphql
      query getOrders($first: Int!) {
        orders(first: $first, sortKey: CREATED_AT, reverse: true) {
          edges {
            node {
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
              customer {
                firstName
                lastName
                email
              }
              shippingAddress {
                provinceCode
                province
                city
                country
              }
            }
          }
        }
      }
    `,
    {
      variables: {
        first: 50,
      },
    }
  );

  const responseJson = await response.json();
  const orders = responseJson.data?.orders?.edges || [];

  return json({
    orders: orders.map((edge: any) => edge.node),
    shop: session.shop,
  });
};

export default function OrdersPage() {
  const { orders } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState("");

  const filteredOrders = orders.filter((order: any) => {
    return !searchValue || 
      order.name.toLowerCase().includes(searchValue.toLowerCase()) ||
      order.customer?.email?.toLowerCase().includes(searchValue.toLowerCase());
  });

  const rows = filteredOrders.map((order: any) => {
    const orderId = order.id.split("/").pop();
    return [
      order.name,
      new Date(order.createdAt).toLocaleDateString(),
      order.customer ? `${order.customer.firstName} ${order.customer.lastName}` : "Guest",
      order.shippingAddress?.province || "N/A",
      `₹${parseFloat(order.totalPriceSet.shopMoney.amount).toFixed(2)}`,
      <Badge key={`payment-${order.id}`} tone={order.displayFinancialStatus === "PAID" ? "success" : "attention"}>
        {order.displayFinancialStatus}
      </Badge>,
      <InlineStack key={`actions-${order.id}`} gap="200">
        <Button size="slim" onClick={() => navigate(`/app/orders/${orderId}`)}>
          View
        </Button>
        <Button 
          size="slim" 
          variant="primary"
          onClick={() => navigate(`/app/orders/${orderId}`)}
        >
          Invoice
        </Button>
      </InlineStack>,
    ];
  });

  return (
    <Page 
      title="Orders" 
      subtitle="Manage and generate GST invoices"
      primaryAction={{
        content: "Bulk Generate Invoices",
        onAction: () => alert("Bulk invoice generation will be implemented"),
      }}
    >
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <TextField
                label="Search orders"
                value={searchValue}
                onChange={setSearchValue}
                placeholder="Search by order number or customer email"
                autoComplete="off"
                clearButton
                onClearButtonClick={() => setSearchValue("")}
              />
              <DataTable
                columnContentTypes={["text", "text", "text", "text", "numeric", "text", "text"]}
                headings={["Order", "Date", "Customer", "State", "Total", "Payment", "Actions"]}
                rows={rows}
                footerContent={`Showing ${filteredOrders.length} of ${orders.length} orders`}
              />
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="300">
              <Text as="h3" variant="headingMd">Quick Stats</Text>
              <InlineStack align="space-between">
                <Text as="p">Total Orders:</Text>
                <Text as="p" fontWeight="bold">{orders.length}</Text>
              </InlineStack>
              <InlineStack align="space-between">
                <Text as="p">Paid Orders:</Text>
                <Text as="p" fontWeight="bold">
                  {orders.filter((o: any) => o.displayFinancialStatus === "PAID").length}
                </Text>
              </InlineStack>
              <InlineStack align="space-between">
                <Text as="p">Fulfilled:</Text>
                <Text as="p" fontWeight="bold">
                  {orders.filter((o: any) => o.displayFulfillmentStatus === "FULFILLED").length}
                </Text>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
