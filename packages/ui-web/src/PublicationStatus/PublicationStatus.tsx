import { Badge } from "../Feedback/Feedback.js";
import { Button } from "../Button/Button.js";
import { notify } from "../Notification/Toast.js";
import styles from "./PublicationStatus.module.css";

export interface PublicationStatusProps {
  published: boolean;
  publishedLabel?: string;
  publicUrl?: string;
  className?: string;
}

export function PublicationStatus({ published, publishedLabel = "Publicado", publicUrl, className }: PublicationStatusProps) {
  async function copyPublicLink() {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      notify({ title: "Link copiado", tone: "success" });
    } catch {
      notify({ title: "Não foi possível copiar o link", tone: "error" });
    }
  }

  return <div className={[styles.root, className].filter(Boolean).join(" ")} role="status">
    <Badge tone={published ? "success" : "neutral"}>{published ? publishedLabel : "Rascunho"}</Badge>
    <span>{published ? "Disponível para visitantes" : "Visível apenas para sua equipe"}</span>
    {published && publicUrl && <Button size="sm" variant="ghost" onClick={() => void copyPublicLink()}>Copiar link</Button>}
  </div>;
}
