import { Form, redirect, useNavigation } from "react-router";
import type { Route } from "./+types/login";
import { devLogin } from "@spark/api-client";
import { orgId as orgIdFactory } from "@spark/core";
import { Button, Field, Input, Label } from "@spark/ui-web";
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
      <section className={styles.intro} aria-label="Apresentação">
        <a className={styles.logoLink} href="/login" aria-label="Leonardo Scapinello">
          <img className={styles.logo} src="/brand/leonardo-scapinello-ink.svg" alt="Leonardo Scapinello" />
        </a>
        <div className={styles.introCopy}>
          <p className={styles.eyebrow}>Central de relacionamento</p>
          <h1 className={styles.titulo}>Toda relação importante, em um só lugar.</h1>
          <p className={styles.subtitulo}>Concentre contatos, conversas e oportunidades para o seu time agir com clareza.</p>
        </div>
        <p className={styles.rodape}>© Leonardo Scapinello</p>
      </section>

      <section className={styles.access} aria-labelledby="access-title">
        <Form method="post" className={styles.card}>
          <div className={styles.cardHeader}>
            <p className={styles.eyebrow}>Acesso</p>
            <h2 id="access-title">Entre para continuar</h2>
            <p>Use seu e-mail para entrar ou criar o acesso inicial.</p>
          </div>

          <div className={styles.form}>
            <Field invalid={!!actionData?.error}>
              <Label>E-mail</Label>
              <Input type="email" name="email" placeholder="voce@empresa.com" required autoFocus autoComplete="email" />
            </Field>

            <Field>
              <Label>Como devemos chamar você?</Label>
              <Input type="text" name="name" placeholder="Seu nome" autoComplete="name" />
            </Field>

            {actionData?.error && <p className={styles.erroGeral} role="alert">{actionData.error}</p>}
          </div>

          <Button type="submit" size="lg" loading={isSubmitting} className={styles.submit}>
            Continuar
          </Button>
          <p className={styles.devNote}>Ambiente de desenvolvimento</p>
        </Form>
      </section>
    </main>
  );
}
