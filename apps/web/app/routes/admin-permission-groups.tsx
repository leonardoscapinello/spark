import { useEffect, useId, useState } from "react";
import { redirect } from "react-router";
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
  CollectionToolbar,
  DataTable,
  EmptyState,
  Field,
  Icon,
  Input,
  Label,
  PageHeader,
  TableIconAction,
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
  return null;
}

export default function AdminPermissionGroups() {
  const capabilityLabelId = useId();
  const [groups, setGroups] = useState<PermissionGroupDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  useEffect(() => {
    let active = true;
    void permissionGroupsControllerList().then((nextGroups) => {
      if (!active) return;
      setGroups(nextGroups);
      setLoadError(false);
    }).catch(() => { if (active) setLoadError(true); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reloadKey]);
  const searchTerm = search.trim().toLocaleLowerCase("pt-BR");
  const filteredGroups = groups.filter((group) =>
    !searchTerm || `${group.name} ${group.capabilities.map((capability) => CAPABILITY_LABELS[capability as Capability]).join(" ")}`.toLocaleLowerCase("pt-BR").includes(searchTerm),
  );
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
        icon="settings"
        eyebrow="Administração"
        title="Grupos de permissões"
        description="Defina o que cada equipe pode consultar, criar e administrar."
        actions={groups.length > 0 ? <Button onClick={openCreate}>Novo grupo</Button> : undefined}
      />

      {feedback && (
        <p className={styles.feedback} role="status">
          {feedback}
        </p>
      )}

      {loadError
        ? <EmptyState icon="settings" title="Não foi possível carregar os grupos" description="Tente novamente para consultar as permissões." action={<Button onClick={() => { setLoading(true); setReloadKey((value) => value + 1); }}>Tentar novamente</Button>} />
        : <>
          {!loading && groups.length === 0 && <EmptyState variant="featured" icon="settings" title="Defina o primeiro grupo" description="Reúna permissões por função para controlar o que cada pessoa pode consultar e alterar." action={<Button onClick={openCreate}>Novo grupo</Button>} />}
          <CollectionToolbar
            search={<Input aria-label="Buscar grupos de permissões" placeholder="Buscar grupo ou permissão" value={search} startAdornment={<Icon name="search" />} onChange={(event) => setSearch(event.target.value)} />}
            count={`${filteredGroups.length} ${filteredGroups.length === 1 ? "grupo" : "grupos"}`}
          />
          <DataTable label="Grupos de permissões" rows={filteredGroups} columns={columns} rowKey={(group) => group.id} rowLabel={(group) => group.name} state={loading ? "loading" : "ready"} emptyText="Nenhum grupo encontrado." actions={(group) => <TableIconAction label={`Editar ${group.name}`} icon={<Icon name="right" />} onClick={() => openEdit(group)} />} />
        </>}

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
