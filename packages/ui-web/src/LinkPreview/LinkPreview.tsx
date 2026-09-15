import { lightTheme } from "@spark/tokens/native-theme";
import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import { useId, type ReactElement, type ReactNode } from "react";
import s from "../shared/surfaces.module.css";
import styles from "./LinkPreview.module.css";

export interface LinkPreviewData {
  url: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  siteName: string | null;
  faviconUrl: string | null;
  status: "ready" | "failed";
}

export function LinkPreviewCard({ preview, loading = false, url }: { preview?: LinkPreviewData | null; loading?: boolean; url?: string }) {
  if (loading && !preview) {
    const host = previewHost(url);
    return <div className={styles.card} role="status" aria-label="Buscando prévia do link"><div className={styles.imagePlaceholder} /><div className={styles.body}><span className={styles.site}>{host}</span><strong>{host}</strong><span className={styles.description}>Buscando título e imagem…</span></div></div>;
  }
  if (!preview || preview.status === "failed") return <div className={styles.card}><div className={styles.imagePlaceholder} /><div className={styles.unavailable}><strong>Prévia indisponível</strong><span>Não foi possível obter os dados deste endereço.</span></div></div>;
  return <div className={styles.card}>
    {preview.imageUrl
      ? <img className={styles.image} src={preview.imageUrl} alt="" loading="lazy" decoding="async" fetchPriority="low" referrerPolicy="no-referrer" />
      : <div className={styles.imagePlaceholder}>{preview.faviconUrl ? <img className={styles.favicon} src={preview.faviconUrl} alt="" referrerPolicy="no-referrer" /> : null}</div>}
    <div className={styles.body}>
      <span className={styles.site}>{preview.faviconUrl && <img className={styles.favicon} src={preview.faviconUrl} alt="" referrerPolicy="no-referrer" />}{preview.siteName ?? previewHost(preview.url)}</span>
      <strong>{preview.title ?? preview.url}</strong>
      {preview.description && <span className={styles.description}>{preview.description}</span>}
    </div>
  </div>;
}

function previewHost(url: string | undefined): string {
  if (!url) return "Link";
  try { return new URL(url).hostname; } catch { return "Link"; }
}

export function LinkPreviewTooltip({ children, preview, loading, onRequest, url }: { children: ReactElement; preview?: LinkPreviewData | null; loading?: boolean; onRequest?: () => void; url?: string }) {
  const triggerId = useId();
  const tooltipId = useId();
  return <BaseTooltip.Root onOpenChange={(open) => { if (open) onRequest?.(); }}>
    <BaseTooltip.Trigger id={triggerId} aria-describedby={tooltipId} delay={0} render={children} />
    <BaseTooltip.Portal><BaseTooltip.Positioner side="top" sideOffset={Number.parseFloat(lightTheme["space-2"])} className={s.positioner}>
      <BaseTooltip.Popup id={tooltipId} role="tooltip" className={`${s.popup} ${styles.popup}`}><LinkPreviewCard {...(preview === undefined ? {} : { preview })} {...(loading === undefined ? {} : { loading })} {...(url === undefined ? {} : { url })} /></BaseTooltip.Popup>
    </BaseTooltip.Positioner></BaseTooltip.Portal>
  </BaseTooltip.Root>;
}

export function PreviewLink({ href, children, preview, loading, onRequest, className }: { href: string; children: ReactNode; preview?: LinkPreviewData | null; loading?: boolean; onRequest?: () => void; className?: string }) {
  return <LinkPreviewTooltip url={href} {...(preview === undefined ? {} : { preview })} {...(loading === undefined ? {} : { loading })} {...(onRequest === undefined ? {} : { onRequest })}><a className={className} href={href} target="_blank" rel="noreferrer">{children}</a></LinkPreviewTooltip>;
}
