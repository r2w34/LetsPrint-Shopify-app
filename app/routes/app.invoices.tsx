import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  DataTable,
  Badge,
  Button,
  BlockStack,
  InlineStack,
  TextField,
  Select,
  Text,
  EmptyState,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";
import { useState, useCallback } from "react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const url = new URL(request.url);
  const searchQuery = url.searchParams.get("search") || "";
  const statusFilter = url.searchParams.get("status") || "all";

  // Build where clause
  const where: any = { shop: session.shop };
  
  if (searchQuery) {
    where.OR = [
      { invoiceNumber: { contains: searchQuery } },
      { orderName: { contains: searchQuery } },
    ];
  }

  if (statusFilter !== "all") {
    where.status = statusFilter;
  }

  // Get invoices with pagination
  const invoices = await db.invoice.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // Get counts for stats
  const totalCount = await db.invoice.count({
    where: { shop: session.shop },
  });

  const generatedCount = await db.invoice.count({
    where: { shop: session.shop, status: "generated" },
  });

  const aggregateResult = await db.invoice.aggregate({
    where: { shop: session.shop },
    _sum: { total: true },
  });
  
  const totalAmount = aggregateResult._sum.total || 0;

  return json({
    invoices,
    stats: {
      total: totalCount,
      generated: generatedCount,
      totalAmount: totalAmount,
    },
  });
};

export default function InvoicesPage() {
  const { invoices, stats } = useLoaderData<typeof loader>();
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const handleSearchChange = useCallback((value: string) => {
    setSearchValue(value);
  }, []);

  const handleFilterChange = useCallback((value: string) => {
    setStatusFilter(value);
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: any = {
      generated: { tone: "success", label: "Generated" },
      failed: { tone: "critical", label: "Failed" },
      pending: { tone: "warning", label: "Pending" },
    };

    const config = statusConfig[status] || statusConfig.generated;
    return <Badge tone={config.tone}>{config.label}</Badge>;
  };

  const rows = invoices.map((invoice) => [
    <Link
      to={`/app/orders/${invoice.orderId.split("/").pop()}`}
      style={{ textDecoration: "none", color: "#2c6ecb", fontWeight: 500 }}
    >
      {invoice.invoiceNumber}
    </Link>,
    invoice.orderName,
    formatDate(invoice.createdAt),
    formatCurrency(invoice.total),
    formatCurrency(invoice.gstAmount),
    getStatusBadge(invoice.status),
    <InlineStack gap="200">
      {invoice.fileKey && (
        <Button
          url={invoice.pdfUrl || "#"}
          size="slim"
          variant="plain"
        >
          Download
        </Button>
      )}
      <Link
        to={`/app/orders/${invoice.orderId.split("/").pop()}`}
        style={{ textDecoration: "none" }}
      >
        <Button size="slim" variant="plain">
          View Order
        </Button>
      </Link>
    </InlineStack>,
  ]);

  const emptyStateMarkup = (
    <EmptyState
      heading="No invoices yet"
      image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
    >
      <p>Start generating invoices from your orders.</p>
      <div style={{ marginTop: "16px" }}>
        <Link to="/app/orders">
          <Button variant="primary">Go to Orders</Button>
        </Link>
      </div>
    </EmptyState>
  );

  return (
    <Page
      title="Invoice History"
      subtitle="View and manage all generated invoices"
      primaryAction={{
        content: "Generate New Invoice",
        url: "/app/orders",
      }}
    >
      <BlockStack gap="500">
        {/* Stats Cards */}
        <Layout>
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <Text as="p" variant="bodyMd" tone="subdued">
                  Total Invoices
                </Text>
                <Text as="p" variant="heading2xl">
                  {stats.total}
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <Text as="p" variant="bodyMd" tone="subdued">
                  Generated
                </Text>
                <Text as="p" variant="heading2xl">
                  {stats.generated}
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <Text as="p" variant="bodyMd" tone="subdued">
                  Total Amount
                </Text>
                <Text as="p" variant="heading2xl">
                  {formatCurrency(stats.totalAmount)}
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {/* Filters and Search */}
        <Card>
          <BlockStack gap="400">
            <InlineStack gap="400" align="space-between" blockAlign="end">
              <div style={{ flex: 1, maxWidth: "400px" }}>
                <TextField
                  label="Search invoices"
                  value={searchValue}
                  onChange={handleSearchChange}
                  placeholder="Search by invoice or order number"
                  autoComplete="off"
                  clearButton
                  onClearButtonClick={() => setSearchValue("")}
                />
              </div>
              
              <div style={{ minWidth: "200px" }}>
                <Select
                  label="Status"
                  value={statusFilter}
                  onChange={handleFilterChange}
                  options={[
                    { label: "All Status", value: "all" },
                    { label: "Generated", value: "generated" },
                    { label: "Failed", value: "failed" },
                    { label: "Pending", value: "pending" },
                  ]}
                />
              </div>
            </InlineStack>
          </BlockStack>
        </Card>

        {/* Invoice Table */}
        <Card padding="0">
          {invoices.length === 0 ? (
            <div style={{ padding: "32px" }}>{emptyStateMarkup}</div>
          ) : (
            <DataTable
              columnContentTypes={[
                "text",
                "text",
                "text",
                "numeric",
                "numeric",
                "text",
                "text",
              ]}
              headings={[
                "Invoice Number",
                "Order",
                "Date",
                "Total",
                "GST Amount",
                "Status",
                "Actions",
              ]}
              rows={rows}
              hoverable
            />
          )}
        </Card>
      </BlockStack>
    </Page>
  );
}
