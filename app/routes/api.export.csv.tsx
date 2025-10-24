import { type LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const { admin, session } = await authenticate.admin(request);
    const url = new URL(request.url);
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");

    // Fetch orders
    const ordersResponse = await admin.graphql(
      `#graphql
        query getOrders($first: Int!) {
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
                totalTaxSet {
                  shopMoney {
                    amount
                  }
                }
                subtotalPriceSet {
                  shopMoney {
                    amount
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
                }
                lineItems(first: 100) {
                  edges {
                    node {
                      title
                      quantity
                      originalUnitPriceSet {
                        shopMoney {
                          amount
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `,
      {
        variables: {
          first: 250,
        },
      }
    );

    const ordersJson = await ordersResponse.json();
    const orders = ordersJson.data?.orders?.edges.map((edge: any) => edge.node) || [];

    // Generate CSV
    const csvRows = [
      // Header
      [
        "Order Number",
        "Date",
        "Customer Name",
        "Customer Email",
        "State",
        "Subtotal",
        "CGST",
        "SGST",
        "IGST",
        "Total Tax",
        "Total Amount",
        "Payment Status",
        "Items Count",
      ].join(","),
    ];

    // Data rows
    for (const order of orders) {
      const storeState = process.env.DEFAULT_STORE_STATE || "MH";
      const customerState = order.shippingAddress?.provinceCode || "MH";
      const taxAmount = parseFloat(order.totalTaxSet?.shopMoney.amount || "0");

      let cgst = 0,
        sgst = 0,
        igst = 0;

      if (customerState === storeState) {
        cgst = taxAmount / 2;
        sgst = taxAmount / 2;
      } else {
        igst = taxAmount;
      }

      const customerName = order.customer
        ? `${order.customer.firstName} ${order.customer.lastName}`
        : "Guest";

      const row = [
        order.name,
        new Date(order.createdAt).toLocaleDateString("en-IN"),
        customerName,
        order.customer?.email || "",
        order.shippingAddress?.province || "",
        order.subtotalPriceSet.shopMoney.amount,
        cgst.toFixed(2),
        sgst.toFixed(2),
        igst.toFixed(2),
        taxAmount.toFixed(2),
        order.totalPriceSet.shopMoney.amount,
        order.displayFinancialStatus,
        order.lineItems.edges.length,
      ];

      csvRows.push(row.join(","));
    }

    const csv = csvRows.join("\n");
    const filename = `orders-export-${new Date().toISOString().split("T")[0]}.csv`;

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error: any) {
    console.error("CSV export error:", error);
    return new Response("Failed to export CSV", { status: 500 });
  }
};
