import { useState } from "react";
import { useLoaderData } from "react-router";
import { publicFormsControllerGet, publicFormsControllerSubmit } from "@spark/api-client";
import { formSubmissionId, type LeadFormField } from "@spark/core";
import { Field, Input, Label, LeadFormRenderer, notify } from "@spark/ui-web";
import styles from "./public-form.module.css";
export async function clientLoader({ params }: { params: { publicKey?: string } }) {
  if (!params.publicKey) throw new Error("Formulário inválido.");
  return publicFormsControllerGet(params.publicKey);
}
export function HydrateFallback() {
  return (
    <main className={styles.page}>
      <span>Carregando formulário…</span>
    </main>
  );
}
export default function PublicForm() {
  const form = useLoaderData<typeof clientLoader>();
  const fields: LeadFormField[] = (form.fields ?? []).map((field) => ({
    ...field,
    required: field.required ?? false,
    options: Array.isArray(field.options) ? field.options : [],
  }));
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [website, setWebsite] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  async function submit() {
    setSubmitting(true);
    try {
      const response = await publicFormsControllerSubmit(form.publicKey, {
        id: formSubmissionId.create(),
        values,
        website,
      });
      setSuccess(response.successMessage);
    } catch (error) {
      notify({
        title: "Não foi possível enviar",
        description: error instanceof Error ? error.message : "Revise os dados.",
        tone: "error",
      });
      throw error;
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <main className={styles.page}>
      <div className={styles.brand}>
        <img src="/brand/leonardo-scapinello-ink.svg" alt="Leonardo Scapinello" />
      </div>
      <div className={styles.honeypot} aria-hidden="true">
        <Field>
          <Label>Website</Label>
          <Input
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
          />
        </Field>
      </div>
      <LeadFormRenderer
        title={form.title}
        description={form.description}
        fields={fields}
        submitLabel={form.submitLabel}
        values={values}
        onValueChange={(id, value) => setValues((current) => ({ ...current, [id]: value }))}
        onSubmit={submit}
        submitting={submitting}
        successMessage={success}
      />
    </main>
  );
}
