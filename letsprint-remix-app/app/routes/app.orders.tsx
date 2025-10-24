import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  DataTable,
  Badge,
  Button,
  TextField,
  BlockStack,
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
  const [searchValue, setSearchValue] = useState("");

  const filteredOrders = orders.filter((order: any) => {
    return !searchValue || order.name.toLowerCase().includes(searchValue.toLowerCase());
  });

  const rows = filteredOrders.map((order: any) => [
    order.name,
    new Date(order.createdAt).toLocaleDateString(),
    order.customer ? `${order.customer.firstName} ${order.customer.lastName}` : "Guest",
    order.shippingAddress?.province || "N/A",
    `₹${parseFloat(order.totalPriceSet.shopMoney.amount).toFixed(2)}`,
    <Badge key={`payment-${order.id}`} tone={order.displayFinancialStatus === "PAID" ? "success" : "attention"}>
      {order.displayFinancialStatus}
    </Badge>,
    <Button key={`action-${order.id}`} size="slim" url={`/app/orders/${order.id.split("/").pop()}`}>
      View
    </Button>,
  ]);

  return (
    <Page title="Orders" subtitle="Manage and generate GST invoices">
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <TextField
                label="Search orders"
                value={searchValue}
                onChange={setSearchValue}
                placeholder="Search by order number"
                autoComplete="off"
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
      </Layout>
    </Page>
  );
}
