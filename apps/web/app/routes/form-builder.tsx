import { useEffect, useState } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import { Link, useNavigate, useParams } from "react-router";
import { formsControllerStatus, formsControllerUpdate } from "@spark/api-client";
import type { LeadFormField } from "@spark/core";
import {
  BackLink,
  Button,
  Card,
  Field,
  Icon,
  Input,
  Label,
  LeadFormRenderer,
  PageFrame,
  PageHeader,
  PageState,
  PublicationStatus,
  SectionTitle,
  SegmentedControl,
  Select,
  Skeleton,
  Surface,
  Switch,
  Textarea,
  notify,
} from "@spark/ui-web";
import { useLeadFormFields, getLeadFormsCollection } from "../lib/forms-collections.client";
import { getSession } from "../lib/auth.client";
import { requireCapability } from "../lib/route-access.client";
import styles from "./form-builder.module.css";

const FIELD_TYPES = [
  { value: "text", label: "Texto" },
  { value: "email", label: "E-mail" },
  { value: "phone", label: "Telefone" },
  { value: "textarea", label: "Texto longo" },
  { value: "select", label: "Seleção" },
  { value: "checkbox", label: "Confirmação" },
];
const FIELD_MAPPINGS = [
  { value: "none", label: "Campo personalizado" },
  { value: "name", label: "Nome" },
  { value: "email", label: "E-mail" },
  { value: "phone", label: "Telefone" },
  { value: "company", label: "Empresa" },
];

export async function clientLoader() {
  await requireCapability("forms:read");
  void getLeadFormsCollection().preload().catch(() => undefined);
  return null;
}

export default function FormBuilder() {
  const { formId } = useParams();
  const navigate = useNavigate();
  const session = getSession();
  const canWrite = session?.capabilities.includes("forms:write") ?? false;
  const { data: forms, isLoading } = useLiveQuery({
    query: (q) => q.from({ forms: getLeadFormsCollection() }),
  });
  const form = forms.find((item) => item.id === formId);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitLabel, setSubmitLabel] = useState("Enviar");
  const [successMessage, setSuccessMessage] = useState("");
  const [fields, setFields] = useState<LeadFormField[]>([]);
  // O desenho vem de `lead_form_fields`, não de coluna jsonb (ADR-0035).
  const storedFields = useLeadFormFields(form?.id);
  const [previewValues, setPreviewValues] = useState<Record<string, string | boolean>>({});
  const [previewSubmitted, setPreviewSubmitted] = useState(false);
  const [mobileView, setMobileView] = useState<"editor" | "preview">("editor");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!form) return;
    setName(form.name);
    setTitle(form.title);
    setDescription(form.description ?? "");
    setSubmitLabel(form.submitLabel);
    setSuccessMessage(form.successMessage);
    setFields(storedFields);
  }, [form, storedFields]);
  if (!form)
    return (
      <PageFrame className={styles.page}>
        <PageHeader back={<BackLink render={<Link to="/forms" />}>Formulários</BackLink>} eyebrow="Formulários" title="Editor de formulário" />
        {isLoading
          ? <div className={styles.loading} role="status" aria-label="Carregando formulário"><Skeleton /><Skeleton /><Skeleton /></div>
          : <PageState kind="not-found" title="Formulário não encontrado" description="Este formulário não está mais disponível ou você não tem acesso a ele." action={<Button variant="secondary" onClick={() => navigate("/forms")}>Ver formulários</Button>} />}
      </PageFrame>
    );
  const selectedForm = form;
  function updateField(index: number, patch: Partial<LeadFormField>) {
    setFields((current) =>
      current.map((item, position) => (position === index ? { ...item, ...patch } : item)),
    );
  }
  function addField() {
    setFields((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        label: "Novo campo",
        type: "text",
        mapping: "none",
        required: false,
        options: [],
      },
    ]);
  }
  function move(index: number, offset: number) {
    setFields((current) => {
      const target = index + offset;
      if (target < 0 || target >= current.length) return current;
      const copy = [...current];
      const picked = copy[index];
      if (!picked) return current;
      copy.splice(index, 1);
      copy.splice(target, 0, picked);
      return copy;
    });
  }
  async function save() {
    setSaving(true);
    try {
      await formsControllerUpdate(selectedForm.id, {
        name: name.trim(),
        title: title.trim(),
        description: description.trim() || null,
        submitLabel: submitLabel.trim(),
        successMessage: successMessage.trim(),
        fields,
      });
      notify({ title: "Formulário salvo", tone: "success" });
    } finally {
      setSaving(false);
    }
  }
  async function publish() {
    setSaving(true);
    try {
      await formsControllerStatus(selectedForm.id, {
        published: selectedForm.status !== "published",
      });
      notify({
        title:
          selectedForm.status === "published"
            ? "Formulário retirado do ar"
            : "Formulário publicado",
        tone: "success",
      });
    } finally {
      setSaving(false);
    }
  }
  const publicUrl = `/f/${form.publicKey}`;
  const previewTouched = previewSubmitted || Object.keys(previewValues).length > 0;
  function resetPreview() {
    setPreviewValues({});
    setPreviewSubmitted(false);
  }
  return (
    <PageFrame className={styles.page}>
      <PageHeader
        back={<BackLink render={<Link to="/forms" />}>Formulários</BackLink>}
        title={form.name}
        description="Organize os campos e acompanhe como o formulário ficará para quem responder."
        actions={<>
          {form.status === "published" && (
            <Button variant="secondary" onClick={() => window.open(publicUrl, "_blank", "noopener,noreferrer")}>
              Abrir formulário
            </Button>
          )}
          {canWrite && (
            <Button variant="secondary" loading={saving} onClick={() => void publish()}>
              {form.status === "published" ? "Despublicar" : "Publicar"}
            </Button>
          )}
          {canWrite && (
            <Button loading={saving} onClick={() => void save()}>
              Salvar
            </Button>
          )}
        </>}
      />
      <PublicationStatus published={form.status === "published"} publicUrl={publicUrl} />
      <SegmentedControl className={styles.mobileViewSwitch} label="Visualização do formulário" value={mobileView} options={[{ value: "editor", label: "Editar" }, { value: "preview", label: "Prévia" }]} onValueChange={setMobileView} />
      <div className={styles.workspace} data-mobile-view={mobileView}>
        <div className={styles.editor}>
          <Card title="Conteúdo" description="Textos que aparecem no topo e após o envio.">
            <div className={styles.form}>
              <Field>
                <Label>Nome interno</Label>
                <Input value={name} disabled={!canWrite} onChange={(event) => setName(event.target.value)} />
              </Field>
              <Field>
                <Label>Título</Label>
                <Input value={title} disabled={!canWrite} onChange={(event) => setTitle(event.target.value)} />
              </Field>
              <Field>
                <Label>Descrição</Label>
                <Textarea value={description} disabled={!canWrite} onChange={(event) => setDescription(event.target.value)} />
              </Field>
              <div className={styles.columns}>
                <Field>
                  <Label>Texto do botão</Label>
                  <Input value={submitLabel} disabled={!canWrite} onChange={(event) => setSubmitLabel(event.target.value)} />
                </Field>
                <Field>
                  <Label>Mensagem de sucesso</Label>
                  <Input value={successMessage} disabled={!canWrite} onChange={(event) => setSuccessMessage(event.target.value)} />
                </Field>
              </div>
            </div>
          </Card>
          <Card title="Campos" description="O mapeamento define qual propriedade do lead recebe o valor.">
            <div className={styles.fieldList}>
              {fields.map((item, index) => (
                <Surface key={item.id} elevation="pousada" radius="lista" className={styles.fieldItem}>
                  <SectionTitle
                    level="block"
                    as="h3"
                    meta={`Campo ${index + 1}`}
                    actions={<>
                      <Button iconOnly size="sm" variant="ghost" icon={<Icon name="chevronUp" />} aria-label="Mover para cima" disabled={!canWrite || index === 0} onClick={() => move(index, -1)} />
                      <Button iconOnly size="sm" variant="ghost" icon={<Icon name="chevronDown" />} aria-label="Mover para baixo" disabled={!canWrite || index === fields.length - 1} onClick={() => move(index, 1)} />
                      <Button iconOnly size="sm" variant="ghost" icon={<Icon name="trash" />} aria-label="Remover campo" disabled={!canWrite || fields.length === 1} onClick={() => setFields((current) => current.filter((_, position) => position !== index))} />
                    </>}
                  >
                    {item.label.trim() || `Campo ${index + 1}`}
                  </SectionTitle>
                  <div className={styles.columns}>
                    <Field>
                      <Label>Rótulo</Label>
                      <Input value={item.label} disabled={!canWrite} onChange={(event) => updateField(index, { label: event.target.value })} />
                    </Field>
                    <Field>
                      <Label>Tipo</Label>
                      <Select
                        label="Tipo do campo"
                        value={item.type}
                        disabled={!canWrite}
                        options={FIELD_TYPES}
                        onValueChange={(value) => {
                          if (value) updateField(index, { type: value as LeadFormField["type"] });
                        }}
                      />
                    </Field>
                  </div>
                  <div className={styles.columns}>
                    <Field>
                      <Label>Mapear para</Label>
                      <Select
                        label="Mapeamento do campo"
                        value={item.mapping}
                        disabled={!canWrite}
                        options={FIELD_MAPPINGS}
                        onValueChange={(value) => {
                          if (value) updateField(index, { mapping: value as LeadFormField["mapping"] });
                        }}
                      />
                    </Field>
                    <div className={styles.switchCell}>
                      <Switch checked={item.required} disabled={!canWrite} onCheckedChange={(required) => updateField(index, { required })}>
                        Obrigatório
                      </Switch>
                    </div>
                  </div>
                  {item.type === "select" && (
                    <Field>
                      <Label>Opções separadas por vírgula</Label>
                      <Input
                        value={item.options.join(", ")}
                        disabled={!canWrite}
                        onChange={(event) =>
                          updateField(index, {
                            options: event.target.value
                              .split(",")
                              .map((value) => value.trim())
                              .filter(Boolean),
                          })
                        }
                      />
                    </Field>
                  )}
                </Surface>
              ))}
              {canWrite && (
                <Button variant="ghost" icon={<Icon name="plus" />} className={styles.addField} onClick={addField}>
                  Adicionar campo
                </Button>
              )}
            </div>
          </Card>
        </div>
        <aside className={styles.preview} aria-label="Prévia do formulário">
          <SectionTitle
            level="card"
            as="h2"
            description="As respostas nesta prévia não são enviadas."
            actions={previewTouched ? <Button size="sm" variant="ghost" icon={<Icon name="refresh" />} onClick={resetPreview}>Reiniciar</Button> : undefined}
          >
            Prévia interativa
          </SectionTitle>
          {/* Moldura de papel cavado: o formulário aparece como o visitante vê. */}
          <Surface elevation="cavada" radius="2xl" className={styles.stage}>
            <LeadFormRenderer
              title={title || "Título do formulário"}
              description={description}
              fields={fields}
              submitLabel={submitLabel || "Enviar"}
              values={previewValues}
              onValueChange={(id, value) => setPreviewValues((current) => ({ ...current, [id]: value }))}
              onSubmit={() => setPreviewSubmitted(true)}
              successMessage={previewSubmitted ? successMessage || "Sua resposta foi recebida." : null}
            />
          </Surface>
        </aside>
      </div>
    </PageFrame>
  );
}
