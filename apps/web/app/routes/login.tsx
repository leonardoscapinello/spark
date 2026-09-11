import { Form, redirect, useNavigation } from "react-router";
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
  const isSubmitting = navigation.state === "submitting";

  return (
    <main className={styles.container}>
      <section className={styles.intro} aria-label="Apresentação">
        <a className={styles.logoLink} href="/login" aria-label="Leonardo Scapinello">
          <img className={styles.logo} src="/brand/leonardo-scapinello-ink.svg" alt="Leonardo Scapinello" />
        </a>
        <div className={styles.introCopy}>
          <p className={styles.eyebrow}>Relacionamento</p>
          <h1 className={styles.titulo}>O contexto certo para cada conversa.</h1>
          <p className={styles.subtitulo}>Organize contatos, conversas e oportunidades em um espaço feito para o seu time.</p>
        </div>
        <p className={styles.rodape}>© Leonardo Scapinello</p>
      </section>

      <section className={styles.access} aria-labelledby="access-title">
        <Form method="post" className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 id="access-title">Boas-vindas</h2>
            <p>Use suas credenciais para acessar sua área de trabalho.</p>
          </div>

          <div className={styles.form}>
            <Field invalid={!!actionData?.error}>
              <Label>E-mail</Label>
              <Input type="email" name="email" placeholder="voce@empresa.com" required autoFocus autoComplete="email" />
            </Field>

            <Field invalid={!!actionData?.error}>
              <Label>Senha</Label>
              <PasswordInput name="password" placeholder="Digite sua senha" required autoComplete="current-password" />
            </Field>

            {actionData?.error && <p className={styles.erroGeral} role="alert">{actionData.error}</p>}
          </div>

          <Button type="submit" size="lg" loading={isSubmitting} className={styles.submit}>
            Continuar
          </Button>
        </Form>
      </section>
    </main>
  );
}
