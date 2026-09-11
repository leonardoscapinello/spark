import { Form, Link, redirect, useNavigation, useSearchParams } from "react-router";
import type { Route } from "./+types/login";
import { Button, Field, Input, Label, PasswordInput } from "@spark/ui-web";
import { signIn } from "../lib/auth.client";
import styles from "./login.module.css";

export async function clientAction({ request }: Route.ClientActionArgs) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Informe seu e-mail e sua senha." };
  }

  try {
    await signIn(email, password);
    return redirect("/");
  } catch {
    return { error: "E-mail ou senha incorretos." };
  }
}

export default function Login({ actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const [searchParams] = useSearchParams();
  const isSubmitting = navigation.state === "submitting";
  const passwordUpdated = searchParams.get("password") === "updated";

  return (
    <Form method="post" className={styles.card}>
      <div className={styles.cardHeader}>
        <h2>Boas-vindas</h2>
        <p>Use suas credenciais para acessar sua área de trabalho.</p>
      </div>

      {passwordUpdated && <p className={styles.success} role="status">Senha atualizada. Você já pode entrar.</p>}

      <div className={styles.form}>
        <Field invalid={!!actionData?.error}>
          <Label>E-mail</Label>
          <Input type="email" name="email" placeholder="voce@empresa.com" required autoFocus autoComplete="email" />
        </Field>

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
        Entrar
      </Button>
    </Form>
  );
}
