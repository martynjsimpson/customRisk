import {
  Badge,
  Button,
  Divider,
  Group,
  List,
  Loader,
  Modal,
  Stack,
  Text
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getRegister, unlinkRegisterFromTemplate } from "../../api/registers.api";
import {
  applyTemplateUpdateToDraft,
  compareRegisterToTemplate,
  type CompareRegisterToTemplateResult,
  type TemplateDifferences
} from "../../api/templates.api";
import { ApiErrorAlert } from "../../components/ApiErrorAlert";
import { usePermissions } from "../../hooks/usePermissions";

function DiffSection({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <Text size="sm" fw={600} mb={4}>{label}</Text>
      <List size="sm" withPadding>
        {items.map((item) => <List.Item key={item}>{item}</List.Item>)}
      </List>
    </div>
  );
}

function CompareModal({
  opened,
  onClose,
  registerId,
  templateVersionId,
  templateName,
  versionNumber
}: {
  opened: boolean;
  onClose: () => void;
  registerId: string;
  templateVersionId: string;
  templateName: string;
  versionNumber: number;
}) {
  const compareQuery = useQuery<CompareRegisterToTemplateResult>({
    queryKey: ["template-compare", registerId, templateVersionId],
    queryFn: () => compareRegisterToTemplate(registerId, templateVersionId),
    enabled: opened
  });

  const diff: TemplateDifferences | undefined = compareQuery.data?.differences;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={`Compare with "${templateName}" v${versionNumber}`}
      size="lg"
    >
      {compareQuery.isLoading ? (
        <Loader />
      ) : compareQuery.isError ? (
        <ApiErrorAlert error={compareQuery.error} fallback="Unable to run comparison" />
      ) : compareQuery.data ? (
        <Stack>
          {!compareQuery.data.hasDifferences ? (
            <Text size="sm" c="teal">This register's configuration matches the template exactly.</Text>
          ) : (
            <Text size="sm" c="dimmed">The following differences were found between this register and the template.</Text>
          )}
          {diff ? (
            <Stack gap="md">
              <DiffSection label="Register settings changed" items={diff.registerSettings} />
              <DiffSection label="Custom fields added in template" items={diff.customFieldsAdded} />
              <DiffSection label="Custom fields removed from template" items={diff.customFieldsRemoved} />
              <DiffSection label="Custom fields changed" items={diff.customFieldsChanged} />
              <DiffSection label="Likelihood values added in template" items={diff.likelihoodValuesAdded} />
              <DiffSection label="Likelihood values removed from template" items={diff.likelihoodValuesRemoved} />
              <DiffSection label="Impact values added in template" items={diff.impactValuesAdded} />
              <DiffSection label="Impact values removed from template" items={diff.impactValuesRemoved} />
              <DiffSection label="Risk levels added in template" items={diff.riskLevelsAdded} />
              <DiffSection label="Risk levels removed from template" items={diff.riskLevelsRemoved} />
              <DiffSection label="Response strategies added in template" items={diff.responseStrategiesAdded} />
              <DiffSection label="Response strategies removed from template" items={diff.responseStrategiesRemoved} />
            </Stack>
          ) : null}
          <Group justify="flex-end">
            <Button variant="subtle" onClick={onClose}>Close</Button>
          </Group>
        </Stack>
      ) : null}
    </Modal>
  );
}

interface TemplateLinkPanelProps {
  registerId: string;
  canManage: boolean;
}

export function TemplateLinkPanel({ registerId, canManage }: TemplateLinkPanelProps) {
  const { isSystemAdmin } = usePermissions();
  const queryClient = useQueryClient();
  const [compareOpen, { open: openCompare, close: closeCompare }] = useDisclosure(false);
  const [unlinkConfirmOpen, { open: openUnlinkConfirm, close: closeUnlinkConfirm }] = useDisclosure(false);

  const registerQuery = useQuery({
    queryKey: ["register", registerId],
    queryFn: () => getRegister(registerId)
  });

  const linked = registerQuery.data?.linkedTemplate ?? null;

  const applyMutation = useMutation({
    mutationFn: () => applyTemplateUpdateToDraft(registerId, linked!.latestPublishedVersionId!),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["config-version-status", registerId] }),
        queryClient.invalidateQueries({ queryKey: ["register", registerId] })
      ]);
    }
  });

  const unlinkMutation = useMutation({
    mutationFn: () => unlinkRegisterFromTemplate(registerId),
    onSuccess: async () => {
      closeUnlinkConfirm();
      await queryClient.invalidateQueries({ queryKey: ["register", registerId] });
    }
  });

  if (!canManage || registerQuery.isLoading) return null;
  if (!linked) return null;

  const canApplyLatest =
    !linked.isLatest &&
    linked.latestPublishedVersionId !== null &&
    linked.templateIsActive;

  return (
    <>
      <Divider />

      <Group gap="xs" wrap="wrap">
        <Text size="sm" c="dimmed">Template:</Text>
        <Text size="sm" fw={500}>{linked.templateName}</Text>
        {linked.isLatest ? (
          <Badge color="teal" variant="light" size="sm">v{linked.linkedVersionNumber} — up to date</Badge>
        ) : (
          <Badge color="orange" variant="light" size="sm">
            v{linked.linkedVersionNumber} — latest is v{linked.latestPublishedVersionNumber}
          </Badge>
        )}

        <Button size="xs" variant="subtle" onClick={openCompare}>
          Compare
        </Button>

        {canApplyLatest ? (
          <Button
            size="xs"
            variant="subtle"
            color="orange"
            onClick={() => applyMutation.mutate()}
            loading={applyMutation.isPending}
          >
            Apply latest (v{linked.latestPublishedVersionNumber})
          </Button>
        ) : null}

        {isSystemAdmin ? (
          <Button size="xs" variant="subtle" color="red" onClick={openUnlinkConfirm}>
            Unlink
          </Button>
        ) : null}

        {applyMutation.isError ? (
          <ApiErrorAlert error={applyMutation.error} fallback="Unable to apply template update" />
        ) : null}
      </Group>

      <CompareModal
        opened={compareOpen}
        onClose={closeCompare}
        registerId={registerId}
        templateVersionId={linked.linkedVersionId}
        templateName={linked.templateName}
        versionNumber={linked.linkedVersionNumber}
      />

      <Modal opened={unlinkConfirmOpen} onClose={closeUnlinkConfirm} title="Unlink from template">
        <Stack>
          <Text size="sm">
            Remove the link between this register and <strong>{linked.templateName}</strong>? The configuration is not changed — only the tracking relationship is removed.
          </Text>
          <ApiErrorAlert error={unlinkMutation.error} fallback="Unable to unlink register" />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={closeUnlinkConfirm} disabled={unlinkMutation.isPending}>Cancel</Button>
            <Button color="red" onClick={() => unlinkMutation.mutate()} loading={unlinkMutation.isPending}>
              Unlink
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
