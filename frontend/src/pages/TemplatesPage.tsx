import {
  Alert,
  Anchor,
  Badge,
  Button,
  Code,
  Divider,
  Group,
  Loader,
  Modal,
  ScrollArea,
  Stack,
  Table,
  Text,
  TextInput,
  Textarea,
  Title
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { notifications } from "@mantine/notifications";
import { useNavigate } from "react-router-dom";

import {
  createRegisterFromTemplate,
  createTemplate,
  deactivateTemplate,
  getTemplate,
  listTemplates,
  publishTemplateVersion,
  type TemplateWithVersions
} from "../api/templates.api";
import { ApiErrorAlert } from "../components/ApiErrorAlert";
import { useFeatureFlags } from "../hooks/useFeatureFlags";
import { usePermissions } from "../hooks/usePermissions";

function TemplateDetailModal({ templateId, onClose }: { templateId: string; onClose: () => void }) {
  const detailQuery = useQuery({
    queryKey: ["templates", templateId],
    queryFn: () => getTemplate(templateId)
  });

  const template = detailQuery.data;
  const latestPublished = template?.versions
    .filter((v) => v.status === "PUBLISHED")
    .sort((a, b) => b.versionNumber - a.versionNumber)[0] ?? null;

  return (
    <Modal
      opened
      onClose={onClose}
      title="Template details"
      size="xl"
      scrollAreaComponent={ScrollArea.Autosize}
    >
      {detailQuery.isLoading ? (
        <Loader />
      ) : detailQuery.isError ? (
        <ApiErrorAlert error={detailQuery.error} fallback="Unable to load template" />
      ) : template ? (
        <Stack>
          <Group justify="space-between" align="flex-start">
            <Stack gap={4}>
              <Title order={3}>{template.name}</Title>
              {template.description ? (
                <Text size="sm" c="dimmed">{template.description}</Text>
              ) : null}
            </Stack>
            <Badge color={template.isActive ? "green" : "gray"} size="lg">
              {template.isActive ? "Active" : "Inactive"}
            </Badge>
          </Group>

          <Group gap="xl">
            {latestPublished ? (
              <Stack gap={2}>
                <Text size="xs" c="dimmed" fw={600} tt="uppercase">Current version</Text>
                <Text size="sm">v{latestPublished.versionNumber}</Text>
              </Stack>
            ) : null}
            {latestPublished?.publishedAt ? (
              <Stack gap={2}>
                <Text size="xs" c="dimmed" fw={600} tt="uppercase">Published</Text>
                <Text size="sm">{new Date(latestPublished.publishedAt).toLocaleDateString()}</Text>
              </Stack>
            ) : null}
            <Stack gap={2}>
              <Text size="xs" c="dimmed" fw={600} tt="uppercase">Total versions</Text>
              <Text size="sm">{template.versions.length}</Text>
            </Stack>
            <Stack gap={2}>
              <Text size="xs" c="dimmed" fw={600} tt="uppercase">Created</Text>
              <Text size="sm">{new Date(template.createdAt).toLocaleDateString()}</Text>
            </Stack>
          </Group>

          <Divider />

          {latestPublished ? (
            <Stack gap="xs">
              <Group justify="space-between" align="center">
                <Text size="sm" fw={600}>Configuration snapshot (v{latestPublished.versionNumber})</Text>
                <Button
                  variant="subtle"
                  size="xs"
                  onClick={() => {
                    const exportData = {
                      meta: {
                        exportedAt: new Date().toISOString(),
                        schemaVersion: 1,
                        templateId: template.id,
                        templateName: template.name,
                        versionNumber: latestPublished.versionNumber
                      },
                      config: latestPublished.snapshotJson
                    };
                    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `template-${template.name.toLowerCase().replace(/\s+/g, "-")}-v${latestPublished.versionNumber}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  Download config
                </Button>
              </Group>
              <ScrollArea h={420} type="auto" offsetScrollbars={false}>
                <Code block style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 12 }}>
                  {JSON.stringify(latestPublished.snapshotJson, null, 2)}
                </Code>
              </ScrollArea>
            </Stack>
          ) : (
            <Text size="sm" c="dimmed">No published version available.</Text>
          )}
        </Stack>
      ) : null}
    </Modal>
  );
}

function CreateTemplateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [snapshotJson, setSnapshotJson] = useState<unknown>(null);

  const form = useForm({
    initialValues: { name: "", description: "" },
    validate: {
      name: (v) => (v.trim().length === 0 ? "Name is required" : null)
    }
  });

  const createMutation = useMutation({
    mutationFn: (values: { name: string; description: string }) =>
      createTemplate({
        name: values.name.trim(),
        description: values.description.trim() || undefined,
        snapshotJson
      }),
    onSuccess: () => {
      onCreated();
      onClose();
    }
  });

  function handleFile(file: File) {
    setParseError(null);
    setSnapshotJson(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        // Accept both a raw export ({ meta, config }) and a bare snapshot
        const config = parsed?.config ?? parsed;
        if (typeof config !== "object" || config === null) {
          setParseError("Could not read configuration from file. Make sure you are uploading an exported register config file.");
          return;
        }
        setSnapshotJson(config);
        // Pre-fill name from export metadata if the field is still empty
        const exportedName: unknown = parsed?.meta?.registerName;
        if (typeof exportedName === "string" && !form.values.name) {
          form.setFieldValue("name", exportedName);
        }
      } catch {
        setParseError("File is not valid JSON.");
      }
    };
    reader.readAsText(file);
  }

  return (
    <Modal opened onClose={onClose} title="Create template from config file" size="md">
      <form onSubmit={form.onSubmit((values) => createMutation.mutate(values))}>
        <Stack>
          <Text size="sm" c="dimmed">
            Upload a register configuration export file (.json) to create a reusable template. The configuration will be captured as a published template version.
          </Text>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />

          <Group>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              {snapshotJson ? "Replace file" : "Choose config file"}
            </Button>
            {snapshotJson ? (
              <Text size="sm" c="green">Configuration loaded</Text>
            ) : (
              <Text size="sm" c="dimmed">No file chosen</Text>
            )}
          </Group>

          {parseError ? (
            <Alert color="red" title="Invalid file">{parseError}</Alert>
          ) : null}

          <TextInput
            label="Template name"
            placeholder="e.g. Standard Risk Register"
            required
            {...form.getInputProps("name")}
          />
          <Textarea
            label="Description"
            placeholder="Optional — describe when to use this template"
            autosize
            minRows={2}
            {...form.getInputProps("description")}
          />

          <ApiErrorAlert error={createMutation.error} fallback="Unable to create template" />

          <Group justify="flex-end">
            <Button variant="subtle" onClick={onClose} disabled={createMutation.isPending}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!snapshotJson}
              loading={createMutation.isPending}
            >
              Create template
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

function UpdateTemplateModal({
  template,
  onClose,
  onUpdated
}: {
  template: TemplateWithVersions;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [snapshotJson, setSnapshotJson] = useState<unknown>(null);

  const publishMutation = useMutation({
    mutationFn: () => publishTemplateVersion(template.id, { snapshotJson }),
    onSuccess: () => {
      notifications.show({
        message: `Template "${template.name}" updated to v${nextVersion}.`,
        color: "green"
      });
      onUpdated();
      onClose();
    }
  });

  function handleFile(file: File) {
    setParseError(null);
    setSnapshotJson(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        const config = parsed?.config ?? parsed;
        if (typeof config !== "object" || config === null) {
          setParseError("Could not read configuration from file. Make sure you are uploading an exported register config file.");
          return;
        }
        setSnapshotJson(config);
      } catch {
        setParseError("File is not valid JSON.");
      }
    };
    reader.readAsText(file);
  }

  const nextVersion = (template.latestPublishedVersion?.versionNumber ?? 0) + 1;

  return (
    <Modal opened onClose={onClose} title={`Update config — "${template.name}"`} size="md">
      <Stack>
        <Text size="sm" c="dimmed">
          Upload a new register configuration export file (.json). This will publish a new version ({`v${nextVersion}`}) of the template. Existing registers created from this template are not affected automatically.
        </Text>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />

        <Group>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            {snapshotJson ? "Replace file" : "Choose config file"}
          </Button>
          {snapshotJson ? (
            <Text size="sm" c="green">Configuration loaded</Text>
          ) : (
            <Text size="sm" c="dimmed">No file chosen</Text>
          )}
        </Group>

        {parseError ? (
          <Alert color="red" title="Invalid file">{parseError}</Alert>
        ) : null}

        <ApiErrorAlert error={publishMutation.error} fallback="Unable to publish new template version" />

        <Group justify="flex-end">
          <Button variant="subtle" onClick={onClose} disabled={publishMutation.isPending}>
            Cancel
          </Button>
          <Button
            disabled={!snapshotJson}
            loading={publishMutation.isPending}
            onClick={() => publishMutation.mutate()}
          >
            Publish v{nextVersion}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

function CreateRegisterModal({
  template,
  onClose
}: {
  template: TemplateWithVersions;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const form = useForm({ initialValues: { name: "" } });

  const createMutation = useMutation({
    mutationFn: (name: string) =>
      createRegisterFromTemplate({
        templateVersionId: template.latestPublishedVersion!.id,
        name
      }),
    onSuccess: (register) => {
      navigate(`/registers/${register.id}`);
    }
  });

  return (
    <Modal opened onClose={onClose} title={`Create register from "${template.name}"`}>
      <form onSubmit={form.onSubmit((values) => createMutation.mutate(values.name))}>
        <Stack>
          <Text size="sm" c="dimmed">
            A new register will be created with the configuration from this template. You can customise it after creation.
          </Text>
          <ApiErrorAlert error={createMutation.error} fallback="Unable to create register" />
          <TextInput
            label="Register name"
            placeholder="e.g. Information Security Risk Register"
            required
            data-autofocus
            {...form.getInputProps("name")}
          />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={onClose} disabled={createMutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" loading={createMutation.isPending}>
              Create register
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

export function TemplatesPage() {
  const flags = useFeatureFlags();
  const { isSystemAdmin } = usePermissions();
  const queryClient = useQueryClient();
  const [createTemplateOpen, setCreateTemplateOpen] = useState(false);
  const [viewingTemplateId, setViewingTemplateId] = useState<string | null>(null);
  const [updatingConfig, setUpdatingConfig] = useState<TemplateWithVersions | null>(null);
  const [creatingFrom, setCreatingFrom] = useState<TemplateWithVersions | null>(null);

  const templatesQuery = useQuery({
    queryKey: ["templates"],
    queryFn: () => listTemplates(),
    enabled: flags.draftConfig && isSystemAdmin
  });

  const deactivateMutation = useMutation({
    mutationFn: (templateId: string) => deactivateTemplate(templateId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["templates"] });
    }
  });

  if (!flags.draftConfig || !isSystemAdmin) {
    return null;
  }

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={1}>Register Templates</Title>
        <Button onClick={() => setCreateTemplateOpen(true)}>Create template</Button>
      </Group>
      <ApiErrorAlert error={templatesQuery.error} fallback="Unable to load templates" />
      <ApiErrorAlert error={deactivateMutation.error} fallback="Unable to deactivate template" />
      {templatesQuery.isLoading ? <Loader /> : null}
      <Table.ScrollContainer minWidth={640}>
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Description</Table.Th>
              <Table.Th>Latest Version</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {(templatesQuery.data ?? []).map((template) => (
              <Table.Tr key={template.id}>
                <Table.Td>
                  <Anchor
                    component="button"
                    fw={600}
                    style={{ textAlign: "left" }}
                    onClick={() => setViewingTemplateId(template.id)}
                  >
                    {template.name}
                  </Anchor>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c={template.description ? undefined : "dimmed"}>
                    {template.description ?? "—"}
                  </Text>
                </Table.Td>
                <Table.Td>
                  {template.latestPublishedVersion
                    ? `v${template.latestPublishedVersion.versionNumber}`
                    : <Text size="sm" c="dimmed">No published version</Text>}
                </Table.Td>
                <Table.Td>
                  <Badge color={template.isActive ? "green" : "gray"}>
                    {template.isActive ? "Active" : "Inactive"}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Group gap="xs" justify="flex-end" wrap="nowrap">
                    {template.isActive && template.latestPublishedVersion ? (
                      <Button
                        variant="light"
                        size="xs"
                        onClick={() => setCreatingFrom(template)}
                      >
                        Create register
                      </Button>
                    ) : null}
                    {template.isActive ? (
                      <Button
                        variant="light"
                        size="xs"
                        onClick={() => setUpdatingConfig(template)}
                      >
                        Update config
                      </Button>
                    ) : null}
                    {template.isActive ? (
                      <Button
                        variant="light"
                        size="xs"
                        color="red"
                        onClick={() => deactivateMutation.mutate(template.id)}
                        loading={deactivateMutation.isPending && deactivateMutation.variables === template.id}
                      >
                        Deactivate
                      </Button>
                    ) : null}
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
            {templatesQuery.data?.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={5}>
                  <Text c="dimmed">No templates found.</Text>
                </Table.Td>
              </Table.Tr>
            ) : null}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>

      {viewingTemplateId ? (
        <TemplateDetailModal
          templateId={viewingTemplateId}
          onClose={() => setViewingTemplateId(null)}
        />
      ) : null}

      {createTemplateOpen ? (
        <CreateTemplateModal
          onClose={() => setCreateTemplateOpen(false)}
          onCreated={() => queryClient.invalidateQueries({ queryKey: ["templates"] })}
        />
      ) : null}

      {updatingConfig ? (
        <UpdateTemplateModal
          template={updatingConfig}
          onClose={() => setUpdatingConfig(null)}
          onUpdated={() => queryClient.invalidateQueries({ queryKey: ["templates"] })}
        />
      ) : null}

      {creatingFrom ? (
        <CreateRegisterModal
          template={creatingFrom}
          onClose={() => setCreatingFrom(null)}
        />
      ) : null}
    </Stack>
  );
}
