import { Form, Link, useNavigation } from "react-router";
import type { Route } from "./+types/forgot-password";
import { Button, Field, Input, Label } from "@spark/ui-web";
import { requestPasswordReset } from "../lib/auth.client";
import styles from "./login.module.css";

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
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2>Confira seu e-mail</h2>
          <p>Se houver uma conta com esse endereço, enviaremos as instruções para criar uma nova senha.</p>
        </div>
        <Link to="/login" className={styles.returnLink}>Voltar para o login</Link>
      </div>
    );
  }

  return (
    <Form method="post" className={styles.card}>
      <div className={styles.cardHeader}>
        <h2>Recuperar acesso</h2>
        <p>Informe seu e-mail para receber as instruções de recuperação.</p>
      </div>
      <div className={styles.form}>
        <Field invalid={!!actionData?.error}>
          <Label>E-mail</Label>
          <Input type="email" name="email" placeholder="voce@empresa.com" required autoFocus autoComplete="email" />
        </Field>
        {actionData?.error && <p className={styles.erroGeral} role="alert">{actionData.error}</p>}
      </div>
      <Button type="submit" size="lg" loading={isSubmitting} className={styles.submit}>Enviar instruções</Button>
      <Link to="/login" className={styles.returnLink}>Voltar para o login</Link>
    </Form>
  );
}
