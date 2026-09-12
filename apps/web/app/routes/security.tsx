import { useEffect, useState } from "react";
import { redirect, useNavigate } from "react-router";
import { ActionModal, Badge, Button, Field, Input, Label, PageHeader, notify } from "@spark/ui-web";
import {
  beginMfaEnrollment,
  getAuthSessionDetails,
  getMfaStatus,
  removeMfaFactor,
  restoreSession,
  signOut,
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

  async function leaveAccount() {
    await signOut();
    navigate("/login", { replace: true });
  }

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
    <div className={styles.page}>
      <PageHeader eyebrow="Minha conta" title="Segurança da conta" description="Proteja seu acesso e gerencie os dispositivos conectados." actions={<Button variant="secondary" onClick={() => void leaveAccount()}>Sair da conta</Button>} />

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <h2>Autenticação em dois fatores</h2>
            <p>Além da senha, o acesso exige um código de seis dígitos do aplicativo autenticador.</p>
          </div>
          <Badge tone={loading || loadError ? "neutral" : factors.length > 0 ? "success" : "warning"}>{loading ? "Carregando" : loadError ? "Indisponível" : factors.length > 0 ? "Ativada" : "Desativada"}</Badge>
        </div>

        {loadError && <div className={styles.loadError} role="alert"><span>Não foi possível consultar a segurança da conta.</span><Button size="sm" variant="secondary" onClick={() => { setLoading(true); setReloadKey((value) => value + 1); }}>Tentar novamente</Button></div>}

        {factors.length > 0 ? factors.map((factor) => (
          <div className={styles.factor} key={factor.id}>
            <div><strong>{factor.name}</strong><span>Ativado em {new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(factor.createdAt))}</span></div>
            <Button size="sm" variant="ghost" onClick={() => setRemoveId(factor.id)}>Remover</Button>
          </div>
        )) : !enrollment && !loading && !loadError && <p className={styles.explanation}>Sua conta usa somente senha. Ative a segunda etapa para impedir acesso quando uma senha for descoberta.</p>}

        {!enrollment && !loading && !loadError && factors.length === 0 && <Button onClick={() => void startEnrollment()} loading={busy}>Ativar com aplicativo autenticador</Button>}

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


      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <h2>Sessões da conta</h2>
            <p>Controle onde sua conta permanece conectada.</p>
          </div>
          <Badge tone="success">Sessão atual</Badge>
        </div>

        <div className={styles.sessionDetails}>
          <div><span>Conta</span><strong>{currentSession?.email ?? "—"}</strong></div>
          <div><span>Último acesso</span><strong>{currentSession ? formatDateTime(currentSession.lastSignInAt) : "—"}</strong></div>
          <div><span>Renovação da sessão</span><strong>{currentSession ? formatDateTime(currentSession.expiresAt) : "—"}</strong></div>
        </div>

        <div className={styles.sessionActions}>
          <div>
            <strong>Outros dispositivos</strong>
            <p>Revoga as sessões abertas em outros navegadores e aparelhos.</p>
          </div>
          <Button variant="secondary" onClick={() => setSessionAction("others")}>Encerrar outras sessões</Button>
        </div>
        <div className={styles.sessionActions}>
          <div>
            <strong>Todos os dispositivos</strong>
            <p>Revoga todas as sessões, inclusive esta, e volta para o login.</p>
          </div>
          <Button variant="secondary" onClick={() => setSessionAction("global")}>Sair de todos</Button>
        </div>
      </section>

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
    </div>
  );
}

function formatDateTime(value: string | null): string {
  if (!value) return "Não informado";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
