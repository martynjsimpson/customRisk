import {
  Alert,
  Anchor,
  Badge,
  Button,
  Group,
  List,
  Loader,
  Modal,
  Stack,
  Text,
  TextInput,
  Textarea
} from "@mantine/core";
import { Link } from "react-router-dom";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";

import {
  analyseImpact,
  createDraft,
  discardDraft,
  exportRegisterConfig,
  getConfigVersionStatus,
  importRegisterConfig,
  publishDraft,
  type ImpactAnalysisResult,
  type ImpactEntry
} from "../../api/configVersion.api";
import { createTemplateFromRegister } from "../../api/templates.api";
import { ApiErrorAlert } from "../../components/ApiErrorAlert";
import { usePermissions } from "../../hooks/usePermissions";

interface ConfigVersionBannerProps {
  registerId: string;
  canManage: boolean;
}

function ImpactEntryDetail({ entry, registerId, onClose }: { entry: ImpactEntry; registerId: string; onClose: () => void }) {
  if (entry.code === "REVERT_MODE_BLOCKED_MULTIPLE_ACTIONS") {
    const offendingRisks = (
      entry.meta as { offendingRisks?: { riskId: string; displayRiskId: string; title: string }[] } | undefined
    )?.offendingRisks ?? [];
    return (
      <Stack gap={4}>
        <Text size="sm">{entry.message}</Text>
        {offendingRisks.length > 0 ? (
          <List size="sm" withPadding>
            {offendingRisks.map((risk) => (
              <List.Item key={risk.riskId}>
                <Anchor
                  component={Link}
                  to={`/registers/${registerId}?riskId=${risk.riskId}`}
                  size="sm"
                  onClick={onClose}
                >
                  {risk.displayRiskId}
                </Anchor>
                {" — "}
                {risk.title}
              </List.Item>
            ))}
          </List>
        ) : null}
      </Stack>
    );
  }
  return <Text size="sm">{entry.message}</Text>;
}

function ImpactAnalysisModal({
  opened,
  onClose,
  result,
  onPublish,
  isPublishing,
  publishError,
  registerId
}: {
  opened: boolean;
  onClose: () => void;
  result: ImpactAnalysisResult | null;
  onPublish: () => void;
  isPublishing: boolean;
  publishError: unknown;
  registerId: string;
}) {
  const structuredBlockers = (result?.impactEntries ?? []).filter((e) => e.type === "BLOCKER");
  const structuredWarnings = (result?.impactEntries ?? []).filter((e) => e.type === "WARNING");

  return (
    <Modal opened={opened} onClose={onClose} title="Impact Analysis" transitionProps={{ duration: 0 }}>
      {result ? (
        <Stack>
          <div>
            <Text fw={600} mb="xs">Affected Risks</Text>
            <Stack gap={4}>
              {result.affectedRisks.deactivatedLikelihood > 0 ? (
                <Text size="sm">Deactivated likelihood: {result.affectedRisks.deactivatedLikelihood}</Text>
              ) : null}
              {result.affectedRisks.deactivatedImpact > 0 ? (
                <Text size="sm">Deactivated impact: {result.affectedRisks.deactivatedImpact}</Text>
              ) : null}
              {result.affectedRisks.deactivatedResponseStrategy > 0 ? (
                <Text size="sm">Deactivated response strategy: {result.affectedRisks.deactivatedResponseStrategy}</Text>
              ) : null}
              {result.affectedRisks.deactivatedCustomField > 0 ? (
                <Text size="sm">Deactivated custom field: {result.affectedRisks.deactivatedCustomField}</Text>
              ) : null}
              <Text size="sm" fw={500}>Total affected: {result.affectedRisks.total}</Text>
            </Stack>
          </div>
          {result.warnings.length > 0 && structuredWarnings.length === 0 ? (
            <Alert color="yellow" title="Warnings">
              <List size="sm">
                {result.warnings.map((w, i) => (
                  <List.Item key={i}>{w}</List.Item>
                ))}
              </List>
            </Alert>
          ) : null}
          {structuredWarnings.length > 0 ? (
            <Alert color="yellow" title="Warnings">
              <Stack gap="xs">
                {structuredWarnings.map((entry, i) => (
                  <ImpactEntryDetail key={i} entry={entry} registerId={registerId} onClose={onClose} />
                ))}
              </Stack>
            </Alert>
          ) : null}
          {result.blockers.length > 0 && structuredBlockers.length === 0 ? (
            <Alert color="red" title="Blockers">
              <List size="sm">
                {result.blockers.map((b, i) => (
                  <List.Item key={i}>{b}</List.Item>
                ))}
              </List>
            </Alert>
          ) : null}
          {structuredBlockers.length > 0 ? (
            <Alert color="red" title="Blockers">
              <Stack gap="xs">
                {structuredBlockers.map((entry, i) => (
                  <ImpactEntryDetail key={i} entry={entry} registerId={registerId} onClose={onClose} />
                ))}
              </Stack>
            </Alert>
          ) : null}
          <ApiErrorAlert error={publishError} fallback="Unable to publish draft" />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={onClose}>Close</Button>
            <Button
              onClick={onPublish}
              disabled={!result.canPublish}
              loading={isPublishing}
            >
              Publish
            </Button>
          </Group>
        </Stack>
      ) : (
        <Loader />
      )}
    </Modal>
  );
}

function CreateTemplateModal({
  opened,
  onClose,
  registerId
}: {
  opened: boolean;
  onClose: () => void;
  registerId: string;
}) {
  const queryClient = useQueryClient();
  const form = useForm({
    initialValues: {
      name: "",
      description: ""
    }
  });

  const createTemplateMutation = useMutation({
    mutationFn: (values: { name: string; description?: string }) =>
      createTemplateFromRegister(registerId, values),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["templates"] }),
        queryClient.invalidateQueries({ queryKey: ["register", registerId] })
      ]);
      form.reset();
      onClose();
    }
  });

  return (
    <Modal opened={opened} onClose={onClose} title="Save as Template">
      <form
        onSubmit={form.onSubmit((values) => {
          createTemplateMutation.mutate({
            name: values.name,
            description: values.description || undefined
          });
        })}
      >
        <Stack>
          <ApiErrorAlert error={createTemplateMutation.error} fallback="Unable to create template" />
          <TextInput label="Template Name" required {...form.getInputProps("name")} />
          <Textarea label="Description" {...form.getInputProps("description")} />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={createTemplateMutation.isPending}>Save as Template</Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

function ImportConfigModal({
  opened,
  onClose,
  registerId
}: {
  opened: boolean;
  onClose: () => void;
  registerId: string;
}) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<unknown>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const importMutation = useMutation({
    mutationFn: () => importRegisterConfig(registerId, fileContent),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["config-version-status", registerId] }),
        queryClient.invalidateQueries({ queryKey: ["register-config", registerId] })
      ]);
      setFileName(null);
      setFileContent(null);
      onClose();
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParseError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        setFileContent(parsed);
      } catch {
        setParseError("Invalid JSON file");
        setFileContent(null);
      }
    };
    reader.readAsText(file);
  };

  const handleClose = () => {
    setFileName(null);
    setFileContent(null);
    setParseError(null);
    onClose();
  };

  return (
    <Modal opened={opened} onClose={handleClose} title="Import Configuration">
      <Stack>
        <ApiErrorAlert error={importMutation.error} fallback="Unable to import configuration" />
        {parseError ? <Alert color="red">{parseError}</Alert> : null}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
        <Group>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            Choose File
          </Button>
          {fileName ? <Text size="sm">{fileName}</Text> : <Text size="sm" c="dimmed">No file selected</Text>}
        </Group>
        <Group justify="flex-end">
          <Button variant="subtle" onClick={handleClose}>Cancel</Button>
          <Button
            onClick={() => importMutation.mutate()}
            disabled={!fileContent}
            loading={importMutation.isPending}
          >
            Import
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

export function ConfigVersionBanner({ registerId, canManage }: ConfigVersionBannerProps) {
  const queryClient = useQueryClient();
  const { isSystemAdmin } = usePermissions();

  const [impactModalOpen, { open: openImpactModal, close: closeImpactModal }] = useDisclosure(false);
  const [discardConfirmOpen, { open: openDiscardConfirm, close: closeDiscardConfirm }] = useDisclosure(false);
  const [importModalOpen, { open: openImportModal, close: closeImportModal }] = useDisclosure(false);
  const [templateModalOpen, { open: openTemplateModal, close: closeTemplateModal }] = useDisclosure(false);
  const [impactResult, setImpactResult] = useState<ImpactAnalysisResult | null>(null);

  const statusQuery = useQuery({
    queryKey: ["config-version-status", registerId],
    queryFn: () => getConfigVersionStatus(registerId),
    enabled: Boolean(registerId) && canManage
  });

  const invalidateAfterMutation = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["config-version-status", registerId] }),
      queryClient.invalidateQueries({ queryKey: ["register-config", registerId] }),
      queryClient.invalidateQueries({ queryKey: ["register", registerId] }),
      queryClient.invalidateQueries({ queryKey: ["risks", registerId] })
    ]);
  };

  const createDraftMutation = useMutation({
    mutationFn: () => createDraft(registerId),
    onSuccess: invalidateAfterMutation
  });

  const discardDraftMutation = useMutation({
    mutationFn: () => discardDraft(registerId),
    onSuccess: async () => {
      closeDiscardConfirm();
      await invalidateAfterMutation();
    }
  });

  const analyseImpactMutation = useMutation({
    mutationFn: () => analyseImpact(registerId),
    onSuccess: (result) => {
      setImpactResult(result);
      openImpactModal();
    }
  });

  const publishDraftMutation = useMutation({
    mutationFn: () => publishDraft(registerId),
    onSuccess: async () => {
      closeImpactModal();
      await invalidateAfterMutation();
      notifications.show({ message: "Configuration published successfully.", color: "green" });
    }
  });

  const exportMutation = useMutation({
    mutationFn: () => exportRegisterConfig(registerId)
  });

  if (!canManage) return null;
  if (statusQuery.isLoading) return <Loader size="sm" />;

  const status = statusQuery.data;
  const hasDraft = status?.hasDraft ?? false;

  return (
    <Stack>
      <ApiErrorAlert error={statusQuery.error} fallback="Unable to load version status" />
      <ApiErrorAlert error={createDraftMutation.error} fallback="Unable to create draft" />
      <ApiErrorAlert error={discardDraftMutation.error} fallback="Unable to discard draft" />
      <ApiErrorAlert error={analyseImpactMutation.error} fallback="Unable to run impact analysis" />
      <ApiErrorAlert error={exportMutation.error} fallback="Unable to export configuration" />

      {hasDraft ? (
        <Alert color="yellow" title="Draft in progress — changes not yet published">
          <Group mt="xs" wrap="wrap">
            <Button
              size="xs"
              onClick={() => {
                setImpactResult(null);
                analyseImpactMutation.mutate();
              }}
              loading={analyseImpactMutation.isPending}
            >
              Publish
            </Button>
            <Button
              size="xs"
              variant="subtle"
              color="red"
              onClick={openDiscardConfirm}
            >
              Discard Draft
            </Button>
            <Button
              size="xs"
              variant="subtle"
              onClick={() => exportMutation.mutate()}
              loading={exportMutation.isPending}
            >
              Export Config
            </Button>
          </Group>
        </Alert>
      ) : (
        <Group>
          {status?.currentVersion ? (
            <Badge size="lg">Published version {status.currentVersion.versionNumber}</Badge>
          ) : (
            <Text size="sm" c="dimmed">No published version</Text>
          )}
          <Button
            size="xs"
            variant="outline"
            onClick={() => createDraftMutation.mutate()}
            loading={createDraftMutation.isPending}
          >
            Create Draft
          </Button>
          <Button
            size="xs"
            variant="subtle"
            onClick={() => exportMutation.mutate()}
            loading={exportMutation.isPending}
          >
            Export Config
          </Button>
          <Button
            size="xs"
            variant="subtle"
            onClick={openImportModal}
          >
            Import Config
          </Button>
          {isSystemAdmin ? (
            <Button
              size="xs"
              variant="subtle"
              onClick={openTemplateModal}
            >
              Save as Template
            </Button>
          ) : null}
        </Group>
      )}

      <ImpactAnalysisModal
        opened={impactModalOpen}
        onClose={closeImpactModal}
        result={impactResult}
        onPublish={() => publishDraftMutation.mutate()}
        isPublishing={publishDraftMutation.isPending}
        publishError={publishDraftMutation.error}
        registerId={registerId}
      />

      <Modal size="sm" opened={discardConfirmOpen} onClose={closeDiscardConfirm} title="Discard draft" centered>
        <Stack>
          <Text>All unpublished changes in this draft will be permanently lost. This cannot be undone.</Text>
          <ApiErrorAlert error={discardDraftMutation.error} fallback="Unable to discard draft" />
          <Group justify="flex-end" mt="xs">
            <Button variant="subtle" onClick={closeDiscardConfirm}>Cancel</Button>
            <Button
              color="red"
              onClick={() => discardDraftMutation.mutate()}
              loading={discardDraftMutation.isPending}
            >
              Discard
            </Button>
          </Group>
        </Stack>
      </Modal>

      <ImportConfigModal
        opened={importModalOpen}
        onClose={closeImportModal}
        registerId={registerId}
      />

      {isSystemAdmin ? (
        <CreateTemplateModal
          opened={templateModalOpen}
          onClose={closeTemplateModal}
          registerId={registerId}
        />
      ) : null}

    </Stack>
  );
}
