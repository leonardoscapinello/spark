import { useState } from "react";
import { redirect } from "react-router";
import type { Route } from "./+types/security";
import { ActionModal, Alert, Badge, Button, Field, Input, Label, PageHeader, notify } from "@spark/ui-web";
import {
  beginMfaEnrollment,
  getMfaStatus,
  removeMfaFactor,
  restoreSession,
  verifyMfaEnrollment,
  type MfaEnrollment,
} from "../lib/auth.client";
import styles from "./security.module.css";

export async function clientLoader() {
  const session = await restoreSession();
  if (!session) throw redirect("/login");
  return getMfaStatus();
}

export default function Security({ loaderData }: Route.ComponentProps) {
  const [factors, setFactors] = useState(loaderData.factors);
  const [enrollment, setEnrollment] = useState<MfaEnrollment | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [removeId, setRemoveId] = useState<string | null>(null);

  async function startEnrollment() {
    setBusy(true);
    try {
      setEnrollment(await beginMfaEnrollment());
      setCode("");
    } catch {
      notify({ title: "Não foi possível iniciar a proteção", description: "Tente novamente em instantes.", tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function confirmEnrollment() {
    if (!enrollment || code.length !== 6) return;
    setBusy(true);
    try {
      await verifyMfaEnrollment(enrollment.factorId, code);
      const status = await getMfaStatus();
      setFactors(status.factors);
      setEnrollment(null);
      setCode("");
      notify({ title: "Autenticação em dois fatores ativada", tone: "success" });
    } catch {
      notify({ title: "Código inválido ou expirado", description: "Confira o aplicativo autenticador e tente novamente.", tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function confirmRemoval() {
    if (!removeId) return;
    await removeMfaFactor(removeId);
    setFactors((current) => current.filter((factor) => factor.id !== removeId));
    setRemoveId(null);
    notify({ title: "Autenticação em dois fatores removida", tone: "success" });
  }

  return (
    <div className={styles.page}>
      <PageHeader eyebrow="Sua conta" title="Segurança" description="Proteja o acesso com uma senha temporária gerada no seu celular." />

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <h2>Autenticação em dois fatores</h2>
            <p>Além da senha, o acesso exige um código de seis dígitos do aplicativo autenticador.</p>
          </div>
          <Badge tone={factors.length > 0 ? "success" : "warning"}>{factors.length > 0 ? "Ativada" : "Desativada"}</Badge>
        </div>

        {factors.length > 0 ? factors.map((factor) => (
          <div className={styles.factor} key={factor.id}>
            <div><strong>{factor.name}</strong><span>Ativado em {new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(factor.createdAt))}</span></div>
            <Button size="sm" variant="ghost" onClick={() => setRemoveId(factor.id)}>Remover</Button>
          </div>
        )) : !enrollment && (
          <Alert title="Sua conta usa somente senha">Ative a segunda etapa para impedir acesso quando uma senha for descoberta.</Alert>
        )}

        {!enrollment && <Button onClick={() => void startEnrollment()} loading={busy}>Ativar com aplicativo autenticador</Button>}

        {enrollment && (
          <div className={styles.enrollment}>
            <div className={styles.instructions}>
              <span className={styles.step}>1</span>
              <div><strong>Leia o QR code</strong><p>Use Google Authenticator, 1Password, Authy ou outro aplicativo compatível.</p></div>
            </div>
            <img className={styles.qrCode} src={enrollment.qrCode} alt="QR code para configurar o aplicativo autenticador" />
            <div className={styles.secret}><span>Chave para configuração manual</span><code>{enrollment.secret}</code></div>
            <div className={styles.instructions}>
              <span className={styles.step}>2</span>
              <div><strong>Confirme o código</strong><p>Digite o código atual para concluir a ativação.</p></div>
            </div>
            <Field>
              <Label>Código de seis dígitos</Label>
              <Input value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" />
            </Field>
            <div className={styles.actions}>
              <Button onClick={() => void confirmEnrollment()} loading={busy} disabled={code.length !== 6}>Confirmar e ativar</Button>
              <Button variant="secondary" onClick={() => setEnrollment(null)} disabled={busy}>Cancelar</Button>
            </div>
          </div>
        )}
      </section>

      <ActionModal open={removeId !== null} onOpenChange={(open) => { if (!open) setRemoveId(null); }} title="Remover proteção em dois fatores?" confirmLabel="Remover proteção" onConfirm={confirmRemoval} errorText="Não foi possível remover a proteção.">
        Sua conta voltará a depender somente da senha para entrar.
      </ActionModal>
    </div>
  );
}
