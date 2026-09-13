import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useLiveQuery } from "@tanstack/react-db";
import { socialControllerCreatePost, socialControllerSyncChannels } from "@spark/api-client";
import {
  socialPostId,
  type SocialChannel,
  type SocialPost,
  type SocialPublishMode,
} from "@spark/core";
import {
  ActionCard,
  ActionCardGroup,
  ActionModal,
  Avatar,
  Badge,
  Button,
  CollectionToolbar,
  DataTable,
  DateTimePicker,
  EmptyState,
  Field,
  Icon,
  Input,
  Label,
  PageHeader,
  PageFrame,
  Select,
  Textarea,
  notify,
  type TableColumn,
} from "@spark/ui-web";
import { getSession } from "../lib/auth.client";
import { requireCapability } from "../lib/route-access.client";
import {
  getSocialChannelsCollection,
  getSocialPostsCollection,
} from "../lib/social-collections.client";
import styles from "./social.module.css";

export async function clientLoader() {
  await requireCapability("social:read");
  void Promise.allSettled([
    getSocialChannelsCollection().preload(),
    getSocialPostsCollection().preload(),
  ]);
  return null;
}

export default function Social() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const channelView = searchParams.get("view") === "channels";
  const session = getSession();
  const canWrite = session?.capabilities.includes("social:write") ?? false;
  const canReadIntegrations = session?.capabilities.includes("integrations:read") ?? false;
  const { data: channels, isLoading: channelsLoading } = useLiveQuery({
    query: (q) =>
      q
        .from({ channels: getSocialChannelsCollection() })
        .orderBy(({ channels: item }) => item.name, "asc"),
  });
  const { data: posts, isLoading } = useLiveQuery({
    query: (q) =>
      q
        .from({ posts: getSocialPostsCollection() })
        .orderBy(({ posts: item }) => item.createdAt, "desc"),
  });
  const [composerOpen, setComposerOpen] = useState(false);
  const [channelId, setChannelId] = useState("");
  const [text, setText] = useState("");
  const [publishMode, setPublishMode] = useState<SocialPublishMode>("queue");
  const [scheduledAt, setScheduledAt] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [channelSearch, setChannelSearch] = useState("");
  const [postSearch, setPostSearch] = useState("");
  const [channelStatusFilter, setChannelStatusFilter] = useState("all");
  const [postStatusFilter, setPostStatusFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");
  useEffect(() => {
    if (!channelId && channels[0]) setChannelId(channels[0].id);
  }, [channelId, channels]);
  const activeChannels = channels.filter((channel) => channel.active);
  const channelById = useMemo(
    () => new Map<string, SocialChannel>(channels.map((channel) => [channel.id, channel])),
    [channels],
  );
  const channelSearchTerm = channelSearch.trim().toLocaleLowerCase("pt-BR");
  const postSearchTerm = postSearch.trim().toLocaleLowerCase("pt-BR");
  const shownChannels = channels.filter((channel) =>
    (channelStatusFilter === "all" || (channelStatusFilter === "active" ? channel.active : !channel.active)) &&
    (!channelSearchTerm || `${channel.name} ${serviceLabel(channel.service)}`.toLocaleLowerCase("pt-BR").includes(channelSearchTerm)),
  );
  const shownPosts = posts.filter((post) =>
    (postStatusFilter === "all" || post.status === postStatusFilter) &&
    (channelFilter === "all" || post.channelId === channelFilter) &&
    (!postSearchTerm || `${post.text} ${channelById.get(post.channelId)?.name ?? ""}`.toLocaleLowerCase("pt-BR").includes(postSearchTerm)),
  );
  const firstRun = channelView
    ? channels.length === 0 && !channelsLoading && !channelSearch && channelStatusFilter === "all"
    : posts.length === 0 && !isLoading && !postSearch && postStatusFilter === "all" && channelFilter === "all";
  const initialLoad = channelView
    ? channels.length === 0 && channelsLoading
    : posts.length === 0 && isLoading;
  const channelColumns: TableColumn<SocialChannel>[] = [
    { id: "name", label: "Canal", cell: (channel) => <div className={styles.channelIdentity}><Avatar name={channel.name} src={channel.avatarUrl} /><strong>{channel.name}</strong></div>, sortValue: (channel) => channel.name },
    { id: "service", label: "Rede", cell: (channel) => serviceLabel(channel.service), sortValue: (channel) => serviceLabel(channel.service) },
    { id: "status", label: "Situação", cell: (channel) => <Badge tone={channel.active ? "success" : "neutral"}>{channel.active ? "Conectado" : "Indisponível"}</Badge>, sortValue: (channel) => channel.active ? 1 : 0 },
  ];
  const columns: TableColumn<SocialPost>[] = [
    {
      id: "channel",
      label: "Canal",
      cell: (post) => <ChannelName channel={channelById.get(post.channelId)} />,
      sortValue: (post) => channelById.get(post.channelId)?.name ?? "",
    },
    {
      id: "content",
      label: "Conteúdo",
      cell: (post) => <span className={styles.postText}>{post.text}</span>,
      sortValue: (post) => post.text,
    },
    {
      id: "date",
      label: "Publicação",
      cell: (post) => formatDate(post.scheduledAt ?? post.publishedAt ?? post.createdAt),
      sortValue: (post) => post.scheduledAt ?? post.publishedAt ?? post.createdAt,
    },
    {
      id: "status",
      label: "Status",
      cell: (post) => <Badge tone={statusTone(post.status)}>{statusLabel(post.status)}</Badge>,
      sortValue: (post) => post.status,
    },
  ];

  async function syncChannels() {
    setSyncing(true);
    try {
      const response = await socialControllerSyncChannels();
      notify({
        title: "Canais sincronizados",
        description: `${response.channels.length} conta(s) encontrada(s) no Buffer.`,
        tone: "success",
      });
    } finally {
      setSyncing(false);
    }
  }
  async function createPost() {
    if (!channelId || !text.trim()) throw new Error("MISSING_POST");
    const response = await socialControllerCreatePost({
      id: socialPostId.create(),
      channelId,
      text: text.trim(),
      publishMode,
      scheduledAt:
        publishMode === "schedule" && scheduledAt ? new Date(scheduledAt).toISOString() : null,
    });
    if (response.post.status === "failed")
      throw new Error(response.post.error ?? "Falha ao enviar ao Buffer.");
    const selectedChannel = channelById.get(response.post.channelId);
    notify({
      title:
        response.post.status === "draft"
          ? "Rascunho salvo"
          : response.post.status === "published"
            ? "Post publicado"
            : "Post agendado",
      ...(selectedChannel ? { description: selectedChannel.name } : {}),
      tone: "success",
    });
    setText("");
    setScheduledAt("");
    setPublishMode("queue");
  }

  return (
    <PageFrame className={styles.page}>
      <PageHeader
        icon={channelView ? "team" : "calendar"}
        title={channelView ? "Canais conectados" : "Publicações"}
        actions={
          canWrite ? (
            <div className={styles.headerActions}>
              {channelView && !firstRun && !initialLoad && <Button variant="secondary" loading={syncing} onClick={() => void syncChannels()}>
                Sincronizar canais
              </Button>}
              {!channelView && !firstRun && !initialLoad && activeChannels.length > 0 && <Button onClick={() => setComposerOpen(true)}>
                Nova publicação
              </Button>}
            </div>
          ) : undefined
        }
      />
      {firstRun && (channelView
        ? <EmptyState variant="featured" icon="message" title="Conecte suas redes sociais" description="Conecte um provedor em Integrações e sincronize suas contas para publicar aqui." action={canReadIntegrations ? <Button onClick={() => void navigate("/integrations")}>Abrir integrações</Button> : undefined} secondaryAction={canWrite ? <Button variant="secondary" loading={syncing} onClick={() => void syncChannels()}>Sincronizar canais</Button> : undefined} />
        : <EmptyState variant="featured" icon="calendar" title={activeChannels.length ? "Planeje sua primeira publicação" : "Conecte um canal para começar"} description={activeChannels.length ? "Escreva uma publicação, escolha um canal e defina quando ela deve sair." : "Depois de conectar uma conta social, você poderá agendar e acompanhar as publicações aqui."} action={canWrite && activeChannels.length ? <Button onClick={() => setComposerOpen(true)}>Nova publicação</Button> : !canReadIntegrations && !canWrite ? <Button variant="secondary" onClick={() => setSearchParams({ view: "channels" })}>Ver canais</Button> : undefined} />)}
      {!channelView && firstRun && (canReadIntegrations || canWrite) && <ActionCardGroup title="Prepare suas publicações">
        {canReadIntegrations && <ActionCard icon="message" title="Conecte suas redes" description="Vincule as contas que sua equipe usa para publicar." action={<Button variant="secondary" onClick={() => void navigate("/integrations")}>Abrir integrações</Button>} />}
        {canWrite && <ActionCard icon="team" title="Sincronize os canais" description="Atualize as contas disponíveis para a equipe." action={<Button variant="secondary" loading={syncing} onClick={() => void syncChannels()}>Sincronizar canais</Button>} />}
        {canWrite && activeChannels.length > 0 && <ActionCard icon="calendar" title="Planeje o conteúdo" description="Escreva uma publicação e escolha quando enviá-la." action={<Button variant="secondary" onClick={() => setComposerOpen(true)}>Nova publicação</Button>} />}
      </ActionCardGroup>}
      {!firstRun && <><CollectionToolbar
        search={<Input aria-label={channelView ? "Buscar canais" : "Buscar publicações"} placeholder={channelView ? "Buscar canal ou rede" : "Buscar texto ou canal"} value={channelView ? channelSearch : postSearch} startAdornment={<Icon name="search" />} onChange={(event) => channelView ? setChannelSearch(event.target.value) : setPostSearch(event.target.value)} />}
        filters={<>
          <Select appearance="filter" label="Filtrar por situação" value={channelView ? channelStatusFilter : postStatusFilter} options={channelView ? [{ value: "all", label: "Todas as situações" }, { value: "active", label: "Conectados" }, { value: "inactive", label: "Indisponíveis" }] : [{ value: "all", label: "Todas as situações" }, ...(["draft", "scheduled", "publishing", "published", "failed", "cancelled"] as const).map((value) => ({ value, label: statusLabel(value) }))]} onValueChange={(value) => channelView ? setChannelStatusFilter(value ?? "all") : setPostStatusFilter(value ?? "all")} />
          {!channelView && <Select appearance="filter" label="Filtrar por canal" value={channelFilter} options={[{ value: "all", label: "Todos os canais" }, ...channels.map((channel) => ({ value: channel.id, label: channel.name }))]} onValueChange={(value) => setChannelFilter(value ?? "all")} />}
        </>}
        count={initialLoad ? "Carregando…" : `${channelView ? shownChannels.length : shownPosts.length} ${channelView ? shownChannels.length === 1 ? "canal" : "canais" : shownPosts.length === 1 ? "publicação" : "publicações"}`}
      />
      {channelView ? <DataTable label="Canais conectados" rows={shownChannels} columns={channelColumns} rowKey={(channel) => channel.id} rowLabel={(channel) => channel.name} state={channelsLoading && !channels.length ? "loading" : "ready"} emptyText={firstRun ? "Os canais conectados aparecerão nesta tabela." : "Nenhum canal encontrado."} /> : <DataTable
        label="Publicações"
        rows={shownPosts}
        columns={columns}
        rowKey={(post) => post.id}
        rowLabel={(post) => post.text}
        state={isLoading && !posts.length ? "loading" : "ready"}
        emptyText={firstRun ? "As publicações criadas aparecerão nesta tabela." : "Nenhuma publicação encontrada."}
      />}</>}
      <ActionModal
        open={composerOpen}
        onOpenChange={setComposerOpen}
        title="Nova publicação"
        confirmLabel={
          publishMode === "draft"
            ? "Salvar rascunho"
            : publishMode === "now"
              ? "Publicar agora"
              : "Agendar publicação"
        }
        errorText="Revise o canal, o conteúdo e a data de publicação."
        onConfirm={createPost}
      >
        <div className={styles.form}>
          <Field>
            <Label>Canal</Label>
            <Select
              label="Canal social"
              value={channelId}
              options={activeChannels.map((channel) => ({
                value: channel.id,
                label: `${channel.name} · ${serviceLabel(channel.service)}`,
              }))}
              onValueChange={(value) => setChannelId(value ?? "")}
            />
          </Field>
          <Field>
            <Label>Conteúdo</Label>
            <Textarea
              value={text}
              maxLength={10000}
              rows={7}
              placeholder="Escreva a legenda da publicação…"
              onChange={(event) => setText(event.target.value)}
            />
            <span className={styles.counter}>{text.length.toLocaleString("pt-BR")} / 10.000</span>
          </Field>
          <Field>
            <Label>Quando publicar</Label>
            <Select
              label="Modo de publicação"
              value={publishMode}
              options={[
                { value: "queue", label: "Próximo horário da fila" },
                { value: "schedule", label: "Data e hora específicas" },
                { value: "now", label: "Agora" },
                { value: "draft", label: "Salvar como rascunho" },
              ]}
              onValueChange={(value) => setPublishMode((value ?? "queue") as SocialPublishMode)}
            />
          </Field>
          {publishMode === "schedule" && (
            <Field>
              <Label>Data e hora</Label>
              <DateTimePicker
                mode="datetime"
                label="Data e hora da publicação"
                value={scheduledAt}
                onValueChange={setScheduledAt}
              />
            </Field>
          )}
        </div>
      </ActionModal>
    </PageFrame>
  );
}

function ChannelName({ channel }: { channel: SocialChannel | undefined }) {
  return (
    <div className={styles.channelName}>
      <strong>{channel?.name ?? "Canal removido"}</strong>
      <span>{channel ? serviceLabel(channel.service) : ""}</span>
    </div>
  );
}
function serviceLabel(service: SocialChannel["service"]): string {
  return {
    instagram: "Instagram",
    facebook: "Facebook",
    threads: "Threads",
    linkedin: "LinkedIn",
    twitter: "X",
    pinterest: "Pinterest",
    tiktok: "TikTok",
    youtube: "YouTube",
    mastodon: "Mastodon",
    bluesky: "Bluesky",
    googlebusiness: "Google Business",
  }[service];
}
function statusLabel(status: SocialPost["status"]): string {
  return {
    draft: "Rascunho",
    scheduled: "Agendado",
    publishing: "Enviando",
    published: "Publicado",
    failed: "Falhou",
    cancelled: "Cancelado",
  }[status];
}
function statusTone(status: SocialPost["status"]): "neutral" | "success" | "danger" | "warning" {
  if (status === "published") return "success";
  if (status === "failed") return "danger";
  if (status === "publishing") return "warning";
  return "neutral";
}
function formatDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(
    new Date(value),
  );
}
