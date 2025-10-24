import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation, useFetcher } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Button,
  BlockStack,
  DataTable,
  Text,
  Badge,
  InlineStack,
  Select,
  TextField,
  Checkbox,
  Banner,
  ProgressBar,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";
import { useState, useEffect } from "react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  // Fetch recent orders
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

  const ordersJson = await ordersResponse.json();
  const orders = ordersJson.data?.orders?.edges.map((edge: any) => edge.node) || [];

  // Get recent print jobs
  const printJobs = await db.printJob.findMany({
    where: { shop: session.shop },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return json({ orders, printJobs, session });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "bulk-print") {
    const orderIdsJson = formData.get("orderIds") as string;
    const orderIds = JSON.parse(orderIdsJson);

    if (!orderIds || orderIds.length === 0) {
      return json({ success: false, error: "No orders selected" }, { status: 400 });
    }

    try {
      // Create print job
      const printJob = await db.printJob.create({
        data: {
          shop: session.shop,
          orderIds: JSON.stringify(orderIds),
          jobType: "bulk",
          status: "queued",
          progress: 0,
        },
      });

      return json({
        success: true,
        jobId: printJob.id,
        message: `Bulk print job created for ${orderIds.length} orders`,
      });
    } catch (error: any) {
      return json({ success: false, error: error.message }, { status: 500 });
    }
  }

  if (intent === "cancel-job") {
    const jobId = formData.get("jobId") as string;

    try {
      await db.printJob.update({
        where: { id: jobId },
        data: { status: "cancelled" },
      });

      return json({ success: true, message: "Job cancelled" });
    } catch (error: any) {
      return json({ success: false, error: error.message }, { status: 500 });
    }
  }

  return json({ success: false, error: "Invalid action" }, { status: 400 });
};

export default function BulkPrintPage() {
  const { orders, printJobs } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const fetcher = useFetcher();

  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const isProcessing = navigation.state === "submitting";

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(num);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, "success" | "attention" | "warning" | "info"> = {
      PAID: "success",
      PENDING: "attention",
      completed: "success",
      processing: "info",
      queued: "attention",
      failed: "warning",
      cancelled: "warning",
    };
    return statusMap[status] || "info";
  };

  const filteredOrders = orders.filter((order: any) => {
    const matchesStatus = filterStatus === "all" || order.displayFinancialStatus === filterStatus;
    const matchesSearch =
      !searchQuery ||
      order.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer?.email?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleSelectOrder = (orderId: string) => {
    setSelectedOrders((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  };

  const handleSelectAll = () => {
    if (selectedOrders.length === filteredOrders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(filteredOrders.map((order: any) => order.id.split("/").pop()));
    }
  };

  const handleBulkPrint = () => {
    const formData = new FormData();
    formData.append("intent", "bulk-print");
    formData.append("orderIds", JSON.stringify(selectedOrders));
    submit(formData, { method: "post" });
    setShowSuccess(true);
    setSelectedOrders([]);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const orderRows = filteredOrders.map((order: any) => {
    const orderId = order.id.split("/").pop();
    return [
      <Checkbox
        key={`checkbox-${order.id}`}
        label=""
        checked={selectedOrders.includes(orderId)}
        onChange={() => handleSelectOrder(orderId)}
      />,
      order.name,
      formatDate(order.createdAt),
      order.customer ? `${order.customer.firstName} ${order.customer.lastName}` : "Guest",
      order.shippingAddress?.provinceCode || "—",
      formatCurrency(order.totalPriceSet.shopMoney.amount),
      <Badge key={`badge-${order.id}`} tone={getStatusBadge(order.displayFinancialStatus)}>
        {order.displayFinancialStatus}
      </Badge>,
    ];
  });

  return (
    <Page
      title="Bulk Print"
      subtitle="Select multiple orders to generate invoices in bulk"
      primaryAction={{
        content: `Generate ${selectedOrders.length} Invoice${selectedOrders.length !== 1 ? "s" : ""}`,
        onAction: handleBulkPrint,
        disabled: selectedOrders.length === 0 || isProcessing,
        loading: isProcessing,
      }}
    >
      <BlockStack gap="500">
        {showSuccess && (
          <Banner tone="success" onDismiss={() => setShowSuccess(false)}>
            Bulk print job created successfully! Check the jobs section below for progress.
          </Banner>
        )}

        <Layout>
          <Layout.Section>
            <BlockStack gap="500">
              {/* Filters */}
              <Card>
                <BlockStack gap="400">
                  <InlineStack gap="400" wrap={false}>
                    <div style={{ flex: 1 }}>
                      <TextField
                        label="Search"
                        value={searchQuery}
                        onChange={setSearchQuery}
                        placeholder="Search by order number or email"
                        autoComplete="off"
                        clearButton
                        onClearButtonClick={() => setSearchQuery("")}
                      />
                    </div>
                    <div style={{ minWidth: "200px" }}>
                      <Select
                        label="Filter by status"
                        options={[
                          { label: "All orders", value: "all" },
                          { label: "Paid", value: "PAID" },
                          { label: "Pending", value: "PENDING" },
                          { label: "Refunded", value: "REFUNDED" },
                        ]}
                        value={filterStatus}
                        onChange={setFilterStatus}
                      />
                    </div>
                  </InlineStack>
                </BlockStack>
              </Card>

              {/* Orders Table */}
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between" blockAlign="center">
                    <InlineStack gap="300" blockAlign="center">
                      <Checkbox
                        label="Select all"
                        checked={selectedOrders.length === filteredOrders.length && filteredOrders.length > 0}
                        onChange={handleSelectAll}
                      />
                      {selectedOrders.length > 0 && (
                        <Text as="p" tone="subdued">
                          {selectedOrders.length} selected
                        </Text>
                      )}
                    </InlineStack>
                    <Text as="p" tone="subdued">
                      {filteredOrders.length} orders
                    </Text>
                  </InlineStack>

                  <DataTable
                    columnContentTypes={["text", "text", "text", "text", "text", "numeric", "text"]}
                    headings={["", "Order", "Date", "Customer", "State", "Total", "Status"]}
                    rows={orderRows}
                  />
                </BlockStack>
              </Card>

              {/* Print Jobs */}
              {printJobs.length > 0 && (
                <Card>
                  <BlockStack gap="400">
                    <Text as="h2" variant="headingMd">
                      Recent Print Jobs
                    </Text>

                    {printJobs.map((job) => {
                      const orderIds = JSON.parse(job.orderIds);
                      return (
                        <Card key={job.id}>
                          <BlockStack gap="300">
                            <InlineStack align="space-between" blockAlign="center">
                              <BlockStack gap="100">
                                <Text as="p" fontWeight="semibold">
                                  {job.jobType === "bulk" ? `Bulk Print (${orderIds.length} orders)` : "Single Order"}
                                </Text>
                                <Text as="p" variant="bodySm" tone="subdued">
                                  {formatDate(job.createdAt)}
                                </Text>
                              </BlockStack>
                              <Badge tone={getStatusBadge(job.status)}>{job.status.toUpperCase()}</Badge>
                            </InlineStack>

                            {job.status === "processing" && (
                              <ProgressBar progress={job.progress} size="small" tone="primary" />
                            )}

                            {job.downloadUrl && job.status === "completed" && (
                              <InlineStack gap="200">
                                <Button
                                  url={job.downloadUrl}
                                  external
                                  variant="primary"
                                  size="slim"
                                >
                                  Download
                                </Button>
                              </InlineStack>
                            )}

                            {job.error && (
                              <Banner tone="critical">
                                <Text as="p" variant="bodySm">
                                  {job.error}
                                </Text>
                              </Banner>
                            )}
                          </BlockStack>
                        </Card>
                      );
                    })}
                  </BlockStack>
                </Card>
              )}
            </BlockStack>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <BlockStack gap="500">
              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">
                    Bulk Print Stats
                  </Text>

                  <InlineStack align="space-between">
                    <Text as="p" tone="subdued">
                      Total Orders
                    </Text>
                    <Text as="p" fontWeight="semibold">
                      {filteredOrders.length}
                    </Text>
                  </InlineStack>

                  <InlineStack align="space-between">
                    <Text as="p" tone="subdued">
                      Selected
                    </Text>
                    <Text as="p" fontWeight="semibold">
                      {selectedOrders.length}
                    </Text>
                  </InlineStack>

                  <InlineStack align="space-between">
                    <Text as="p" tone="subdued">
                      Recent Jobs
                    </Text>
                    <Text as="p" fontWeight="semibold">
                      {printJobs.length}
                    </Text>
                  </InlineStack>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">
                    How it works
                  </Text>

                  <Text as="p" variant="bodySm">
                    1. Select the orders you want to print
                  </Text>

                  <Text as="p" variant="bodySm">
                    2. Click "Generate Invoices" button
                  </Text>

                  <Text as="p" variant="bodySm">
                    3. Job will be queued for processing
                  </Text>

                  <Text as="p" variant="bodySm">
                    4. Download the generated PDFs when ready
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
