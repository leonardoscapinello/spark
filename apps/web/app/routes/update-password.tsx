import { Form, Link, redirect, useNavigation } from "react-router";
import type { Route } from "./+types/update-password";
import { AuthCard, BackLink, Button, Field, FormMessage, IconTile, Label, PasswordInput } from "@spark/ui-web";
import { hasPasswordRecoverySession, updatePassword } from "../lib/auth.client";
import styles from "./login.module.css";

export async function clientLoader() {
  return { ready: await hasPasswordRecoverySession() };
}

export function HydrateFallback() {
  return <AuthCard title="Crie uma nova senha" pending="Preparando recuperação de acesso…" />;
}

export async function clientAction({ request }: Route.ClientActionArgs) {
  const formData = await request.formData();
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");

  if (password.length < 12) return { error: "Use pelo menos 12 caracteres." };
  if (password !== confirmation) return { error: "As senhas não coincidem." };

  try {
    await updatePassword(password);
    return redirect("/login?password=updated");
  } catch {
    return { error: "O link expirou ou não é válido. Solicite uma nova recuperação." };
  }
}

export default function UpdatePassword({ actionData, loaderData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  if (!loaderData.ready) return <AuthCard mark={<IconTile icon="lock" size="xl" />} title="Link inválido ou expirado" description="Solicite um novo link para criar sua senha.">
    <BackLink render={<Link to="/forgot-password" />}>Solicitar novo link</BackLink>
  </AuthCard>;

  return (
    <AuthCard title="Crie uma nova senha" description="Use pelo menos 12 caracteres e evite senhas utilizadas em outros serviços.">
      <Form method="post" className={styles.form}>
        <Field invalid={!!actionData?.error}>
          <Label>Nova senha</Label>
          <PasswordInput name="password" required autoFocus autoComplete="new-password" />
        </Field>
        <Field invalid={!!actionData?.error}>
          <Label>Confirme a nova senha</Label>
          <PasswordInput name="confirmation" required autoComplete="new-password" />
        </Field>
        {actionData?.error && <FormMessage>{actionData.error}</FormMessage>}
        <Button type="submit" size="lg" loading={isSubmitting} className={styles.submit}>Salvar nova senha</Button>
      </Form>
    </AuthCard>
  );
}
