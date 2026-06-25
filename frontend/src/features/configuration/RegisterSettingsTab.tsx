import { Alert, Button, Checkbox, Fieldset, Group, Modal, NumberInput, Select, Stack, Switch, Text, Textarea, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FocusEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getConfigVersionStatus, updateDraftConfig } from "../../api/configVersion.api";
import { getRegisterConfiguration } from "../../api/customFields.api";
import { deleteRegister, getRegister, updateRegister, type ReviewCommentMode } from "../../api/registers.api";
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
      customFieldValidationEnabled: true,
      responseActionMode: "SIMPLE" as "SIMPLE" | "CHILD_RECORDS",
      reviewCommentMode: "OPTIONAL" as ReviewCommentMode,
      reviewAttestationText: ""
    }
  });
  const { setValues: setSettingsValues } = settingsForm;

  const draftConfigMode = flags.draftConfig && canManage;

  const statusQuery = useQuery({
    queryKey: ["config-version-status", registerId],
    queryFn: () => getConfigVersionStatus(registerId),
    enabled: draftConfigMode
  });
  const hasDraft = statusQuery.data?.hasDraft ?? false;

  // When in draft mode, read responseActionMode from the config snapshot (which reflects
  // the pending draft value). Outside draft mode, fall back to the live register value.
  const configQuery = useQuery({
    queryKey: ["register-config", registerId],
    queryFn: () => getRegisterConfiguration(registerId),
    enabled: Boolean(registerId) && draftConfigMode && hasDraft
  });

  const settingsLocked = draftConfigMode && !hasDraft;

  useEffect(() => {
    const register = registerQuery.data;
    if (register) {
      // In draft mode with a draft, the responseActionMode comes from the config snapshot.
      // Without a draft, use the live register value.
      const pendingMode =
        draftConfigMode && hasDraft && configQuery.data
          ? configQuery.data.register.responseActionMode
          : register.responseActionMode;

      setSettingsValues({
        name: register.name,
        description: register.description ?? "",
        riskIdPrefix: register.riskIdPrefix ?? "",
        riskIdZeroPaddingEnabled: register.riskIdZeroPaddingEnabled,
        riskIdZeroPaddingWidth: register.riskIdZeroPaddingWidth,
        reviewsEnabled: register.reviewsEnabled,
        defaultReviewFrequencyMonths: register.defaultReviewFrequencyMonths,
        allowViewerExport: register.allowViewerExport,
        customFieldValidationEnabled: register.customFieldValidationEnabled,
        responseActionMode: pendingMode,
        reviewCommentMode: register.reviewCommentMode,
        reviewAttestationText: register.reviewAttestationText
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registerQuery.data, configQuery.data, draftConfigMode, hasDraft, setSettingsValues]);

  const updateSettingsMutation = useMutation({
    mutationFn: () =>
      updateRegister(registerId, {
        name: settingsForm.values.name,
        description: settingsForm.values.description,
        riskIdPrefix: settingsForm.values.riskIdPrefix || null,
        riskIdZeroPaddingEnabled: settingsForm.values.riskIdZeroPaddingEnabled,
        riskIdZeroPaddingWidth: settingsForm.values.riskIdZeroPaddingWidth,
        reviewsEnabled: settingsForm.values.reviewsEnabled,
        defaultReviewFrequencyMonths: settingsForm.values.defaultReviewFrequencyMonths,
        reviewCommentMode: settingsForm.values.reviewCommentMode,
        reviewAttestationText: settingsForm.values.reviewAttestationText,
        allowViewerExport: settingsForm.values.allowViewerExport,
        customFieldValidationEnabled: settingsForm.values.customFieldValidationEnabled
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

  const updateDraftResponseActionModeMutation = useMutation({
    mutationFn: (mode: "SIMPLE" | "CHILD_RECORDS") =>
      updateDraftConfig(registerId, { register: { responseActionMode: mode } }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["register-config", registerId] }),
        queryClient.invalidateQueries({ queryKey: ["config-version-status", registerId] })
      ]);
    }
  });

  const updateDirectResponseActionModeMutation = useMutation({
    mutationFn: (mode: "SIMPLE" | "CHILD_RECORDS") =>
      updateRegister(registerId, { responseActionMode: mode }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["register", registerId] }),
        queryClient.invalidateQueries({ queryKey: ["registers"] }),
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
    if (!draftConfigMode && !event.currentTarget.contains(event.relatedTarget as Node)) {
      updateSettingsMutation.mutate();
    }
  }

  function handleResponseActionModeChange(checked: boolean) {
    const newMode: "SIMPLE" | "CHILD_RECORDS" = checked ? "CHILD_RECORDS" : "SIMPLE";
    settingsForm.setFieldValue("responseActionMode", newMode);
    if (draftConfigMode && hasDraft) {
      updateDraftResponseActionModeMutation.mutate(newMode);
    } else if (!draftConfigMode) {
      updateDirectResponseActionModeMutation.mutate(newMode);
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
              <Stack>
                <NumberInput
                  w={220}
                  label="Default review frequency (months)"
                  min={1}
                  max={120}
                  disabled={!canManage || settingsLocked || !settingsForm.values.reviewsEnabled}
                  {...settingsForm.getInputProps("defaultReviewFrequencyMonths")}
                />
                <Select
                  w={220}
                  label="Review Comment Mode"
                  disabled={!canManage || settingsLocked || !settingsForm.values.reviewsEnabled}
                  data={[
                    { value: "DISABLED", label: "Disabled" },
                    { value: "OPTIONAL", label: "Optional" },
                    { value: "MANDATORY", label: "Mandatory" }
                  ]}
                  {...settingsForm.getInputProps("reviewCommentMode")}
                />
                <Textarea
                  label="Attestation Text"
                  disabled={!canManage || settingsLocked || !settingsForm.values.reviewsEnabled}
                  {...settingsForm.getInputProps("reviewAttestationText")}
                />
              </Stack>
            </Fieldset>
          </Stack>
        </Fieldset>
        {flags.childActions ? (
          <Fieldset legend="Response Actions">
            <Stack>
              <Switch
                label="Child Records mode"
                description="When enabled, response actions are managed as individual records linked to each risk. When disabled, each risk has a single free-text response action field."
                checked={settingsForm.values.responseActionMode === "CHILD_RECORDS"}
                onChange={(event) => handleResponseActionModeChange(event.currentTarget.checked)}
                disabled={!canManage || settingsLocked}
              />
              <ApiErrorAlert
                error={updateDraftResponseActionModeMutation.error ?? updateDirectResponseActionModeMutation.error}
                fallback="Unable to save Response Actions mode"
              />
            </Stack>
          </Fieldset>
        ) : null}

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
        onClose={() => { deleteMutation.reset(); closeDeleteConfirm(); setDeleteNameInput(""); }}
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
