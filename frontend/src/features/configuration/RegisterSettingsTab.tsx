import { Alert, Button, Checkbox, Stack, Textarea, TextInput, NumberInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { getConfigVersionStatus } from "../../api/configVersion.api";
import { getRegister, updateRegister } from "../../api/registers.api";
import { ApiErrorAlert } from "../../components/ApiErrorAlert";
import { useFeatureFlags } from "../../hooks/useFeatureFlags";
import { usePermissions } from "../../hooks/usePermissions";

interface RegisterSettingsTabProps {
  registerId: string;
}

export function RegisterSettingsTab({ registerId }: RegisterSettingsTabProps) {
  const queryClient = useQueryClient();
  const { isSystemAdmin } = usePermissions();
  const flags = useFeatureFlags();

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

  // When draftConfigMode is on but no draft exists, only name is directly editable.
  // When a draft is in progress, all fields are editable (changes go directly to the
  // register; the draft handles the complex config, and publish won't overwrite these).
  const settingsLocked = draftConfigMode && !hasDraft;

  const updateSettingsMutation = useMutation({
    mutationFn: () =>
      settingsLocked
        ? updateRegister(registerId, { name: settingsForm.values.name })
        : updateRegister(registerId, {
            ...settingsForm.values,
            riskIdPrefix: settingsForm.values.riskIdPrefix || null
          }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["register", registerId] }),
        queryClient.invalidateQueries({ queryKey: ["registers"] }),
        queryClient.invalidateQueries({ queryKey: ["register-config", registerId] }),
        queryClient.invalidateQueries({ queryKey: ["risk-form-config", registerId] })
      ]);
    }
  });

  return (
    <form onSubmit={settingsForm.onSubmit(() => updateSettingsMutation.mutate())}>
      <Stack>
        <ApiErrorAlert error={updateSettingsMutation.error} fallback="Unable to save register settings" />
        {settingsLocked ? (
          <Alert color="blue" title="Configuration is version-controlled">
            Create a draft using the banner above to edit configuration settings. Only the register name can be changed directly while no draft is in progress.
          </Alert>
        ) : null}
        {draftConfigMode && hasDraft ? (
          <Alert color="blue" title="Draft in progress">
            Settings saved here apply immediately. Fields and scoring changes are part of the draft and will take effect when published.
          </Alert>
        ) : null}
        <TextInput label="Name" disabled={!canManage} {...settingsForm.getInputProps("name")} />
        <Textarea label="Description" disabled={!canManage || settingsLocked} {...settingsForm.getInputProps("description")} />
        <TextInput label="Risk ID prefix" disabled={!canManage || settingsLocked} {...settingsForm.getInputProps("riskIdPrefix")} />
        <Checkbox
          label="Zero-pad risk IDs"
          disabled={!canManage || settingsLocked}
          {...settingsForm.getInputProps("riskIdZeroPaddingEnabled", { type: "checkbox" })}
        />
        <NumberInput
          label="Padding width"
          min={2}
          max={12}
          disabled={!canManage || settingsLocked}
          {...settingsForm.getInputProps("riskIdZeroPaddingWidth")}
        />
        <Checkbox
          label="Reviews enabled"
          disabled={!canManage || settingsLocked}
          {...settingsForm.getInputProps("reviewsEnabled", { type: "checkbox" })}
        />
        <NumberInput
          label="Default review frequency months"
          min={1}
          max={120}
          disabled={!canManage || settingsLocked}
          {...settingsForm.getInputProps("defaultReviewFrequencyMonths")}
        />
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
        {canManage ? (
          <Button type="submit" loading={updateSettingsMutation.isPending}>
            {settingsLocked ? "Save name" : "Save settings"}
          </Button>
        ) : null}
      </Stack>
    </form>
  );
}
