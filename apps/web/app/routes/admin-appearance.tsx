import { useEffect, useState, type CSSProperties } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import { organizationThemeControllerUpdate } from "@spark/api-client";
import { OrganizationThemeSchema, type UpdateOrganizationThemeInput } from "@spark/core";
import { Button, Card, Field, Input, Label, PageFrame, PageHeader, Select, notify } from "@spark/ui-web";
import type { Route } from "./+types/admin-appearance";
import { getSession } from "../lib/auth.client";
import { applyOrganizationTheme, cacheOrganizationTheme, DEFAULT_THEME, fontStackFor, FONT_FAMILY_OPTIONS, type ThemeDraft } from "../lib/organization-theme.client";
import { getOrganizationThemesCollection } from "../lib/organization-themes-collection.client";
import { requireCapability } from "../lib/route-access.client";
import styles from "./admin-appearance.module.css";

export async function clientLoader() {
  await requireCapability("settings:manage");
  void getOrganizationThemesCollection().preload();
  return null;
}

const COLOR_FIELDS: ReadonlyArray<{ key: keyof Pick<ThemeDraft, "accentColor" | "accentStrongColor" | "groundColor" | "surfaceColor" | "surface2Color" | "inkColor" | "inkMutedColor" | "lineColor" | "statusSuccessColor" | "statusWarningColor" | "statusDangerColor">; label: string; description: string }> = [
  { key: "accentColor", label: "Acento", description: "Links, ações e seleção" },
  { key: "accentStrongColor", label: "Acento forte", description: "Hover e contraste das ações" },
  { key: "groundColor", label: "Fundo da aplicação", description: "Base das áreas de trabalho" },
  { key: "surfaceColor", label: "Superfície", description: "Cards, painéis e campos" },
  { key: "surface2Color", label: "Superfície secundária", description: "Áreas de apoio e estados suaves" },
  { key: "inkColor", label: "Texto principal", description: "Títulos e conteúdo" },
  { key: "inkMutedColor", label: "Texto secundário", description: "Metadados e descrições" },
  { key: "lineColor", label: "Linhas e bordas", description: "Divisores e contornos" },
  { key: "statusSuccessColor", label: "Sucesso", description: "Ganhos e confirmações" },
  { key: "statusWarningColor", label: "Atenção", description: "Avisos e pendências" },
  { key: "statusDangerColor", label: "Perigo", description: "Perdas e erros" },
];

export default function AdminAppearance(_: Route.ComponentProps) {
  const session = getSession();
  const { data: themes = [] } = useLiveQuery({ query: (q) => q.from({ themes: getOrganizationThemesCollection() }) });
  const persisted = themes.find((theme) => theme.orgId === session?.orgId);
  const [draft, setDraft] = useState<ThemeDraft>(DEFAULT_THEME);
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!persisted || hydrated) return;
    setDraft({
      accentColor: persisted.accentColor ?? DEFAULT_THEME.accentColor,
      accentStrongColor: persisted.accentStrongColor ?? DEFAULT_THEME.accentStrongColor,
      groundColor: persisted.groundColor ?? DEFAULT_THEME.groundColor,
      surfaceColor: persisted.surfaceColor ?? DEFAULT_THEME.surfaceColor,
      surface2Color: persisted.surface2Color ?? DEFAULT_THEME.surface2Color,
      inkColor: persisted.inkColor ?? DEFAULT_THEME.inkColor,
      inkMutedColor: persisted.inkMutedColor ?? DEFAULT_THEME.inkMutedColor,
      lineColor: persisted.lineColor ?? DEFAULT_THEME.lineColor,
      statusSuccessColor: persisted.statusSuccessColor ?? DEFAULT_THEME.statusSuccessColor,
      statusWarningColor: persisted.statusWarningColor ?? DEFAULT_THEME.statusWarningColor,
      statusDangerColor: persisted.statusDangerColor ?? DEFAULT_THEME.statusDangerColor,
      fontBody: persisted.fontBody ?? DEFAULT_THEME.fontBody,
      fontDisplay: persisted.fontDisplay ?? DEFAULT_THEME.fontDisplay,
    });
    setHydrated(true);
  }, [hydrated, persisted]);

  function setColor(key: keyof ThemeDraft, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    setSaving(true);
    try {
      const response = await organizationThemeControllerUpdate(draft);
      const savedTheme = OrganizationThemeSchema.parse(response.theme);
      cacheOrganizationTheme(savedTheme);
      applyOrganizationTheme(savedTheme);
      notify({ title: "Aparência salva", description: "A identidade já está ativa para a organização.", tone: "success" });
    } catch {
      notify({ title: "Não foi possível salvar", description: "Verifique a conexão e tente novamente.", tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  return <PageFrame>
    <PageHeader
      icon="image"
      eyebrow="Identidade da organização"
      title="Aparência"
      description="Defina as cores e a tipografia que todas as pessoas verão no Spark. A prévia muda aqui; salvar aplica no produto inteiro."
      actions={<div className={styles.headerActions}><Button variant="secondary" onClick={() => setDraft(DEFAULT_THEME)}>Restaurar padrão</Button><Button loading={saving} onClick={() => void save()}>Salvar aparência</Button></div>}
    />

    <div className={styles.layout}>
      <div className={styles.form}>
        <Card title="Cores da interface" description="Comece pelo acento e pelas superfícies. As telas usam estes tokens sem precisar de ajustes individuais.">
          <div className={styles.colorGrid}>{COLOR_FIELDS.map((field) => <Field key={field.key} className={styles.colorField}>
            <span className={styles.colorLabel}><Label>{field.label}</Label><small>{field.description}</small></span>
            <Input type="color" value={draft[field.key] ?? DEFAULT_THEME[field.key]} aria-label={field.label} onChange={(event) => setColor(field.key, event.currentTarget.value)} />
          </Field>)}</div>
        </Card>

        <Card title="Tipografia" description="Use uma combinação que preserve leitura e personalidade em todas as áreas do produto.">
          <div className={styles.fontGrid}>
            <Field><Label>Texto e controles</Label><Select label="Texto e controles" value={draft.fontBody ?? DEFAULT_THEME.fontBody} options={FONT_FAMILY_OPTIONS} onValueChange={(value) => { if (value) setDraft((current) => ({ ...current, fontBody: value as UpdateOrganizationThemeInput["fontBody"] })); }} /></Field>
            <Field><Label>Títulos e destaques</Label><Select label="Títulos e destaques" value={draft.fontDisplay ?? DEFAULT_THEME.fontDisplay} options={FONT_FAMILY_OPTIONS} onValueChange={(value) => { if (value) setDraft((current) => ({ ...current, fontDisplay: value as UpdateOrganizationThemeInput["fontDisplay"] })); }} /></Field>
          </div>
        </Card>
      </div>

      <aside className={styles.preview} aria-label="Prévia da aparência">
        <div className={styles.previewHeader}><span>Prévia</span><span className={styles.previewDot} /></div>
        <div className={styles.previewCanvas} style={{ "--preview-accent": draft.accentColor, "--preview-strong": draft.accentStrongColor, "--preview-ground": draft.groundColor, "--preview-surface": draft.surfaceColor, "--preview-ink": draft.inkColor, "--preview-muted": draft.inkMutedColor, "--preview-line": draft.lineColor, "--preview-font-body": fontStackFor(draft.fontBody), "--preview-font-display": fontStackFor(draft.fontDisplay) } as CSSProperties}>
          <div className={styles.previewTop}><span className={styles.previewLogo}>spark</span><span className={styles.previewAvatar}>LS</span></div>
          <div className={styles.previewBody}><span className={styles.previewEyebrow}>NEGÓCIOS</span><h2>Pipeline comercial</h2><p>Uma prévia rápida da identidade no dia a dia.</p><div className={styles.previewCard}><span className={styles.previewBadge}>Em aberto</span><strong>Implantação assistida</strong><span>R$ 3.200,00</span><div className={styles.previewProgress}><i /></div></div><Button variant="primary" shape="pill" className={styles.previewAction}>Adicionar negócio</Button></div>
        </div>
      </aside>
    </div>
  </PageFrame>;
}
