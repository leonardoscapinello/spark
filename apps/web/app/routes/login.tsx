import { Form, redirect, useNavigation } from "react-router";
import type { Route } from "./+types/login";
import { devLogin } from "@spark/api-client";
import { orgId as orgIdFactory } from "@spark/core";
import { Button, Field, Glass, Input, Label } from "@spark/ui-web";
import { saveSession } from "../lib/auth.client";
import styles from "./login.module.css";

export async function clientAction({ request }: Route.ClientActionArgs) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();

  if (!email) {
    return { error: "Informe um e-mail." };
  }

  try {
    const response = await devLogin(name ? { email, name } : { email });
    saveSession({ ...response, orgId: orgIdFactory.from(response.orgId) });
    return redirect("/");
  } catch {
    return { error: "Não foi possível entrar. Confira o e-mail e tente de novo." };
  }
}

export default function Login({ actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <main className={styles.container}>
      <Glass className={styles.card ?? ""}>
        <h1 className={styles.titulo}>Spark</h1>
        <p className={styles.subtitulo}>
          Login de desenvolvimento — entra ou cria sua conta pelo e-mail, sem senha.
        </p>

        <Form method="post" className={styles.form}>
          <Field invalid={!!actionData?.error}>
            <Label>E-mail</Label>
            <Input type="email" name="email" placeholder="voce@empresa.com" required autoFocus />
          </Field>

          <Field>
            <Label>Nome (opcional)</Label>
            <Input type="text" name="name" placeholder="Seu nome" />
          </Field>

          {/* Submission error, not a specific field's — ErrorText
           * (Field.Error from Base UI) requires a <Field.Root> context,
           * doesn't work for a whole-form message. */}
          {actionData?.error && <p className={styles.erroGeral}>{actionData.error}</p>}

          <Button type="submit" loading={isSubmitting}>
            Entrar
          </Button>
        </Form>
      </Glass>
    </main>
  );
}
