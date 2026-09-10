import { Form, redirect, useNavigation } from "react-router";
import type { Route } from "./+types/login";
import { devLogin } from "@spark/api-client";
import { orgId as orgIdFactory } from "@spark/core";
import { Button, Field, Glass, Input, Label } from "@spark/ui-web";
import { salvarSessao } from "../lib/auth.client";
import styles from "./login.module.css";

export async function clientAction({ request }: Route.ClientActionArgs) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim();
  const nome = String(formData.get("nome") ?? "").trim();

  if (!email) {
    return { erro: "Informe um e-mail." };
  }

  try {
    const resposta = await devLogin(nome ? { email, nome } : { email });
    salvarSessao({ ...resposta, orgId: orgIdFactory.de(resposta.orgId) });
    return redirect("/");
  } catch {
    return { erro: "Não foi possível entrar. Confira o e-mail e tente de novo." };
  }
}

export default function Login({ actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const enviando = navigation.state === "submitting";

  return (
    <main className={styles.container}>
      <Glass className={styles.card ?? ""}>
        <h1 className={styles.titulo}>Spark</h1>
        <p className={styles.subtitulo}>
          Login de desenvolvimento — entra ou cria sua conta pelo e-mail, sem senha.
        </p>

        <Form method="post" className={styles.form}>
          <Field invalid={!!actionData?.erro}>
            <Label>E-mail</Label>
            <Input type="email" name="email" placeholder="voce@empresa.com" required autoFocus />
          </Field>

          <Field>
            <Label>Nome (opcional)</Label>
            <Input type="text" name="nome" placeholder="Seu nome" />
          </Field>

          {/* Erro de submissão, não de um campo específico — ErrorText
           * (Field.Error do Base UI) exige contexto de <Field.Root>, não
           * serve pra mensagem de formulário inteiro. */}
          {actionData?.erro && <p className={styles.erroGeral}>{actionData.erro}</p>}

          <Button type="submit" loading={enviando}>
            Entrar
          </Button>
        </Form>
      </Glass>
    </main>
  );
}
