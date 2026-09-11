import { useId, useState } from "react";
import { redirect } from "react-router";
import type { Route } from "./+types/admin-permission-groups";
import {
  permissionGroupsControllerCreate,
  permissionGroupsControllerList,
  permissionGroupsControllerUpdate,
  type PermissionGroupDto,
} from "@spark/api-client";
import { CAPABILITIES, permissionGroupId as permissionGroupIdFactory, type Capability } from "@spark/core";
import { ActionModal, Button, Card, Checkbox, Field, Input, Label, PageHeader } from "@spark/ui-web";
import { restoreSession } from "../lib/auth.client";
import styles from "./admin-permission-groups.module.css";

const CAPABILITY_LABELS: Record<Capability, string> = {
  "contacts:read": "Ver contatos",
  "contacts:write": "Criar e editar contatos",
  "users:manage": "Gerenciar usuários",
  "permission_groups:manage": "Gerenciar permissões",
  "pipelines:manage": "Configurar funis e etapas",
  "deals:read": "Ver negócios",
  "deals:write": "Criar e editar negócios",
  "deals:move": "Mover negócios entre etapas",
  "activities:read": "Ver atividades",
  "activities:write": "Criar e concluir atividades",
};

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
    setCapabilities((current) => checked
      ? [...current, capability]
      : current.filter((item) => item !== capability));
  }

  async function save() {
    const normalizedName = name.trim();
    if (!normalizedName) throw new Error("MISSING_NAME");

    if (editingId) {
      const updated = await permissionGroupsControllerUpdate(editingId, {
        name: normalizedName,
        capabilities,
      });
      setGroups((current) => current.map((group) => group.id === updated.id ? updated : group));
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
        title="Grupos de permissão"
        description="Defina o que cada equipe pode consultar, criar e administrar."
        actions={<Button onClick={openCreate}>Novo grupo</Button>}
      />

      {feedback && <p className={styles.feedback} role="status">{feedback}</p>}

      <div className={styles.grid} aria-label="Grupos de permissão">
        {groups.map((group) => (
          <Card
            key={group.id}
            title={group.name}
            description={`${group.capabilities.length} permissões`}
            actions={<Button variant="secondary" size="sm" onClick={() => openEdit(group)}>Editar</Button>}
          >
            <ul className={styles.capabilityList}>
              {group.capabilities.map((capability) => (
                <li key={capability}>{CAPABILITY_LABELS[capability as Capability]}</li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      <ActionModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editingId ? "Editar grupo" : "Novo grupo"}
        confirmLabel={editingId ? "Salvar alterações" : "Criar grupo"}
        errorText="Não foi possível salvar o grupo. Confira os dados e tente novamente."
        onConfirm={save}
      >
        <div className={styles.modalFields}>
          <Field>
            <Label>Nome do grupo</Label>
            <Input value={name} onChange={(event) => setName(event.target.value)} autoComplete="off" />
          </Field>
          <div className={styles.capabilityPicker} role="group" aria-labelledby={capabilityLabelId}>
            <p id={capabilityLabelId} className={styles.capabilityLegend}>Permissões</p>
            {CAPABILITIES.map((capability) => (
              <Checkbox
                key={capability}
                checked={capabilities.includes(capability)}
                onCheckedChange={(checked) => toggleCapability(capability, checked)}
              >
                {CAPABILITY_LABELS[capability]}
              </Checkbox>
            ))}
          </div>
        </div>
      </ActionModal>
    </div>
  );
}
