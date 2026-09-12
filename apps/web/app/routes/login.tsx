import { Form, Link, redirect, useNavigation, useSearchParams } from "react-router";
import type { Route } from "./+types/login";
import { Button, Field, Input, Label, PasswordInput } from "@spark/ui-web";
import { AuthFlowError, restoreSession, signIn } from "../lib/auth.client";
import styles from "./login.module.css";

export async function clientLoader() {
  if (await restoreSession()) throw redirect("/");
  return null;
}

export function HydrateFallback() {
  return <div className={styles.card} role="status">Preparando acesso…</div>;
}

export async function clientAction({ request }: Route.ClientActionArgs) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const totpCode = String(formData.get("totpCode") ?? "").replace(/\D/g, "");

  if (!email || !password) {
    return { error: "Informe seu e-mail e sua senha." };
  }

  try {
    await signIn(email, password, totpCode || undefined);
    return redirect("/");
  } catch (error) {
    if (error instanceof AuthFlowError && error.code === "MFA_REQUIRED") return { mfaRequired: true as const };
    if (error instanceof AuthFlowError && error.code === "MFA_INVALID") return { mfaRequired: true as const, error: "Código inválido ou expirado." };
    if (error instanceof AuthFlowError && error.code === "INVALID_CREDENTIALS") return { error: "Não foi possível entrar com esse e-mail e senha. Confira os dados e tente novamente." };
    if (error instanceof AuthFlowError && error.code === "ACCOUNT_NOT_PROVISIONED") return { error: "Não foi possível abrir seu acesso agora. Tente novamente em instantes." };
    return { error: "O acesso está indisponível no momento. Tente novamente em instantes." };
  }
}

export default function Login({ actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const [searchParams] = useSearchParams();
  const isSubmitting = navigation.state === "submitting";
  const passwordUpdated = searchParams.get("password") === "updated";
  const sessionsClosed = searchParams.get("sessions") === "closed";

  return (
    <Form method="post" className={styles.card}>
      <div className={styles.cardHeader}>
        <h2>Entre na sua conta</h2>
        <p>Informe seu e-mail e sua senha para continuar.</p>
      </div>

      {passwordUpdated && <p className={styles.success} role="status">Senha atualizada. Você já pode entrar.</p>}
      {sessionsClosed && <p className={styles.success} role="status">Todas as sessões foram encerradas com segurança.</p>}

      <div className={styles.form}>
        <Field invalid={!!actionData?.error}>
          <Label>E-mail</Label>
          <Input type="email" name="email" placeholder="voce@empresa.com" required autoFocus autoComplete="email" />
        </Field>

        {actionData?.mfaRequired && (
          <Field invalid={!!actionData.error}>
            <Label>Código de segurança</Label>
            <Input name="totpCode" inputMode="numeric" autoComplete="one-time-code" placeholder="000000" minLength={6} maxLength={6} required autoFocus />
          </Field>
        )}

        <Field invalid={!!actionData?.error}>
          <div className={styles.fieldHeader}>
            <Label>Senha</Label>
            <Link to="/forgot-password" className={styles.textLink}>Esqueci minha senha</Link>
          </div>
          <PasswordInput name="password" placeholder="Digite sua senha" required autoComplete="current-password" />
        </Field>

        {actionData?.error && <p className={styles.erroGeral} role="alert">{actionData.error}</p>}
      </div>

      <Button type="submit" size="lg" loading={isSubmitting} className={styles.submit}>
        {actionData?.mfaRequired ? "Verificar e entrar" : "Entrar"}
      </Button>
    </Form>
  );
}
