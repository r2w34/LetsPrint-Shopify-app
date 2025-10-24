import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation, useActionData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  DataTable,
  Button,
  Modal,
  TextField,
  FormLayout,
  Banner,
  EmptyState,
  BlockStack,
  InlineStack,
  Text,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";
import { useState, useCallback, useEffect } from "react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const hsnCodes = await db.hSNCode.findMany({
    where: { shop: session.shop },
    orderBy: { code: "asc" },
  });

  return json({ hsnCodes });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  try {
    if (intent === "create") {
      const code = formData.get("code") as string;
      const description = formData.get("description") as string;
      const gstRate = parseFloat(formData.get("gstRate") as string);

      await db.hSNCode.create({
        data: {
          shop: session.shop,
          code,
          description,
          gstRate,
        },
      });

      return json({ success: true, message: "HSN code created successfully" });
    }

    if (intent === "update") {
      const id = formData.get("id") as string;
      const code = formData.get("code") as string;
      const description = formData.get("description") as string;
      const gstRate = parseFloat(formData.get("gstRate") as string);

      await db.hSNCode.update({
        where: { id },
        data: {
          code,
          description,
          gstRate,
        },
      });

      return json({ success: true, message: "HSN code updated successfully" });
    }

    if (intent === "delete") {
      const id = formData.get("id") as string;

      await db.hSNCode.delete({
        where: { id },
      });

      return json({ success: true, message: "HSN code deleted successfully" });
    }

    return json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("HSN code action error:", error);
    return json({ success: false, error: error.message }, { status: 500 });
  }
};

export default function HSNCodesPage() {
  const { hsnCodes } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const navigation = useNavigation();

  const [modalActive, setModalActive] = useState(false);
  const [editingHSN, setEditingHSN] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);

  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [gstRate, setGstRate] = useState("");

  const isSubmitting = navigation.state === "submitting";

  useEffect(() => {
    if (actionData?.success) {
      setShowBanner(true);
      setModalActive(false);
      setEditingHSN(null);
      setCode("");
      setDescription("");
      setGstRate("");
      
      const timer = setTimeout(() => setShowBanner(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [actionData]);

  const handleOpenModal = useCallback((hsn?: any) => {
    if (hsn) {
      setEditingHSN(hsn);
      setCode(hsn.code);
      setDescription(hsn.description);
      setGstRate(hsn.gstRate.toString());
    } else {
      setEditingHSN(null);
      setCode("");
      setDescription("");
      setGstRate("");
    }
    setModalActive(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalActive(false);
    setEditingHSN(null);
    setCode("");
    setDescription("");
    setGstRate("");
  }, []);

  const handleSubmit = useCallback(() => {
    const formData = new FormData();
    formData.append("intent", editingHSN ? "update" : "create");
    if (editingHSN) {
      formData.append("id", editingHSN.id);
    }
    formData.append("code", code);
    formData.append("description", description);
    formData.append("gstRate", gstRate);

    submit(formData, { method: "post" });
  }, [editingHSN, code, description, gstRate, submit]);

  const handleDelete = useCallback((id: string) => {
    if (confirm("Are you sure you want to delete this HSN code?")) {
      const formData = new FormData();
      formData.append("intent", "delete");
      formData.append("id", id);
      submit(formData, { method: "post" });
    }
  }, [submit]);

  const rows = hsnCodes.map((hsn) => [
    hsn.code,
    hsn.description,
    `${hsn.gstRate}%`,
    <InlineStack gap="200" key={hsn.id}>
      <Button size="slim" onClick={() => handleOpenModal(hsn)}>
        Edit
      </Button>
      <Button size="slim" tone="critical" onClick={() => handleDelete(hsn.id)}>
        Delete
      </Button>
    </InlineStack>,
  ]);

  return (
    <Page
      title="HSN Codes"
      subtitle="Manage HSN/SAC codes and GST rates for your products"
      primaryAction={{
        content: "Add HSN Code",
        onAction: () => handleOpenModal(),
      }}
    >
      <BlockStack gap="500">
        {showBanner && actionData?.success && (
          <Banner tone="success" onDismiss={() => setShowBanner(false)}>
            {actionData.message}
          </Banner>
        )}

        {showBanner && actionData?.success === false && (
          <Banner tone="critical" onDismiss={() => setShowBanner(false)}>
            {actionData.error || "An error occurred"}
          </Banner>
        )}

        <Layout>
          <Layout.Section>
            <Card>
              {hsnCodes.length > 0 ? (
                <DataTable
                  columnContentTypes={["text", "text", "text", "text"]}
                  headings={["HSN/SAC Code", "Description", "GST Rate", "Actions"]}
                  rows={rows}
                />
              ) : (
                <EmptyState
                  heading="No HSN codes yet"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                  action={{
                    content: "Add HSN Code",
                    onAction: () => handleOpenModal(),
                  }}
                >
                  <p>Add HSN/SAC codes to automatically calculate GST for your products.</p>
                </EmptyState>
              )}
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  About HSN Codes
                </Text>
                <Text as="p" variant="bodyMd">
                  HSN (Harmonized System of Nomenclature) codes are used to classify products for GST purposes.
                </Text>
                <Text as="p" variant="bodyMd">
                  Each product should have an HSN code with the applicable GST rate (0%, 5%, 12%, 18%, or 28%).
                </Text>
                <Text as="p" variant="bodyMd">
                  Common HSN codes:
                </Text>
                <ul style={{ marginLeft: "20px" }}>
                  <li>6109 - T-shirts (12%)</li>
                  <li>6203 - Men's suits (12%)</li>
                  <li>6204 - Women's suits (12%)</li>
                  <li>8517 - Mobile phones (18%)</li>
                  <li>8471 - Computers (18%)</li>
                </ul>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        <Modal
          open={modalActive}
          onClose={handleCloseModal}
          title={editingHSN ? "Edit HSN Code" : "Add HSN Code"}
          primaryAction={{
            content: editingHSN ? "Update" : "Add",
            onAction: handleSubmit,
            loading: isSubmitting,
            disabled: !code || !description || !gstRate,
          }}
          secondaryActions={[
            {
              content: "Cancel",
              onAction: handleCloseModal,
            },
          ]}
        >
          <Modal.Section>
            <FormLayout>
              <TextField
                label="HSN/SAC Code"
                value={code}
                onChange={setCode}
                placeholder="e.g., 6109"
                helpText="4 to 8 digit HSN or SAC code"
                autoComplete="off"
              />

              <TextField
                label="Description"
                value={description}
                onChange={setDescription}
                placeholder="e.g., Cotton T-shirts"
                helpText="Product category description"
                autoComplete="off"
              />

              <TextField
                label="GST Rate (%)"
                type="number"
                value={gstRate}
                onChange={setGstRate}
                placeholder="e.g., 12"
                helpText="Enter GST rate: 0, 5, 12, 18, or 28"
                autoComplete="off"
                min="0"
                max="100"
                step="0.01"
              />
            </FormLayout>
          </Modal.Section>
        </Modal>
      </BlockStack>
    </Page>
  );
}
