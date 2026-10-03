import { Form, Link, useNavigation } from "react-router";
import type { Route } from "./+types/forgot-password";
import { AuthCard, BackLink, Button, Field, FormMessage, IconTile, Input, Label } from "@spark/ui-web";
import { requestPasswordReset } from "../lib/auth.client";
import styles from "./login.module.css";

export async function clientLoader() { return null; }

export function HydrateFallback() {
  return <AuthCard title="Recuperar acesso" pending="Preparando recuperação de acesso…" />;
}

export async function clientAction({ request }: Route.ClientActionArgs) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { sent: false, error: "Informe seu e-mail." };

  try {
    await requestPasswordReset(email);
    return { sent: true, error: null };
  } catch {
    return { sent: false, error: "Não foi possível enviar a recuperação agora. Tente novamente." };
  }
}

export default function ForgotPassword({ actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  if (actionData?.sent) {
    return (
      <AuthCard mark={<IconTile icon="mail" size="xl" tone="success" />} title="Confira seu e-mail" description="Se houver uma conta com esse endereço, enviaremos as instruções para criar uma nova senha.">
        <BackLink render={<Link to="/login" />}>Voltar para o login</BackLink>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Recuperar acesso" description="Informe seu e-mail para receber as instruções de recuperação.">
      <Form method="post" className={styles.form}>
        <Field invalid={!!actionData?.error}>
          <Label>E-mail</Label>
          <Input type="email" name="email" placeholder="voce@empresa.com" required autoFocus autoComplete="email" />
        </Field>
        {actionData?.error && <FormMessage>{actionData.error}</FormMessage>}
        <Button type="submit" size="lg" loading={isSubmitting} className={styles.submit}>Enviar instruções</Button>
        <BackLink render={<Link to="/login" />}>Voltar para o login</BackLink>
      </Form>
    </AuthCard>
  );
}
