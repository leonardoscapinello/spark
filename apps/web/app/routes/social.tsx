import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { useLiveQuery } from "@tanstack/react-db";
import { socialControllerCreatePost, socialControllerSyncChannels } from "@spark/api-client";
import {
  socialPostId,
  type SocialChannel,
  type SocialPost,
  type SocialPublishMode,
} from "@spark/core";
import {
  ActionModal,
  Badge,
  Button,
  Card,
  DataTable,
  DateTimePicker,
  Field,
  Label,
  PageHeader,
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
  const [searchParams] = useSearchParams();
  const channelView = searchParams.get("view") === "channels";
  const session = getSession();
  const canWrite = session?.capabilities.includes("social:write") ?? false;
  const { data: channels } = useLiveQuery({
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
  useEffect(() => {
    if (!channelId && channels[0]) setChannelId(channels[0].id);
  }, [channelId, channels]);
  const activeChannels = channels.filter((channel) => channel.active);
  const channelById = useMemo(
    () => new Map<string, SocialChannel>(channels.map((channel) => [channel.id, channel])),
    [channels],
  );
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
    <div className={styles.page}>
      <PageHeader
        title={channelView ? "Canais conectados" : "Publicações"}
        description={channelView ? "Contas disponíveis para publicar e acompanhar nas redes sociais." : "Crie, agende e acompanhe publicações em cada canal."}
        actions={
          canWrite ? (
            <div className={styles.headerActions}>
              {channelView && <Button variant="secondary" loading={syncing} onClick={() => void syncChannels()}>
                Sincronizar canais
              </Button>}
              {!channelView && <Button disabled={!activeChannels.length} onClick={() => setComposerOpen(true)}>
                Nova publicação
              </Button>}
            </div>
          ) : undefined
        }
      />
      {channelView ? <section className={styles.channelGrid}>
        {channels.map((channel) => (
          <Card key={channel.id} title={channel.name} description={serviceLabel(channel.service)}>
            <div className={styles.channelCard}>
              {channel.avatarUrl ? (
                <img src={channel.avatarUrl} alt="" />
              ) : (
                <span className={styles.avatarFallback}>
                  {channel.name.slice(0, 1).toUpperCase()}
                </span>
              )}
              <Badge tone={channel.active ? "success" : "neutral"}>
                {channel.active ? "Conectado" : "Indisponível"}
              </Badge>
            </div>
          </Card>
        ))}
        {!channels.length && (
          <Card title="Nenhum canal sincronizado">
            <div className={styles.empty}>
              <span>Conecte um provedor em Integrações e sincronize suas contas sociais.</span>
            </div>
          </Card>
        )}
      </section> : <DataTable
        label="Calendário de publicações"
        rows={posts}
        columns={columns}
        rowKey={(post) => post.id}
        rowLabel={(post) => post.text}
        state={isLoading && !posts.length ? "loading" : "ready"}
        emptyText="Nenhuma publicação criada."
      />}
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
    </div>
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
