import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation, useActionData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  FormLayout,
  TextField,
  Select,
  Button,
  BlockStack,
  Banner,
  Tabs,
  Divider,
  Text,
  InlineStack,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";
import { useState, useCallback, useEffect } from "react";

const INDIAN_STATES = [
  { label: "Select State", value: "" },
  { label: "Andhra Pradesh", value: "AP" },
  { label: "Arunachal Pradesh", value: "AR" },
  { label: "Assam", value: "AS" },
  { label: "Bihar", value: "BR" },
  { label: "Chhattisgarh", value: "CG" },
  { label: "Goa", value: "GA" },
  { label: "Gujarat", value: "GJ" },
  { label: "Haryana", value: "HR" },
  { label: "Himachal Pradesh", value: "HP" },
  { label: "Jharkhand", value: "JH" },
  { label: "Karnataka", value: "KA" },
  { label: "Kerala", value: "KL" },
  { label: "Madhya Pradesh", value: "MP" },
  { label: "Maharashtra", value: "MH" },
  { label: "Manipur", value: "MN" },
  { label: "Meghalaya", value: "ML" },
  { label: "Mizoram", value: "MZ" },
  { label: "Nagaland", value: "NL" },
  { label: "Odisha", value: "OR" },
  { label: "Punjab", value: "PB" },
  { label: "Rajasthan", value: "RJ" },
  { label: "Sikkim", value: "SK" },
  { label: "Tamil Nadu", value: "TN" },
  { label: "Telangana", value: "TS" },
  { label: "Tripura", value: "TR" },
  { label: "Uttar Pradesh", value: "UP" },
  { label: "Uttarakhand", value: "UK" },
  { label: "West Bengal", value: "WB" },
  { label: "Delhi", value: "DL" },
];

const DATE_FORMATS = [
  { label: "DD/MM/YYYY", value: "DD/MM/YYYY" },
  { label: "MM/DD/YYYY", value: "MM/DD/YYYY" },
  { label: "YYYY-MM-DD", value: "YYYY-MM-DD" },
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  let businessInfo = await db.businessInfo.findUnique({
    where: { shop: session.shop },
  });

  if (!businessInfo) {
    businessInfo = await db.businessInfo.create({
      data: {
        shop: session.shop,
        country: "India",
      },
    });
  }

  let settings = await db.settings.findUnique({
    where: { shop: session.shop },
  });

  if (!settings) {
    settings = await db.settings.create({
      data: {
        shop: session.shop,
        defaultState: "MH",
        invoicePrefix: "INV",
        invoiceStartNumber: 1001,
        dateFormat: "DD/MM/YYYY",
      },
    });
  }

  return json({ businessInfo, settings });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  try {
    if (intent === "save-business-info") {
      await db.businessInfo.upsert({
        where: { shop: session.shop },
        update: {
          businessName: formData.get("businessName") as string || null,
          gstin: formData.get("gstin") as string || null,
          address: formData.get("address") as string || null,
          city: formData.get("city") as string || null,
          state: formData.get("state") as string || null,
          pincode: formData.get("pincode") as string || null,
          email: formData.get("email") as string || null,
          phone: formData.get("phone") as string || null,
          website: formData.get("website") as string || null,
          pan: formData.get("pan") as string || null,
          bankName: formData.get("bankName") as string || null,
          bankAccountNumber: formData.get("bankAccountNumber") as string || null,
          bankIfscCode: formData.get("bankIfscCode") as string || null,
          bankBranch: formData.get("bankBranch") as string || null,
          termsAndConditions: formData.get("termsAndConditions") as string || null,
          logoUrl: formData.get("logoUrl") as string || null,
          signatureUrl: formData.get("signatureUrl") as string || null,
        },
        create: {
          shop: session.shop,
          businessName: formData.get("businessName") as string || null,
          gstin: formData.get("gstin") as string || null,
          address: formData.get("address") as string || null,
          city: formData.get("city") as string || null,
          state: formData.get("state") as string || null,
          pincode: formData.get("pincode") as string || null,
          email: formData.get("email") as string || null,
          phone: formData.get("phone") as string || null,
          website: formData.get("website") as string || null,
          pan: formData.get("pan") as string || null,
          bankName: formData.get("bankName") as string || null,
          bankAccountNumber: formData.get("bankAccountNumber") as string || null,
          bankIfscCode: formData.get("bankIfscCode") as string || null,
          bankBranch: formData.get("bankBranch") as string || null,
          termsAndConditions: formData.get("termsAndConditions") as string || null,
          logoUrl: formData.get("logoUrl") as string || null,
          signatureUrl: formData.get("signatureUrl") as string || null,
          country: "India",
        },
      });

      return json({ success: true, message: "Business information saved successfully", tab: 0 });
    }

    if (intent === "save-invoice-settings") {
      await db.settings.upsert({
        where: { shop: session.shop },
        update: {
          defaultState: formData.get("defaultState") as string,
          invoicePrefix: formData.get("invoicePrefix") as string,
          invoiceStartNumber: parseInt(formData.get("invoiceStartNumber") as string || "1001"),
          dateFormat: formData.get("dateFormat") as string,
        },
        create: {
          shop: session.shop,
          defaultState: formData.get("defaultState") as string || "MH",
          invoicePrefix: formData.get("invoicePrefix") as string || "INV",
          invoiceStartNumber: parseInt(formData.get("invoiceStartNumber") as string || "1001"),
          dateFormat: formData.get("dateFormat") as string || "DD/MM/YYYY",
        },
      });

      return json({ success: true, message: "Invoice settings saved successfully", tab: 1 });
    }

    if (intent === "save-email-settings") {
      await db.settings.upsert({
        where: { shop: session.shop },
        update: {
          smtpHost: formData.get("smtpHost") as string || null,
          smtpPort: formData.get("smtpPort") ? parseInt(formData.get("smtpPort") as string) : null,
          smtpUser: formData.get("smtpUser") as string || null,
          smtpPassword: formData.get("smtpPassword") as string || null,
          smtpFromEmail: formData.get("smtpFromEmail") as string || null,
          autoSendInvoice: formData.get("autoSendInvoice") === "true",
        },
        create: {
          shop: session.shop,
          defaultState: "MH",
          invoicePrefix: "INV",
          invoiceStartNumber: 1001,
          dateFormat: "DD/MM/YYYY",
          smtpHost: formData.get("smtpHost") as string || null,
          smtpPort: formData.get("smtpPort") ? parseInt(formData.get("smtpPort") as string) : null,
          smtpUser: formData.get("smtpUser") as string || null,
          smtpPassword: formData.get("smtpPassword") as string || null,
          smtpFromEmail: formData.get("smtpFromEmail") as string || null,
          autoSendInvoice: formData.get("autoSendInvoice") === "true",
        },
      });

      return json({ success: true, message: "Email settings saved successfully", tab: 2 });
    }

    return json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Settings action error:", error);
    return json({ success: false, error: error.message }, { status: 500 });
  }
};

export default function SettingsPage() {
  const { businessInfo, settings } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const navigation = useNavigation();

  const [selected, setSelected] = useState(0);
  const [showBanner, setShowBanner] = useState(false);
  
  // Controlled state for ALL form fields
  const [businessName, setBusinessName] = useState(businessInfo.businessName || "");
  const [gstin, setGstin] = useState(businessInfo.gstin || "");
  const [pan, setPan] = useState(businessInfo.pan || "");
  const [address, setAddress] = useState(businessInfo.address || "");
  const [city, setCity] = useState(businessInfo.city || "");
  const [businessState, setBusinessState] = useState(businessInfo.state || "");
  const [pincode, setPincode] = useState(businessInfo.pincode || "");
  const [phone, setPhone] = useState(businessInfo.phone || "");
  const [email, setEmail] = useState(businessInfo.email || "");
  const [website, setWebsite] = useState(businessInfo.website || "");
  const [bankName, setBankName] = useState(businessInfo.bankName || "");
  const [bankAccountNumber, setBankAccountNumber] = useState(businessInfo.bankAccountNumber || "");
  const [bankIfscCode, setBankIfscCode] = useState(businessInfo.bankIfscCode || "");
  const [bankBranch, setBankBranch] = useState(businessInfo.bankBranch || "");
  const [logoUrl, setLogoUrl] = useState(businessInfo.logoUrl || "");
  const [signatureUrl, setSignatureUrl] = useState(businessInfo.signatureUrl || "");
  const [termsAndConditions, setTermsAndConditions] = useState(businessInfo.termsAndConditions || "");
  
  const [invoicePrefix, setInvoicePrefix] = useState(settings.invoicePrefix);
  const [invoiceStartNumber, setInvoiceStartNumber] = useState(settings.invoiceStartNumber.toString());
  const [defaultState, setDefaultState] = useState(settings.defaultState || "MH");
  const [dateFormat, setDateFormat] = useState(settings.dateFormat || "DD/MM/YYYY");
  
  const [smtpHost, setSmtpHost] = useState(settings.smtpHost || "");
  const [smtpPort, setSmtpPort] = useState(settings.smtpPort?.toString() || "587");
  const [smtpUser, setSmtpUser] = useState(settings.smtpUser || "");
  const [smtpPassword, setSmtpPassword] = useState(settings.smtpPassword || "");
  const [smtpFromEmail, setSmtpFromEmail] = useState(settings.smtpFromEmail || "");
  const [autoSendInvoice, setAutoSendInvoice] = useState(settings.autoSendInvoice ? "true" : "false");

  const isSaving = navigation.state === "submitting";

  useEffect(() => {
    if (actionData?.success) {
      setShowBanner(true);
      if (actionData.tab !== undefined) {
        setSelected(actionData.tab);
      }
      const timer = setTimeout(() => setShowBanner(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [actionData]);

  const handleTabChange = useCallback((selectedTabIndex: number) => {
    setSelected(selectedTabIndex);
  }, []);

  const tabs = [
    {
      id: 'business-info',
      content: 'Business Information',
      panelID: 'business-info-panel',
    },
    {
      id: 'invoice-settings',
      content: 'Invoice Settings',
      panelID: 'invoice-settings-panel',
    },
    {
      id: 'email-settings',
      content: 'Email Settings',
      panelID: 'email-settings-panel',
    },
  ];

  const handleBusinessInfoSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData();
    formData.append("intent", "save-business-info");
    formData.append("businessName", businessName);
    formData.append("gstin", gstin);
    formData.append("pan", pan);
    formData.append("address", address);
    formData.append("city", city);
    formData.append("state", businessState);
    formData.append("pincode", pincode);
    formData.append("phone", phone);
    formData.append("email", email);
    formData.append("website", website);
    formData.append("bankName", bankName);
    formData.append("bankAccountNumber", bankAccountNumber);
    formData.append("bankIfscCode", bankIfscCode);
    formData.append("bankBranch", bankBranch);
    formData.append("logoUrl", logoUrl);
    formData.append("signatureUrl", signatureUrl);
    formData.append("termsAndConditions", termsAndConditions);
    submit(formData, { method: "post" });
  };

  const handleInvoiceSettingsSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData();
    formData.append("intent", "save-invoice-settings");
    formData.append("defaultState", defaultState);
    formData.append("invoicePrefix", invoicePrefix);
    formData.append("invoiceStartNumber", invoiceStartNumber);
    formData.append("dateFormat", dateFormat);
    submit(formData, { method: "post" });
  };

  const handleEmailSettingsSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData();
    formData.append("intent", "save-email-settings");
    formData.append("smtpHost", smtpHost);
    formData.append("smtpPort", smtpPort);
    formData.append("smtpUser", smtpUser);
    formData.append("smtpPassword", smtpPassword);
    formData.append("smtpFromEmail", smtpFromEmail);
    formData.append("autoSendInvoice", autoSendInvoice);
    submit(formData, { method: "post" });
  };

  return (
    <Page title="Settings" subtitle="Configure your business information and app settings">
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
              <Tabs tabs={tabs} selected={selected} onSelect={handleTabChange}>
                <BlockStack gap="400">
                  {/* Tab 1: Business Information */}
                  {selected === 0 && (
                    <form onSubmit={handleBusinessInfoSubmit}>
                      <BlockStack gap="500">
                        <BlockStack gap="400">
                          <Text as="h2" variant="headingMd">
                            Company Details
                          </Text>
                          
                          <FormLayout>
                            <TextField
                              label="Business Name"
                              value={businessName}
                              onChange={setBusinessName}
                              autoComplete="organization"
                            />
                            
                            <TextField
                              label="GSTIN"
                              value={gstin}
                              onChange={setGstin}
                              helpText="Your 15-digit GST Identification Number"
                              autoComplete="off"
                            />
                            
                            <TextField
                              label="PAN Number"
                              value={pan}
                              onChange={setPan}
                              helpText="Permanent Account Number"
                              autoComplete="off"
                            />
                            
                            <TextField
                              label="Address"
                              value={address}
                              onChange={setAddress}
                              multiline={3}
                              autoComplete="street-address"
                            />
                            
                            <FormLayout.Group>
                              <TextField
                                label="City"
                                value={city}
                                onChange={setCity}
                                autoComplete="address-level2"
                              />
                              
                              <Select
                                label="State"
                                options={INDIAN_STATES}
                                value={businessState}
                                onChange={setBusinessState}
                              />
                            </FormLayout.Group>
                            
                            <FormLayout.Group>
                              <TextField
                                label="PIN Code"
                                value={pincode}
                                onChange={setPincode}
                                autoComplete="postal-code"
                              />
                              
                              <TextField
                                label="Phone"
                                value={phone}
                                onChange={setPhone}
                                type="tel"
                                autoComplete="tel"
                              />
                            </FormLayout.Group>
                            
                            <FormLayout.Group>
                              <TextField
                                label="Email"
                                value={email}
                                onChange={setEmail}
                                type="email"
                                autoComplete="email"
                              />
                              
                              <TextField
                                label="Website"
                                value={website}
                                onChange={setWebsite}
                                type="url"
                                autoComplete="url"
                              />
                            </FormLayout.Group>
                          </FormLayout>
                        </BlockStack>

                        <Divider />

                        <BlockStack gap="400">
                          <Text as="h2" variant="headingMd">
                            Bank Details
                          </Text>
                          
                          <FormLayout>
                            <TextField
                              label="Bank Name"
                              value={bankName}
                              onChange={setBankName}
                              autoComplete="off"
                            />
                            
                            <FormLayout.Group>
                              <TextField
                                label="Account Number"
                                value={bankAccountNumber}
                                onChange={setBankAccountNumber}
                                autoComplete="off"
                              />
                              
                              <TextField
                                label="IFSC Code"
                                value={bankIfscCode}
                                onChange={setBankIfscCode}
                                autoComplete="off"
                              />
                            </FormLayout.Group>
                            
                            <TextField
                              label="Bank Branch"
                              value={bankBranch}
                              onChange={setBankBranch}
                              autoComplete="off"
                            />
                          </FormLayout>
                        </BlockStack>

                        <Divider />

                        <BlockStack gap="400">
                          <Text as="h2" variant="headingMd">
                            Branding
                          </Text>
                          
                          <FormLayout>
                            <BlockStack gap="200">
                              {logoUrl && (
                                <div style={{ marginBottom: '10px' }}>
                                  <Text as="p" variant="bodySm">Current Logo:</Text>
                                  <img 
                                    src={logoUrl} 
                                    alt="Company Logo" 
                                    style={{ maxWidth: '200px', maxHeight: '100px', marginTop: '8px', border: '1px solid #ddd', padding: '4px' }} 
                                  />
                                </div>
                              )}
                              <TextField
                                label="Logo URL"
                                value={logoUrl}
                                onChange={setLogoUrl}
                                type="url"
                                helpText="Enter a direct URL to your logo image"
                                autoComplete="off"
                              />
                            </BlockStack>
                            
                            <BlockStack gap="200">
                              {signatureUrl && (
                                <div style={{ marginBottom: '10px' }}>
                                  <Text as="p" variant="bodySm">Current Signature:</Text>
                                  <img 
                                    src={signatureUrl} 
                                    alt="Signature" 
                                    style={{ maxWidth: '200px', maxHeight: '80px', marginTop: '8px', border: '1px solid #ddd', padding: '4px' }} 
                                  />
                                </div>
                              )}
                              <TextField
                                label="Signature URL"
                                value={signatureUrl}
                                onChange={setSignatureUrl}
                                type="url"
                                helpText="Enter a direct URL to your signature image"
                                autoComplete="off"
                              />
                            </BlockStack>
                          </FormLayout>
                        </BlockStack>

                        <Divider />

                        <BlockStack gap="400">
                          <Text as="h2" variant="headingMd">
                            Terms & Conditions
                          </Text>
                          
                          <TextField
                            label="Terms and Conditions"
                            value={termsAndConditions}
                            onChange={setTermsAndConditions}
                            multiline={6}
                            helpText="These terms will be displayed at the bottom of your invoices"
                            autoComplete="off"
                          />
                        </BlockStack>

                        <InlineStack align="end">
                          <Button submit variant="primary" loading={isSaving}>
                            Save Business Information
                          </Button>
                        </InlineStack>
                      </BlockStack>
                    </form>
                  )}

                  {/* Tab 2: Invoice Settings */}
                  {selected === 1 && (
                    <form onSubmit={handleInvoiceSettingsSubmit}>
                      <BlockStack gap="500">
                        <FormLayout>
                          <Select
                            label="Default State"
                            options={INDIAN_STATES}
                            value={defaultState}
                            onChange={setDefaultState}
                            helpText="Your business location state (for GST calculation)"
                          />
                          
                          <FormLayout.Group>
                            <TextField
                              label="Invoice Prefix"
                              value={invoicePrefix}
                              onChange={setInvoicePrefix}
                              helpText="e.g., INV, INVOICE"
                            />
                            
                            <TextField
                              label="Starting Invoice Number"
                              type="number"
                              value={invoiceStartNumber}
                              onChange={setInvoiceStartNumber}
                              helpText="First invoice will start from this number"
                            />
                          </FormLayout.Group>
                          
                          <Select
                            label="Date Format"
                            options={DATE_FORMATS}
                            value={dateFormat}
                            onChange={setDateFormat}
                            helpText="How dates will appear on invoices"
                          />
                        </FormLayout>

                        <InlineStack align="end">
                          <Button submit variant="primary" loading={isSaving}>
                            Save Invoice Settings
                          </Button>
                        </InlineStack>
                      </BlockStack>
                    </form>
                  )}

                  {/* Tab 3: Email Settings */}
                  {selected === 2 && (
                    <form onSubmit={handleEmailSettingsSubmit}>
                      <BlockStack gap="500">
                        <Banner tone="info">
                          Configure SMTP settings to automatically send invoices via email. Leave blank to disable email functionality.
                        </Banner>

                        <FormLayout>
                          <FormLayout.Group>
                            <TextField
                              label="SMTP Host"
                              value={smtpHost}
                              onChange={setSmtpHost}
                              helpText="e.g., smtp.gmail.com"
                              autoComplete="off"
                            />
                            
                            <TextField
                              label="SMTP Port"
                              type="number"
                              value={smtpPort}
                              onChange={setSmtpPort}
                              helpText="Usually 587 or 465"
                              autoComplete="off"
                            />
                          </FormLayout.Group>
                          
                          <TextField
                            label="SMTP Username"
                            value={smtpUser}
                            onChange={setSmtpUser}
                            autoComplete="username"
                          />
                          
                          <TextField
                            label="SMTP Password"
                            type="password"
                            value={smtpPassword}
                            onChange={setSmtpPassword}
                            helpText="Your SMTP password or app-specific password"
                            autoComplete="current-password"
                          />
                          
                          <TextField
                            label="From Email"
                            type="email"
                            value={smtpFromEmail}
                            onChange={setSmtpFromEmail}
                            helpText="Email address that invoices will be sent from"
                            autoComplete="email"
                          />
                          
                          <Select
                            label="Auto-send Invoices"
                            options={[
                              { label: "No, manual send only", value: "false" },
                              { label: "Yes, send automatically after generation", value: "true" },
                            ]}
                            value={autoSendInvoice}
                            onChange={setAutoSendInvoice}
                          />
                        </FormLayout>

                        <InlineStack align="end">
                          <Button submit variant="primary" loading={isSaving}>
                            Save Email Settings
                          </Button>
                        </InlineStack>
                      </BlockStack>
                    </form>
                  )}
                </BlockStack>
              </Tabs>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
