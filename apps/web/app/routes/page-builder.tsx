import { useEffect, useState, type ReactNode } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import { Link, useNavigate, useParams } from "react-router";
import { pagesControllerPublish, pagesControllerUpdate } from "@spark/api-client";
import type { PageBlock, PageTree } from "@spark/core";
import { BLOCK_CATALOG, defaultBlock, renderPageDocument } from "@spark/blocks";
import {
  BackLink,
  Button,
  EmptyState,
  Field,
  Icon,
  Input,
  Label,
  ListRowButton,
  PageHeader,
  PageState,
  PublicationStatus,
  RowList,
  SectionTitle,
  SegmentedControl,
  Select,
  Skeleton,
  Surface,
  Tabs,
  Textarea,
  notify,
  type IconName,
} from "@spark/ui-web";
import { getPagesCollection } from "../lib/pages-collections.client";
import { getSession } from "../lib/auth.client";
import { requireCapability } from "../lib/route-access.client";
import styles from "./page-builder.module.css";

const BLOCK_ICONS: Record<PageBlock["type"], IconName> = { hero: "star", text: "text", image: "image", button: "right", spacer: "minus" };
const PANEL_TABS = [
  { value: "blocks", label: "Blocos" },
  { value: "structure", label: "Estrutura" },
  { value: "properties", label: "Propriedades" },
  { value: "page", label: "Página" },
] as const;
type PanelMode = (typeof PANEL_TABS)[number]["value"];

export async function clientLoader() { await requireCapability("pages:read"); void getPagesCollection().preload().catch(() => undefined); return null; }

export default function PageBuilder() {
  const { pageId } = useParams();
  const navigate = useNavigate();
  const canWrite = getSession()?.capabilities.includes("pages:write") ?? false;
  const { data: pages, isLoading } = useLiveQuery({ query: (q) => q.from({ pages: getPagesCollection() }) });
  const page = pages.find((item) => item.id === pageId);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [tree, setTree] = useState<PageTree>({ blocks: [] });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>("blocks");
  const [mobileView, setMobileView] = useState<"editor" | "preview">("editor");
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (!page) return; setName(page.name); setSlug(page.slug); setTree(page.draftTree); setSelectedId(page.draftTree.blocks[0]?.id ?? null); }, [page]);
  const back = <BackLink render={<Link to="/pages" />}>Páginas</BackLink>;
  if (!page) return <div className={styles.fallback}>
    <PageHeader back={back} title="Editor de página" />
    {isLoading
      ? <div className={styles.loading} role="status" aria-label="Carregando página"><Skeleton /><Skeleton /><Skeleton /></div>
      : <PageState kind="not-found" title="Página não encontrada" description="Esta página não está mais disponível ou você não tem acesso a ela." action={<Button variant="secondary" onClick={() => navigate("/pages")}>Ver páginas</Button>} />}
  </div>;
  const current = page;
  const selected = tree.blocks.find((block) => block.id === selectedId) ?? null;

  function add(type: PageBlock["type"]) { const block = defaultBlock(type, crypto.randomUUID()) as PageBlock; setTree((value) => ({ blocks: [...value.blocks, block] })); setSelectedId(block.id); setPanelMode("properties"); }
  function patchSelected(props: Record<string, unknown>) { if (!selected) return; setTree((value) => ({ blocks: value.blocks.map((block) => block.id === selected.id ? { ...block, props: { ...block.props, ...props } } as PageBlock : block) })); }
  function move(index: number, offset: number) { setTree((value) => { const target = index + offset; if (target < 0 || target >= value.blocks.length) return value; const blocks = [...value.blocks]; const [block] = blocks.splice(index, 1); if (!block) return value; blocks.splice(target, 0, block); return { blocks }; }); }
  function remove(id: string) { setTree((value) => ({ blocks: value.blocks.filter((block) => block.id !== id) })); }
  async function save() { setSaving(true); try { await pagesControllerUpdate(current.id, { name: name.trim(), slug: slug.trim(), draftTree: tree }); notify({ title: "Rascunho salvo", tone: "success" }); } finally { setSaving(false); } }
  async function publish() { setSaving(true); try { await pagesControllerUpdate(current.id, { name: name.trim(), slug: slug.trim(), draftTree: tree }); const response = await pagesControllerPublish(current.id); notify({ title: "Página publicada", description: `Versão disponível em /p/${response.page.publicKey}`, tone: "success" }); } finally { setSaving(false); } }

  const blocksTab = <div className={styles.tab}>
    <SectionTitle level="block" as="h2" description="Escolha um bloco para inserir no fim da página.">Adicionar bloco</SectionTitle>
    <RowList>{BLOCK_CATALOG.map((item, index) => <ListRowButton key={item.type} index={index} icon={BLOCK_ICONS[item.type]} title={item.label} description={item.description} disabled={!canWrite} onClick={() => add(item.type)} />)}</RowList>
  </div>;

  const structureTab = <div className={styles.tab}>
    <SectionTitle level="block" as="h2" description="Selecione, reorganize ou remova blocos.">Estrutura</SectionTitle>
    {tree.blocks.length
      ? <RowList>{tree.blocks.map((block, index) => {
        const label = blockLabel(block.type);
        return <ListRowButton
          key={block.id}
          index={index}
          icon={BLOCK_ICONS[block.type]}
          title={label}
          description={blockSummary(block)}
          selected={selectedId === block.id}
          onClick={() => { setSelectedId(block.id); setPanelMode("properties"); }}
          actions={canWrite ? <>
            <Button iconOnly size="sm" variant="ghost" icon={<Icon name="chevronUp" />} aria-label={`Subir ${label}`} disabled={index === 0} onClick={() => move(index, -1)} />
            <Button iconOnly size="sm" variant="ghost" icon={<Icon name="chevronDown" />} aria-label={`Descer ${label}`} disabled={index === tree.blocks.length - 1} onClick={() => move(index, 1)} />
            <Button iconOnly size="sm" variant="ghost" icon={<Icon name="trash" />} aria-label={`Remover ${label}`} onClick={() => remove(block.id)} />
          </> : undefined}
        />;
      })}</RowList>
      : <EmptyState icon="page" title="Nenhum bloco ainda" description="Adicione o primeiro bloco na aba Blocos." action={canWrite ? <Button variant="secondary" onClick={() => setPanelMode("blocks")}>Ver blocos</Button> : undefined} />}
  </div>;

  const propertiesTab = <div className={styles.tab}>
    <SectionTitle level="block" as="h2" description={selected ? `Editando ${blockLabel(selected.type)}` : "Selecione um bloco na estrutura."}>Propriedades</SectionTitle>
    {selected
      ? <BlockFields block={selected} disabled={!canWrite} onChange={patchSelected} />
      : <EmptyState icon="pencil" title="Nenhum bloco selecionado" description="Escolha um bloco na aba Estrutura para editar." action={<Button variant="secondary" onClick={() => setPanelMode("structure")}>Ver estrutura</Button>} />}
  </div>;

  const pageTab = <div className={styles.tab}>
    <SectionTitle level="block" as="h2" description="Organize a página aqui. O link para visitantes fica disponível depois da publicação.">Dados da página</SectionTitle>
    <div className={styles.fields}>
      <Field><Label>Nome</Label><Input value={name} disabled={!canWrite} onChange={(event) => setName(event.target.value)} /></Field>
      <Field><Label>Identificador interno</Label><Input value={slug} disabled={!canWrite} onChange={(event) => setSlug(event.target.value)} /></Field>
    </div>
  </div>;

  const content: Record<PanelMode, ReactNode> = { blocks: blocksTab, structure: structureTab, properties: propertiesTab, page: pageTab };

  return <div className={styles.page}>
    <div className={styles.header}>
      <PageHeader back={back} title={page.name} description="Organize os blocos da página e acompanhe a prévia enquanto edita." actions={<>
        {page.status === "published" && <Button variant="secondary" onClick={() => window.open(`/p/${page.publicKey}`, "_blank", "noopener,noreferrer")}>Abrir publicada</Button>}
        {canWrite && <Button variant="secondary" loading={saving} onClick={() => void save()}>Salvar</Button>}
        {canWrite && <Button loading={saving} onClick={() => void publish()}>Publicar</Button>}
      </>} />
      <PublicationStatus published={page.status === "published"} publishedLabel="Publicada" publicUrl={`/p/${page.publicKey}`} />
      <SegmentedControl className={styles.mobileViewSwitch} label="Visualização da página" value={mobileView} options={[{ value: "editor", label: "Editar" }, { value: "preview", label: "Prévia" }]} onValueChange={setMobileView} />
    </div>
    <div className={styles.workspace} data-mobile-view={mobileView}>
      <aside className={styles.toolPanel} aria-label="Ferramentas da página">
        <Tabs
          fill
          label="Área de edição"
          value={panelMode}
          onValueChange={(value) => { const mode = PANEL_TABS.find((tab) => tab.value === value)?.value; if (mode) setPanelMode(mode); }}
          items={PANEL_TABS.map((tab) => ({ value: tab.value, label: tab.label, content: content[tab.value] }))}
        />
      </aside>
      <section className={styles.preview} aria-label="Prévia da página">
        <SectionTitle level="block" as="h2" description="Atualiza enquanto você edita.">Prévia</SectionTitle>
        {/* Moldura de papel cavado; a página aparece numa folha erguida dentro dela. */}
        <Surface elevation="cavada" radius="bloco" className={styles.stage}>
          {tree.blocks.length
            ? <Surface elevation="erguida" radius="item" className={styles.frame}><iframe className={styles.iframe} title="Prévia da página" srcDoc={renderPageDocument(tree, name || page.name)} /></Surface>
            : <div className={styles.emptyPreview}><EmptyState icon="page" title="Página em branco" description="Adicione o primeiro bloco para ver a prévia aqui." action={canWrite ? <Button icon={<Icon name="plus" />} onClick={() => add("hero")}>Adicionar destaque</Button> : undefined} /></div>}
        </Surface>
      </section>
    </div>
  </div>;
}

function blockLabel(type: PageBlock["type"]): string { return BLOCK_CATALOG.find((item) => item.type === type)?.label ?? type; }

// Uma linha do que o bloco diz, para achar o bloco na estrutura sem abrir.
function blockSummary(block: PageBlock): string {
  if (block.type === "hero") return block.props.title;
  if (block.type === "text") return block.props.heading;
  if (block.type === "image") return block.props.alt || "Sem texto alternativo";
  if (block.type === "button") return block.props.label;
  return ({ small: "Pequeno", medium: "Médio", large: "Grande" } as Record<string, string>)[block.props.size] ?? "Espaço";
}

function BlockFields({ block, disabled, onChange }: { block: PageBlock; disabled: boolean; onChange: (props: Record<string, unknown>) => void }) {
  if (block.type === "hero") return <div className={styles.fields}><Field><Label>Sobretítulo</Label><Input value={block.props.eyebrow} disabled={disabled} onChange={(event) => onChange({ eyebrow: event.target.value })} /></Field><Field><Label>Título</Label><Input value={block.props.title} disabled={disabled} onChange={(event) => onChange({ title: event.target.value })} /></Field><Field><Label>Texto</Label><Textarea value={block.props.text} disabled={disabled} onChange={(event) => onChange({ text: event.target.value })} /></Field><Align value={block.props.align} disabled={disabled} onChange={(align) => onChange({ align })} /></div>;
  if (block.type === "text") return <div className={styles.fields}><Field><Label>Título</Label><Input value={block.props.heading} disabled={disabled} onChange={(event) => onChange({ heading: event.target.value })} /></Field><Field><Label>Texto</Label><Textarea rows={8} value={block.props.text} disabled={disabled} onChange={(event) => onChange({ text: event.target.value })} /></Field><Align value={block.props.align} disabled={disabled} onChange={(align) => onChange({ align })} /></div>;
  if (block.type === "image") return <div className={styles.fields}><Field><Label>URL da imagem</Label><Input value={block.props.url} disabled={disabled} onChange={(event) => onChange({ url: event.target.value })} /></Field><Field><Label>Texto alternativo</Label><Input value={block.props.alt} disabled={disabled} onChange={(event) => onChange({ alt: event.target.value })} /></Field></div>;
  if (block.type === "button") return <div className={styles.fields}><Field><Label>Texto</Label><Input value={block.props.label} disabled={disabled} onChange={(event) => onChange({ label: event.target.value })} /></Field><Field><Label>Destino</Label><Input value={block.props.url} disabled={disabled} onChange={(event) => onChange({ url: event.target.value })} /></Field><Align value={block.props.align} disabled={disabled} onChange={(align) => onChange({ align })} /></div>;
  return <Field><Label>Tamanho</Label><Select label="Tamanho do espaço" value={block.props.size} disabled={disabled} options={[{ value: "small", label: "Pequeno" }, { value: "medium", label: "Médio" }, { value: "large", label: "Grande" }]} onValueChange={(value) => onChange({ size: value ?? "medium" })} /></Field>;
}

function Align({ value, disabled, onChange }: { value: "left" | "center"; disabled: boolean; onChange: (value: "left" | "center") => void }) { return <Field><Label>Alinhamento</Label><Select label="Alinhamento" value={value} disabled={disabled} options={[{ value: "left", label: "Esquerda" }, { value: "center", label: "Centro" }]} onValueChange={(next) => onChange((next ?? "left") as "left" | "center")} /></Field>; }
