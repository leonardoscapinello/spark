import { useId, useState } from "react";
import { redirect } from "react-router";
import type { Route } from "./+types/admin-permission-groups";
import {
  permissionGroupsControllerCreate,
  permissionGroupsControllerList,
  permissionGroupsControllerUpdate,
  type PermissionGroupDto,
} from "@spark/api-client";
import {
  CAPABILITIES,
  permissionGroupId as permissionGroupIdFactory,
  type Capability,
} from "@spark/core";
import {
  ActionModal,
  Button,
  Checkbox,
  DataTable,
  EmptyState,
  Field,
  Input,
  Label,
  PageHeader,
  type TableColumn,
} from "@spark/ui-web";
import { restoreSession } from "../lib/auth.client";
import styles from "./admin-permission-groups.module.css";

const CAPABILITY_LABELS: Record<Capability, string> = {
  "contacts:read": "Ver contatos",
  "contacts:write": "Criar e editar contatos",
  "companies:read": "Ver empresas",
  "companies:write": "Criar e editar empresas",
  "users:manage": "Gerenciar usuários",
  "permission_groups:manage": "Gerenciar permissões",
  "audit_logs:read": "Consultar auditoria",
  "pipelines:manage": "Configurar funis e etapas",
  "deals:read": "Ver negócios",
  "deals:write": "Criar e editar negócios",
  "deals:move": "Mover negócios entre etapas",
  "activities:read": "Ver atividades",
  "activities:write": "Criar e concluir atividades",
  "inbox:read": "Ver conversas de atendimento",
  "inbox:write": "Criar, atribuir e responder conversas",
  "automations:read": "Ver automações",
  "automations:write": "Criar e editar automações",
  "automations:publish": "Publicar automações",
  "integrations:read": "Ver integrações",
  "integrations:manage": "Configurar integrações",
  "files:read": "Ver arquivos",
  "files:write": "Enviar e excluir arquivos",
  "catalog:read": "Ver catálogo",
  "catalog:write": "Gerenciar produtos e descontos",
  "forms:read": "Ver formulários e respostas",
  "forms:write": "Criar e publicar formulários",
  "social:read": "Ver calendário e publicações sociais",
  "social:write": "Criar e agendar publicações sociais",
  "campaigns:read": "Ver campanhas e públicos",
  "campaigns:write": "Criar e enviar campanhas",
  "settings:manage": "Gerenciar configurações e campos",
  "pages:read": "Ver páginas e versões",
  "pages:write": "Criar, editar e publicar páginas",
};

const CAPABILITY_SECTIONS = [
  { title: "Leads", prefixes: ["contacts:", "companies:"] },
  { title: "CRM", prefixes: ["pipelines:", "deals:", "activities:", "catalog:"] },
  { title: "Atendimento", prefixes: ["inbox:"] },
  { title: "Automações", prefixes: ["automations:"] },
  { title: "Marketing e conteúdo", prefixes: ["campaigns:", "forms:", "pages:", "social:", "files:"] },
  { title: "Integrações", prefixes: ["integrations:"] },
  { title: "Administração", prefixes: ["users:", "permission_groups:", "audit_logs:", "settings:"] },
] as const;

export async function clientLoader() {
  const session = await restoreSession();
  if (!session) throw redirect("/login");
  if (!session.capabilities.includes("permission_groups:manage")) throw redirect("/");
  return { groups: await permissionGroupsControllerList() };
}

export default function AdminPermissionGroups({ loaderData }: Route.ComponentProps) {
  const capabilityLabelId = useId();
  const [groups, setGroups] = useState(loaderData.groups);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const columns: TableColumn<PermissionGroupDto>[] = [
    { id: "name", label: "Grupo", cell: (group) => <strong>{group.name}</strong>, sortValue: (group) => group.name },
    { id: "permissions", label: "Permissões", cell: (group) => <div className={styles.groupSummary}><strong>{group.capabilities.length} {group.capabilities.length === 1 ? "permissão" : "permissões"}</strong><span>{group.capabilities.length ? group.capabilities.slice(0, 3).map((capability) => CAPABILITY_LABELS[capability as Capability]).join(" · ") : "Sem acesso configurado"}</span></div>, sortValue: (group) => group.capabilities.length },
  ];

  function openCreate() {
    setEditingId(null);
    setName("");
    setCapabilities([]);
    setModalOpen(true);
  }

  function openEdit(group: PermissionGroupDto) {
    setEditingId(group.id);
    setName(group.name);
    setCapabilities(group.capabilities as Capability[]);
    setModalOpen(true);
  }

  function toggleCapability(capability: Capability, checked: boolean) {
    setCapabilities((current) =>
      checked ? [...current, capability] : current.filter((item) => item !== capability),
    );
  }

  async function save() {
    const normalizedName = name.trim();
    if (!normalizedName) throw new Error("MISSING_NAME");

    if (editingId) {
      const updated = await permissionGroupsControllerUpdate(editingId, {
        name: normalizedName,
        capabilities,
      });
      setGroups((current) => current.map((group) => (group.id === updated.id ? updated : group)));
      setFeedback(`Grupo ${updated.name} atualizado.`);
      return;
    }

    const created = await permissionGroupsControllerCreate({
      id: permissionGroupIdFactory.create(),
      name: normalizedName,
      capabilities,
    });
    setGroups((current) => [...current, created]);
    setFeedback(`Grupo ${created.name} criado.`);
  }

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Administração"
        title="Grupos de permissões"
        description="Defina o que cada equipe pode consultar, criar e administrar."
        actions={<Button onClick={openCreate}>Novo grupo</Button>}
      />

      {feedback && (
        <p className={styles.feedback} role="status">
          {feedback}
        </p>
      )}

      {groups.length === 0
        ? <EmptyState icon="settings" title="Defina o primeiro grupo" description="Reúna permissões por função para controlar o que cada pessoa pode consultar e alterar." action={<Button onClick={openCreate}>Novo grupo</Button>} />
        : <DataTable label="Grupos de permissões" rows={groups} columns={columns} rowKey={(group) => group.id} rowLabel={(group) => group.name} actions={(group) => <Button variant="secondary" size="sm" onClick={() => openEdit(group)}>Editar</Button>} />}

      <ActionModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editingId ? "Editar grupo" : "Novo grupo"}
        size="wide"
        confirmLabel={editingId ? "Salvar alterações" : "Criar grupo"}
        errorText="Não foi possível salvar o grupo. Confira os dados e tente novamente."
        onConfirm={save}
      >
        <div className={styles.modalFields}>
          <Field>
            <Label>Nome do grupo</Label>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="off"
            />
          </Field>
          <div className={styles.capabilityPicker} role="group" aria-labelledby={capabilityLabelId}>
            <p id={capabilityLabelId} className={styles.capabilityLegend}>
              Permissões
            </p>
            {CAPABILITY_SECTIONS.map((section) => <section key={section.title} className={styles.capabilityGroup} aria-label={section.title}>
              <h3>{section.title}</h3>
              {CAPABILITIES.filter((capability) => section.prefixes.some((prefix) => capability.startsWith(prefix))).map((capability) => <Checkbox
                key={capability}
                checked={capabilities.includes(capability)}
                onCheckedChange={(checked) => toggleCapability(capability, checked)}
              >{CAPABILITY_LABELS[capability]}</Checkbox>)}
            </section>)}
          </div>
        </div>
      </ActionModal>
    </div>
  );
}
