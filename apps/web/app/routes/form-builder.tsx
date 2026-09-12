import { useEffect, useState } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import { useNavigate, useParams } from "react-router";
import { formsControllerStatus, formsControllerUpdate } from "@spark/api-client";
import type { LeadFormField } from "@spark/core";
import {
  Badge,
  Button,
  Field,
  Icon,
  Input,
  Label,
  LeadFormRenderer,
  PageHeader,
  Select,
  Switch,
  Textarea,
  notify,
} from "@spark/ui-web";
import { getLeadFormsCollection } from "../lib/forms-collections.client";
import { getSession } from "../lib/auth.client";
import { requireCapability } from "../lib/route-access.client";
import styles from "./form-builder.module.css";
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
  const { data: forms } = useLiveQuery({
    query: (q) => q.from({ forms: getLeadFormsCollection() }),
  });
  const form = forms.find((item) => item.id === formId);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitLabel, setSubmitLabel] = useState("Enviar");
  const [successMessage, setSuccessMessage] = useState("");
  const [fields, setFields] = useState<LeadFormField[]>([]);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!form) return;
    setName(form.name);
    setTitle(form.title);
    setDescription(form.description ?? "");
    setSubmitLabel(form.submitLabel);
    setSuccessMessage(form.successMessage);
    setFields(form.fields);
  }, [form]);
  if (!form)
    return (
      <div className={styles.page}>
        <PageHeader eyebrow="Formulários" title="Carregando…" />
      </div>
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
  const publicUrl = `${window.location.origin}/f/${form.publicKey}`;
  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Formulários"
        title={form.name}
        description="Edite campos, mapeamentos e textos. A prévia usa o mesmo componente publicado."
        actions={
          <div className={styles.headerActions}>
            <Button variant="ghost" onClick={() => navigate("/forms")}>
              Voltar
            </Button>
            {form.status === "published" && (
              <Button
                variant="secondary"
                onClick={() => window.open(publicUrl, "_blank", "noopener,noreferrer")}
              >
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
          </div>
        }
      />
      <div className={styles.status}>
        <Badge tone={form.status === "published" ? "success" : "neutral"}>
          {form.status === "published" ? "Publicado" : "Rascunho"}
        </Badge>
        <code>{publicUrl}</code>
      </div>
      <div className={styles.workspace}>
        <div className={styles.editor}>
          <section className={styles.editorSection}>
            <div className={styles.sectionHeading}><h2>Conteúdo</h2><p>Textos que aparecem no topo e após o envio.</p></div>
            <div className={styles.form}>
              <Field>
                <Label>Nome interno</Label>
                <Input
                  value={name}
                  disabled={!canWrite}
                  onChange={(event) => setName(event.target.value)}
                />
              </Field>
              <Field>
                <Label>Título</Label>
                <Input
                  value={title}
                  disabled={!canWrite}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </Field>
              <Field>
                <Label>Descrição</Label>
                <Textarea
                  value={description}
                  disabled={!canWrite}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </Field>
              <div className={styles.columns}>
                <Field>
                  <Label>Texto do botão</Label>
                  <Input
                    value={submitLabel}
                    disabled={!canWrite}
                    onChange={(event) => setSubmitLabel(event.target.value)}
                  />
                </Field>
                <Field>
                  <Label>Mensagem de sucesso</Label>
                  <Input
                    value={successMessage}
                    disabled={!canWrite}
                    onChange={(event) => setSuccessMessage(event.target.value)}
                  />
                </Field>
              </div>
            </div>
          </section>
          <section className={styles.editorSection}>
            <div className={styles.sectionHeading}><h2>Campos</h2><p>O mapeamento define qual propriedade do lead recebe o valor.</p></div>
            <div className={styles.fieldList}>
              {fields.map((item, index) => (
                <div className={styles.fieldCard} key={item.id}>
                  <div className={styles.fieldCardHeader}>
                    <strong>Campo {index + 1}</strong>
                    <div>
                      <Button
                        iconOnly
                        size="sm"
                        variant="ghost"
                        aria-label="Mover para cima"
                        disabled={!canWrite || index === 0}
                        onClick={() => move(index, -1)}
                      >
                        <Icon name="up" />
                      </Button>
                      <Button
                        iconOnly
                        size="sm"
                        variant="ghost"
                        aria-label="Mover para baixo"
                        disabled={!canWrite || index === fields.length - 1}
                        onClick={() => move(index, 1)}
                      >
                        <Icon name="chevron" />
                      </Button>
                      <Button
                        iconOnly
                        size="sm"
                        variant="ghost"
                        aria-label="Remover campo"
                        disabled={!canWrite || fields.length === 1}
                        onClick={() =>
                          setFields((current) =>
                            current.filter((_, position) => position !== index),
                          )
                        }
                      >
                        <Icon name="trash" />
                      </Button>
                    </div>
                  </div>
                  <div className={styles.columns}>
                    <Field>
                      <Label>Rótulo</Label>
                      <Input
                        value={item.label}
                        disabled={!canWrite}
                        onChange={(event) => updateField(index, { label: event.target.value })}
                      />
                    </Field>
                    <Field>
                      <Label>Tipo</Label>
                      <Select
                        label="Tipo do campo"
                        value={item.type}
                        disabled={!canWrite}
                        options={[
                          { value: "text", label: "Texto" },
                          { value: "email", label: "E-mail" },
                          { value: "phone", label: "Telefone" },
                          { value: "textarea", label: "Texto longo" },
                          { value: "select", label: "Seleção" },
                          { value: "checkbox", label: "Confirmação" },
                        ]}
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
                        options={[
                          { value: "none", label: "Campo personalizado" },
                          { value: "name", label: "Nome" },
                          { value: "email", label: "E-mail" },
                          { value: "phone", label: "Telefone" },
                          { value: "company", label: "Empresa" },
                        ]}
                        onValueChange={(value) => {
                          if (value)
                            updateField(index, { mapping: value as LeadFormField["mapping"] });
                        }}
                      />
                    </Field>
                    <Switch
                      checked={item.required}
                      disabled={!canWrite}
                      onCheckedChange={(required) => updateField(index, { required })}
                    >
                      Obrigatório
                    </Switch>
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
                </div>
              ))}
              {canWrite && (
                <Button variant="secondary" onClick={addField}>
                  Adicionar campo
                </Button>
              )}
            </div>
          </section>
        </div>
        <aside className={styles.preview}>
          <span>Prévia</span>
          <LeadFormRenderer
            title={title || "Título do formulário"}
            description={description}
            fields={fields}
            submitLabel={submitLabel || "Enviar"}
            values={{}}
            onValueChange={() => undefined}
            onSubmit={() => undefined}
            disabled
          />
        </aside>
      </div>
    </div>
  );
}
