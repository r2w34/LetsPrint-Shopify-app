import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";

import { login } from "../../shopify.server";

import styles from "./styles.module.css";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
};

export default function App() {
  const { showForm } = useLoaderData<typeof loader>();

  return (
    <div className={styles.index}>
      <div className={styles.content}>
        <h1 className={styles.heading}>LetsPrint - GST Compliant Invoice Generator</h1>
        <p className={styles.text}>
          Professional GST-compliant invoices for your Shopify store with just one click. 
          Streamline your billing process with automatic invoice generation, email delivery, and comprehensive tax management.
        </p>
        {showForm && (
          <Form className={styles.form} method="post" action="/auth/login">
            <label className={styles.label}>
              <span>Shop domain</span>
              <input className={styles.input} type="text" name="shop" />
              <span>e.g: my-shop-domain.myshopify.com</span>
            </label>
            <button className={styles.button} type="submit">
              Log in
            </button>
          </Form>
        )}
        <ul className={styles.list}>
          <li>
            <strong>GST Compliance</strong>. Generate fully compliant GST invoices with automatic tax calculations, HSN codes, and proper formatting as per Indian tax regulations.
          </li>
          <li>
            <strong>Email Delivery</strong>. Automatically send professional invoices to your customers via email with customizable templates and branding options.
          </li>
          <li>
            <strong>Bulk Processing</strong>. Generate and process multiple invoices at once with our powerful bulk invoice generation and queue management system.
          </li>
          <li>
            <strong>Template Customization</strong>. Choose from multiple professional invoice templates and customize them to match your brand identity.
          </li>
          <li>
            <strong>HSN Code Management</strong>. Built-in HSN code database with easy product mapping for accurate tax classification and reporting.
          </li>
          <li>
            <strong>Cloud Storage</strong>. Securely store and access all your invoices with AWS S3 integration and organized invoice history management.
          </li>
        </ul>
      </div>
    </div>
  );
}
