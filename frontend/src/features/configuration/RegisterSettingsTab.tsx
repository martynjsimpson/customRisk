import { Alert, Button, Checkbox, Fieldset, Group, Modal, NumberInput, Stack, Text, Textarea, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FocusEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getConfigVersionStatus } from "../../api/configVersion.api";
import { deleteRegister, getRegister, updateRegister } from "../../api/registers.api";
import { ApiErrorAlert } from "../../components/ApiErrorAlert";
import { useFeatureFlags } from "../../hooks/useFeatureFlags";
import { usePermissions } from "../../hooks/usePermissions";

interface RegisterSettingsTabProps {
  registerId: string;
}

export function RegisterSettingsTab({ registerId }: RegisterSettingsTabProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { isSystemAdmin } = usePermissions();
  const flags = useFeatureFlags();
  const [deleteConfirmOpen, { open: openDeleteConfirm, close: closeDeleteConfirm }] = useDisclosure(false);
  const [deleteNameInput, setDeleteNameInput] = useState("");

  const registerQuery = useQuery({
    queryKey: ["register", registerId],
    queryFn: () => getRegister(registerId),
    enabled: Boolean(registerId)
  });
  const canManage = isSystemAdmin || registerQuery.data?.effectiveRole === "REGISTER_ADMIN";

  const settingsForm = useForm({
    initialValues: {
      name: "",
      description: "",
      riskIdPrefix: "",
      riskIdZeroPaddingEnabled: false,
      riskIdZeroPaddingWidth: 4,
      reviewsEnabled: true,
      defaultReviewFrequencyMonths: 12,
      allowViewerExport: false,
      customFieldValidationEnabled: true
    }
  });
  const { setValues: setSettingsValues } = settingsForm;

  useEffect(() => {
    const register = registerQuery.data;
    if (register) {
      setSettingsValues({
        name: register.name,
        description: register.description ?? "",
        riskIdPrefix: register.riskIdPrefix ?? "",
        riskIdZeroPaddingEnabled: register.riskIdZeroPaddingEnabled,
        riskIdZeroPaddingWidth: register.riskIdZeroPaddingWidth,
        reviewsEnabled: register.reviewsEnabled,
        defaultReviewFrequencyMonths: register.defaultReviewFrequencyMonths,
        allowViewerExport: register.allowViewerExport,
        customFieldValidationEnabled: register.customFieldValidationEnabled
      });
    }
  }, [registerQuery.data, setSettingsValues]);

  const draftConfigMode = flags.draftConfig && canManage;

  const statusQuery = useQuery({
    queryKey: ["config-version-status", registerId],
    queryFn: () => getConfigVersionStatus(registerId),
    enabled: draftConfigMode
  });
  const hasDraft = statusQuery.data?.hasDraft ?? false;

  const settingsLocked = draftConfigMode && !hasDraft;

  const updateSettingsMutation = useMutation({
    mutationFn: () =>
      updateRegister(registerId, {
        ...settingsForm.values,
        riskIdPrefix: settingsForm.values.riskIdPrefix || null
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["register", registerId] }),
        queryClient.invalidateQueries({ queryKey: ["registers"] }),
        queryClient.invalidateQueries({ queryKey: ["register-config", registerId] }),
        queryClient.invalidateQueries({ queryKey: ["risk-form-config", registerId], refetchType: "all" })
      ]);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteRegister(registerId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["registers"] });
      navigate("/registers");
    }
  });

  function handleFormBlur(event: FocusEvent<HTMLFormElement>) {
    if (draftConfigMode && !event.currentTarget.contains(event.relatedTarget as Node)) {
      updateSettingsMutation.mutate();
    }
  }

  return (
    <form
      onSubmit={settingsForm.onSubmit(() => updateSettingsMutation.mutate())}
      onBlur={handleFormBlur}
    >
      <Stack>
        <ApiErrorAlert error={updateSettingsMutation.error} fallback="Unable to save register settings" />
        <Fieldset legend="General">
          <Stack>
            <TextInput maw={400} label="Name" disabled={!canManage || settingsLocked} {...settingsForm.getInputProps("name")} />
            <Textarea label="Description" disabled={!canManage || settingsLocked} {...settingsForm.getInputProps("description")} />
          </Stack>
        </Fieldset>
        <Fieldset legend="Risk IDs">
          <Stack>
            <TextInput w={180} label="Prefix" disabled={!canManage || settingsLocked} {...settingsForm.getInputProps("riskIdPrefix")} />
            <Checkbox
              label="Zero-pad risk IDs"
              disabled={!canManage || settingsLocked}
              {...settingsForm.getInputProps("riskIdZeroPaddingEnabled", { type: "checkbox" })}
            />
            <NumberInput
              w={140}
              label="Padding width"
              min={2}
              max={12}
              disabled={!canManage || settingsLocked || !settingsForm.values.riskIdZeroPaddingEnabled}
              {...settingsForm.getInputProps("riskIdZeroPaddingWidth")}
            />
          </Stack>
        </Fieldset>
        <Fieldset legend="Features">
          <Stack>
            <Checkbox
              label="Allow Register Viewers to export"
              disabled={!canManage || settingsLocked}
              {...settingsForm.getInputProps("allowViewerExport", { type: "checkbox" })}
            />
            <Checkbox
              label="Enable custom field validation"
              description="Controls whether allow / warn / block validation is enforced and shown for this register."
              disabled={!canManage || settingsLocked}
              {...settingsForm.getInputProps("customFieldValidationEnabled", { type: "checkbox" })}
            />
            <Checkbox
              label="Reviews enabled"
              disabled={!canManage || settingsLocked}
              {...settingsForm.getInputProps("reviewsEnabled", { type: "checkbox" })}
            />
            <Fieldset legend="Reviews">
              <NumberInput
                w={220}
                label="Default review frequency (months)"
                min={1}
                max={120}
                disabled={!canManage || settingsLocked || !settingsForm.values.reviewsEnabled}
                {...settingsForm.getInputProps("defaultReviewFrequencyMonths")}
              />
            </Fieldset>
          </Stack>
        </Fieldset>
        {canManage && !settingsLocked && !draftConfigMode ? (
          <Button type="submit" loading={updateSettingsMutation.isPending}>
            Save settings
          </Button>
        ) : null}
        {isSystemAdmin ? (
          <Fieldset legend="Danger zone" style={{ borderColor: "var(--mantine-color-red-6)" }}>
            <Stack>
              <Text size="sm">
                Deleting this register will hide it from all users. The register and all its risks, configuration, and audit history are retained in the database and can be restored by a system administrator if needed.
              </Text>
              <div>
                <Button color="red" variant="outline" onClick={openDeleteConfirm}>
                  Delete register
                </Button>
              </div>
            </Stack>
          </Fieldset>
        ) : null}
      </Stack>

      <Modal
        opened={deleteConfirmOpen}
        onClose={() => { closeDeleteConfirm(); setDeleteNameInput(""); }}
        title="Delete register"
        size="sm"
        centered
      >
        <Stack>
          <Alert color="red" variant="light">
            This will hide the register from all users. All data is preserved and can be restored by a system administrator.
          </Alert>
          <ApiErrorAlert error={deleteMutation.error} fallback="Unable to delete register" />
          <TextInput
            label={<Text size="sm">Type <strong>{registerQuery.data?.name}</strong> to confirm</Text>}
            value={deleteNameInput}
            onChange={(e) => setDeleteNameInput(e.currentTarget.value)}
            placeholder={registerQuery.data?.name}
          />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => { closeDeleteConfirm(); setDeleteNameInput(""); }}>
              Cancel
            </Button>
            <Button
              color="red"
              disabled={deleteNameInput !== registerQuery.data?.name}
              loading={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              Delete register
            </Button>
          </Group>
        </Stack>
      </Modal>
    </form>
  );
}
