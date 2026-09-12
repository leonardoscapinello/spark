import { useState } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import {
  getSparkApiBaseUrl,
  integrationsControllerCheck,
  integrationsControllerStatus,
  integrationsControllerUpsert,
} from "@spark/api-client";
import {
  integrationConnectionId,
  type IntegrationConnection,
  type IntegrationProvider,
} from "@spark/core";
import {
  ActionModal,
  Badge,
  Button,
  CollectionToolbar,
  EmptyState,
  Field,
  Icon,
  Input,
  Label,
  PageFrame,
  PageHeader,
  Select,
  Switch,
  notify,
  type IconName,
} from "@spark/ui-web";
import { getIntegrationConnectionsCollection } from "../lib/integration-connections.client";
import { getSession } from "../lib/auth.client";
import { requireCapability } from "../lib/route-access.client";
import styles from "./integrations.module.css";

interface ProviderDefinition {
  provider: IntegrationProvider;
  name: string;
  icon: IconName;
  description: string;
  category: "Comunicação" | "Redes sociais" | "Dados e arquivos";
}
const CATEGORIES = ["Comunicação", "Redes sociais", "Dados e arquivos"] as const;
const PROVIDERS: ProviderDefinition[] = [
  {
    provider: "google_workspace",
    name: "Google Workspace",
    icon: "mail",
    description: "Gmail, caixa de entrada e documentos com identidade Google.",
    category: "Comunicação",
  },
  {
    provider: "smtp",
    name: "E-mail SMTP",
    icon: "mail",
    description: "Servidor próprio para envio autenticado de mensagens.",
    category: "Comunicação",
  },
  {
    provider: "instagram",
    name: "Instagram",
    icon: "message",
    description: "Direct, comentários, menções, stories e gatilhos da Meta.",
    category: "Redes sociais",
  },
  {
    provider: "buffer",
    name: "Buffer",
    icon: "calendar",
    description: "Publicação social, calendário, engajamento e métricas.",
    category: "Redes sociais",
  },
  {
    provider: "s3",
    name: "Armazenamento de arquivos",
    icon: "file",
    description: "Escolha onde o sistema guarda e encontra seus arquivos.",
    category: "Dados e arquivos",
  },
  {
    provider: "reoon",
    name: "Reoon Email Verifier",
    icon: "check",
    description: "Validação de e-mail com cache operacional de três meses.",
    category: "Dados e arquivos",
  },
];

export async function clientLoader() {
  await requireCapability("integrations:read");
  void getIntegrationConnectionsCollection().preload().catch(() => undefined);
  return null;
}

export default function Integrations() {
  const session = getSession();
  const canManage = session?.capabilities.includes("integrations:manage") ?? false;
  const { data: connections } = useLiveQuery({
    query: (q) =>
      q
        .from({ connections: getIntegrationConnectionsCollection() })
        .orderBy(({ connections: item }) => item.updatedAt, "desc"),
  });
  const [editing, setEditing] = useState<ProviderDefinition | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [config, setConfig] = useState<Record<string, string | number | boolean>>({});
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const searchTerm = search.trim().toLocaleLowerCase("pt-BR");
  const connectionByProvider = new Map<IntegrationProvider, IntegrationConnection>(
    connections.map((connection) => [connection.provider, connection]),
  );
  const visibleProviders = PROVIDERS.filter((definition) => {
    const connection = connectionByProvider.get(definition.provider);
    const matchesSearch = !searchTerm || `${definition.name} ${definition.description} ${definition.category}`.toLocaleLowerCase("pt-BR").includes(searchTerm);
    const matchesStatus = statusFilter === "all" || (statusFilter === "not_configured" ? !connection || connection.status === "not_configured" : connection?.status === statusFilter);
    return matchesSearch && matchesStatus;
  });

  function open(definition: ProviderDefinition, connection?: IntegrationConnection) {
    setEditing(definition);
    setEditingId(connection?.id ?? null);
    setConfig(
      (connection?.config as Record<string, string | number | boolean>) ??
        defaults(definition.provider),
    );
    setCredentials({});
  }
  async function save() {
    if (!editing) return;
    const cleanedCredentials = Object.fromEntries(
      Object.entries(credentials).filter(([, value]) => value.trim()),
    );
    const response = await integrationsControllerUpsert({
      id: editingId ?? integrationConnectionId.create(),
      provider: editing.provider,
      name: editing.name,
      config,
      ...(Object.keys(cleanedCredentials).length ? { credentials: cleanedCredentials } : {}),
    });
    notify({
      title: `${response.connection.name} configurado`,
      description: "As credenciais foram criptografadas e não são sincronizadas com o navegador.",
      tone: "success",
    });
  }
  async function check(connection: IntegrationConnection) {
    setCheckingId(connection.id);
    try {
      const response = await integrationsControllerCheck(connection.id);
      notify({
        title:
          response.connection.status === "connected" ? "Conexão confirmada" : "Falha na conexão",
        description: response.connection.lastError ?? "O provedor respondeu corretamente.",
        tone: response.connection.status === "connected" ? "success" : "error",
      });
    } finally {
      setCheckingId(null);
    }
  }
  async function toggle(connection: IntegrationConnection) {
    await integrationsControllerStatus(connection.id, {
      disabled: connection.status !== "disabled",
    });
    notify({
      title: connection.status === "disabled" ? "Integração habilitada" : "Integração desabilitada",
      tone: "success",
    });
  }

  return (
    <PageFrame width="content">
      <PageHeader
        icon="bolt"
        title="Integrações"
        description="Conecte os canais e serviços usados pela sua equipe. Gerencie cada conexão em um só lugar."
      />
      <CollectionToolbar
        search={<Input aria-label="Buscar integrações" placeholder="Buscar serviço ou canal" value={search} startAdornment={<Icon name="search" />} onChange={(event) => setSearch(event.target.value)} />}
        filters={<Select label="Filtrar integrações por situação" value={statusFilter} options={[{ value: "all", label: "Todas as situações" }, { value: "connected", label: "Conectadas" }, { value: "not_configured", label: "Não configuradas" }, { value: "error", label: "Com erro" }, { value: "disabled", label: "Desabilitadas" }]} onValueChange={(value) => setStatusFilter(value ?? "all")} />}
        count={`${visibleProviders.length} ${visibleProviders.length === 1 ? "integração" : "integrações"}`}
      />
      {visibleProviders.length === 0 && <EmptyState icon="search" title="Nenhuma integração encontrada" description="Tente outro nome ou situação para encontrar o serviço." />}
      {CATEGORIES.filter((category) => visibleProviders.some((provider) => provider.category === category)).map((category) => <section key={category} className={styles.category} aria-label={category}>
        <h2>{category}</h2>
        <div className={styles.grid}>{visibleProviders.filter((item) => item.category === category).map((definition) => {
          const connection = connectionByProvider.get(definition.provider);
          return (
            <div key={definition.provider} className={styles.providerCard}>
              <div className={styles.providerHeading}>
                <span className={styles.providerIcon}><Icon name={definition.icon} /></span>
                <div><h3>{definition.name}</h3><p>{definition.description}</p></div>
              </div>
              {connection && (
                <div className={styles.connectionInfo}>
                  <span>{connection.credentialsConfigured ? `Credencial ${connection.credentialHint ?? "configurada"}` : "Credencial pendente"}</span>
                  <span>{connection.lastCheckedAt ? `Verificada em ${formatDate(connection.lastCheckedAt)}` : "Ainda não verificada"}</span>
                  {connection.lastError && <small>{connection.lastError}</small>}
                  {definition.provider === "instagram" && <span className={styles.callbackUrl}>Webhook: {instagramCallbackUrl(connection.id)}</span>}
                </div>
              )}
              <div className={styles.providerFooter}>
                <div className={styles.providerMeta}>
                  <Badge
                    tone={
                      connection?.status === "connected"
                        ? "success"
                        : connection?.status === "error"
                          ? "danger"
                          : connection?.status === "disabled"
                            ? "warning"
                            : "neutral"
                    }
                  >
                    {statusLabel(connection?.status)}
                  </Badge>
                </div>
                {canManage && (
                  <div className={styles.actions}>
                    <Button variant="secondary" onClick={() => open(definition, connection)}>
                      {connection ? "Configurar" : "Conectar"}
                    </Button>
                    {connection?.credentialsConfigured && connection.status !== "disabled" && (
                      <Button
                        loading={checkingId === connection.id}
                        onClick={() => void check(connection)}
                      >
                        Testar conexão
                      </Button>
                    )}
                    {connection && (
                      <Button variant="ghost" onClick={() => void toggle(connection)}>
                        {connection.status === "disabled" ? "Habilitar" : "Desabilitar"}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}</div>
      </section>)}
      <ActionModal
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        title={editing ? `Configurar ${editing.name}` : "Configurar integração"}
        confirmLabel="Salvar configuração"
        errorText="Preencha os dados obrigatórios do provedor."
        onConfirm={save}
      >
        {editing && (
          <IntegrationFields
            provider={editing.provider}
            config={config}
            credentials={credentials}
            setConfig={setConfig}
            setCredentials={setCredentials}
            hasExistingCredentials={Boolean(editingId)}
            connectionId={editingId}
          />
        )}
      </ActionModal>
    </PageFrame>
  );
}

function IntegrationFields({
  provider,
  config,
  credentials,
  setConfig,
  setCredentials,
  hasExistingCredentials,
  connectionId,
}: {
  provider: IntegrationProvider;
  config: Record<string, string | number | boolean>;
  credentials: Record<string, string>;
  setConfig: (value: Record<string, string | number | boolean>) => void;
  setCredentials: (value: Record<string, string>) => void;
  hasExistingCredentials: boolean;
  connectionId: string | null;
}) {
  const publicField = (key: string, value: string | number | boolean) =>
    setConfig({ ...config, [key]: value });
  const secretField = (key: string, value: string) =>
    setCredentials({ ...credentials, [key]: value });
  if (provider === "smtp")
    return (
      <div className={styles.fields}>
        <Field>
          <Label>Servidor SMTP</Label>
          <Input
            value={text(config.host)}
            placeholder="smtp.exemplo.com"
            onChange={(event) => publicField("host", event.target.value)}
          />
        </Field>
        <div className={styles.columns}>
          <Field>
            <Label>Porta</Label>
            <Input
              type="number"
              value={number(config.port, 587)}
              onChange={(event) => publicField("port", Number(event.target.value))}
            />
          </Field>
          <Switch
            checked={config.secure === true}
            onCheckedChange={(checked) => publicField("secure", checked)}
          >
            TLS direto
          </Switch>
        </div>
        <div className={styles.columns}>
          <Field>
            <Label>Nome do remetente</Label>
            <Input
              value={text(config.fromName)}
              placeholder="Sua empresa"
              onChange={(event) => publicField("fromName", event.target.value)}
            />
          </Field>
          <Field>
            <Label>E-mail do remetente</Label>
            <Input
              type="email"
              value={text(config.fromEmail)}
              placeholder="atendimento@dominio.com"
              onChange={(event) => publicField("fromEmail", event.target.value)}
            />
          </Field>
        </div>
        <Field>
          <Label>Usuário</Label>
          <Input
            value={credentials.username ?? ""}
            placeholder={hasExistingCredentials ? "Deixe vazio para manter" : "usuario@dominio.com"}
            onChange={(event) => secretField("username", event.target.value)}
          />
        </Field>
        <Field>
          <Label>Senha</Label>
          <Input
            type="password"
            value={credentials.password ?? ""}
            placeholder={hasExistingCredentials ? "Deixe vazio para manter" : "Senha do SMTP"}
            onChange={(event) => secretField("password", event.target.value)}
          />
        </Field>
      </div>
    );
  if (provider === "s3")
    return (
      <div className={styles.fields}>
        <Field>
          <Label>Endpoint</Label>
          <Input
            value={text(config.endpoint)}
            placeholder="https://s3.amazonaws.com"
            onChange={(event) => publicField("endpoint", event.target.value)}
          />
        </Field>
        <div className={styles.columns}>
          <Field>
            <Label>Região</Label>
            <Input
              value={text(config.region) || "auto"}
              onChange={(event) => publicField("region", event.target.value)}
            />
          </Field>
          <Field>
            <Label>Bucket</Label>
            <Input
              value={text(config.bucket)}
              onChange={(event) => publicField("bucket", event.target.value)}
            />
          </Field>
        </div>
        <Switch
          checked={config.forcePathStyle === true}
          onCheckedChange={(checked) => publicField("forcePathStyle", checked)}
        >
          Usar path-style
        </Switch>
        <Field>
          <Label>Access key</Label>
          <Input
            type="password"
            value={credentials.accessKeyId ?? ""}
            placeholder={hasExistingCredentials ? "Deixe vazio para manter" : "Access key ID"}
            onChange={(event) => secretField("accessKeyId", event.target.value)}
          />
        </Field>
        <Field>
          <Label>Secret key</Label>
          <Input
            type="password"
            value={credentials.secretAccessKey ?? ""}
            placeholder={hasExistingCredentials ? "Deixe vazio para manter" : "Secret access key"}
            onChange={(event) => secretField("secretAccessKey", event.target.value)}
          />
        </Field>
      </div>
    );
  if (provider === "reoon")
    return (
      <div className={styles.fields}>
        <Field>
          <Label>E-mail para teste</Label>
          <Input
            type="email"
            value={text(config.testEmail)}
            placeholder="voce@dominio.com"
            onChange={(event) => publicField("testEmail", event.target.value)}
          />
        </Field>
        <SecretToken
          name="Chave da API"
          field="apiKey"
          value={credentials.apiKey ?? ""}
          existing={hasExistingCredentials}
          onChange={secretField}
        />
      </div>
    );
  if (provider === "instagram")
    return (
      <div className={styles.fields}>
        <div className={styles.columns}>
          <Field>
            <Label>Versão da Graph API</Label>
            <Input
              value={text(config.apiVersion) || "v23.0"}
              onChange={(event) => publicField("apiVersion", event.target.value)}
            />
          </Field>
          <Field>
            <Label>ID da conta</Label>
            <Input
              value={text(config.accountId)}
              onChange={(event) => publicField("accountId", event.target.value)}
            />
          </Field>
        </div>
        <SecretToken
          name="Token de acesso"
          field="accessToken"
          value={credentials.accessToken ?? ""}
          existing={hasExistingCredentials}
          onChange={secretField}
        />
        <SecretToken
          name="App Secret da Meta"
          field="appSecret"
          value={credentials.appSecret ?? ""}
          existing={hasExistingCredentials}
          onChange={secretField}
        />
        <SecretToken
          name="Token de verificação do webhook"
          field="verifyToken"
          value={credentials.verifyToken ?? ""}
          existing={hasExistingCredentials}
          onChange={secretField}
        />
        {connectionId && <Field>
          <Label>URL de callback para a Meta</Label>
          <Input value={instagramCallbackUrl(connectionId)} readOnly onFocus={(event) => event.target.select()} />
          <span className={styles.fieldHint}>Cadastre esta URL e o token de verificação no painel da Meta; assine o evento de mensagens. A URL precisa ser pública em HTTPS para a Meta entregar as DMs.</span>
        </Field>}
      </div>
    );
  if (provider === "buffer")
    return (
      <div className={styles.fields}>
        <Field>
          <Label>ID da organização no Buffer</Label>
          <Input
            value={text(config.organizationId)}
            placeholder="Opcional: preenchimento automático"
            onChange={(event) => publicField("organizationId", event.target.value)}
          />
        </Field>
        <SecretToken
          name="Chave da API"
          field="accessToken"
          value={credentials.accessToken ?? ""}
          existing={hasExistingCredentials}
          onChange={secretField}
        />
      </div>
    );
  return (
    <div className={styles.fields}>
      <Field>
        <Label>E-mail do remetente</Label>
        <Input
          type="email"
          value={text(config.fromEmail)}
          placeholder="atendimento@dominio.com"
          onChange={(event) => publicField("fromEmail", event.target.value)}
        />
      </Field>
      <SecretToken
        name="Token OAuth do Google"
        field="accessToken"
        value={credentials.accessToken ?? ""}
        existing={hasExistingCredentials}
        onChange={secretField}
      />
    </div>
  );
}
function SecretToken({
  name,
  field,
  value,
  existing,
  onChange,
}: {
  name: string;
  field: string;
  value: string;
  existing: boolean;
  onChange: (field: string, value: string) => void;
}) {
  return (
    <Field>
      <Label>{name}</Label>
      <Input
        type="password"
        value={value}
        placeholder={existing ? "Deixe vazio para manter" : "Cole a credencial"}
        onChange={(event) => onChange(field, event.target.value)}
      />
    </Field>
  );
}
function defaults(provider: IntegrationProvider): Record<string, string | number | boolean> {
  if (provider === "smtp") return { port: 587, secure: false };
  if (provider === "s3") return { region: "auto", forcePathStyle: true };
  if (provider === "instagram") return { apiVersion: "v23.0" };
  return {};
}
function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}
function number(value: unknown, fallback: number): number {
  return typeof value === "number" ? value : fallback;
}
function statusLabel(status?: IntegrationConnection["status"]): string {
  if (!status || status === "not_configured") return "Não configurada";
  return { connected: "Conectada", error: "Com erro", disabled: "Desabilitada" }[status];
}
function formatDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(
    new Date(value),
  );
}
function instagramCallbackUrl(connectionId: string): string {
  return `${getSparkApiBaseUrl().replace(/\/$/, "")}/v1/webhooks/instagram/${connectionId}`;
}
