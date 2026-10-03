import { useEffect, useState } from "react";
import { redirect, useNavigate } from "react-router";
import { ActionModal, Alert, Button, Card, Chip, Field, Input, Label, PageFrame, PageHeader, SettingsRow, Surface, Text, notify } from "@spark/ui-web";
import {
  beginMfaEnrollment,
  getAuthSessionDetails,
  getMfaStatus,
  removeMfaFactor,
  restoreSession,
  signOutEverywhere,
  signOutOtherSessions,
  verifyMfaEnrollment,
  type AuthSessionDetails,
  type MfaEnrollment,
  type MfaStatus,
} from "../lib/auth.client";
import styles from "./security.module.css";

export async function clientLoader() {
  const session = await restoreSession();
  if (!session) throw redirect("/login");
  return null;
}

export default function Security() {
  const navigate = useNavigate();
  const [factors, setFactors] = useState<MfaStatus["factors"]>([]);
  const [currentSession, setCurrentSession] = useState<AuthSessionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [enrollment, setEnrollment] = useState<MfaEnrollment | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [sessionAction, setSessionAction] = useState<"others" | "global" | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.all([getMfaStatus(), getAuthSessionDetails()]).then(([mfa, details]) => {
      if (!active) return;
      setFactors(mfa.factors);
      setCurrentSession(details);
      setLoadError(false);
    }).catch(() => { if (active) setLoadError(true); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reloadKey]);

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

  async function confirmSessionAction() {
    if (sessionAction === "others") {
      await signOutOtherSessions();
      setSessionAction(null);
      notify({ title: "Outras sessões encerradas", description: "Este dispositivo continua conectado.", tone: "success" });
      return;
    }
    if (sessionAction === "global") {
      await signOutEverywhere();
      navigate("/login?sessions=closed", { replace: true });
    }
  }

  return (
    <PageFrame width="content" className={styles.page}>
      <PageHeader eyebrow="Perfil" title="Segurança da conta" description="Proteja seu acesso e gerencie os dispositivos conectados." />

      <Card title="Autenticação em dois fatores" description="Além da senha, o acesso exige um código de seis dígitos do aplicativo autenticador." actions={<Chip {...(loading || loadError ? {} : { dot: factors.length > 0 ? "var(--ok)" : "var(--wa)" })}>{loading ? "Carregando" : loadError ? "Indisponível" : factors.length > 0 ? "Ativada" : "Desativada"}</Chip>}>
        <div className={styles.body}>
          {loadError && <Alert tone="danger" title="Não foi possível consultar a segurança da conta." action={<Button size="sm" variant="secondary" onClick={() => { setLoading(true); setReloadKey((value) => value + 1); }}>Tentar novamente</Button>} />}

          {factors.length > 0 ? factors.map((factor) => (
            <SettingsRow key={factor.id} title={factor.name} description={`Ativado em ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(factor.createdAt))}`}>
              <Button size="sm" variant="ghost" tone="danger" onClick={() => setRemoveId(factor.id)}>Remover</Button>
            </SettingsRow>
          )) : !enrollment && !loading && !loadError && <Text as="p" tone="secondary">Sua conta usa somente senha. Ative a segunda etapa para impedir acesso quando uma senha for descoberta.</Text>}

          {!enrollment && !loading && !loadError && factors.length === 0 && <div className={styles.start}><Button onClick={() => void startEnrollment()} loading={busy}>Ativar com aplicativo autenticador</Button></div>}

          {enrollment && (
            <div className={styles.enrollment}>
              <div className={styles.step}>
                <Chip tone="ink">1</Chip>
                <div className={styles.stepCopy}><Text weight="medium">Leia o QR code</Text><Text size="pequeno" tone="secondary">Use Google Authenticator, 1Password, Authy ou outro aplicativo compatível.</Text></div>
              </div>
              <Surface radius="md" className={styles.qr}><img className={styles.qrImage} src={enrollment.qrCode} alt="QR code para configurar o aplicativo autenticador" /></Surface>
              <div className={styles.secret}><Text size="pequeno" tone="secondary">Chave para configuração manual</Text><Text mono>{enrollment.secret}</Text></div>
              <div className={styles.step}>
                <Chip tone="ink">2</Chip>
                <div className={styles.stepCopy}><Text weight="medium">Confirme o código</Text><Text size="pequeno" tone="secondary">Digite o código atual para concluir a ativação.</Text></div>
              </div>
              <Field>
                <Label>Código de seis dígitos</Label>
                <Input numeric value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" />
              </Field>
              <div className={styles.actions}>
                <Button onClick={() => void confirmEnrollment()} loading={busy} disabled={code.length !== 6}>Confirmar e ativar</Button>
                <Button variant="secondary" onClick={() => setEnrollment(null)} disabled={busy}>Cancelar</Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card title="Sessões da conta" description="Controle onde sua conta permanece conectada." actions={<Chip tone="success" dot>Sessão atual</Chip>}>
        <dl className={styles.sessionDetails}>
          <div><Text as="dt" size="pequeno" tone="secondary">Conta</Text><Text as="dd" weight="medium" truncate>{currentSession?.email ?? "—"}</Text></div>
          <div><Text as="dt" size="pequeno" tone="secondary">Último acesso</Text><Text as="dd" weight="medium">{currentSession ? formatDateTime(currentSession.lastSignInAt) : "—"}</Text></div>
          <div><Text as="dt" size="pequeno" tone="secondary">Renovação da sessão</Text><Text as="dd" weight="medium">{currentSession ? formatDateTime(currentSession.expiresAt) : "—"}</Text></div>
        </dl>
        <SettingsRow title="Outros dispositivos" description="Revoga as sessões abertas em outros navegadores e aparelhos.">
          <Button variant="secondary" onClick={() => setSessionAction("others")}>Encerrar outras sessões</Button>
        </SettingsRow>
        <SettingsRow title="Todos os dispositivos" description="Revoga todas as sessões, inclusive esta, e volta para o login.">
          <Button variant="secondary" tone="danger" onClick={() => setSessionAction("global")}>Sair de todos</Button>
        </SettingsRow>
      </Card>

      <ActionModal open={removeId !== null} onOpenChange={(open) => { if (!open) setRemoveId(null); }} title="Remover proteção em dois fatores?" confirmLabel="Remover proteção" onConfirm={confirmRemoval} errorText="Não foi possível remover a proteção.">
        Sua conta voltará a depender somente da senha para entrar.
      </ActionModal>

      <ActionModal
        open={sessionAction !== null}
        onOpenChange={(open) => { if (!open) setSessionAction(null); }}
        title={sessionAction === "global" ? "Sair de todos os dispositivos?" : "Encerrar outras sessões?"}
        confirmLabel={sessionAction === "global" ? "Sair de todos" : "Encerrar sessões"}
        onConfirm={confirmSessionAction}
        errorText="Não foi possível encerrar as sessões."
      >
        {sessionAction === "global"
          ? "Você precisará informar suas credenciais novamente em todos os dispositivos."
          : "Todas as outras sessões da sua conta perderão a autorização para se renovar."}
      </ActionModal>
    </PageFrame>
  );
}

function formatDateTime(value: string | null): string {
  if (!value) return "Não informado";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
