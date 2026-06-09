import { Button, Checkbox, Fieldset, NumberInput, Stack, Textarea, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FocusEvent, useEffect } from "react";

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
        queryClient.invalidateQueries({ queryKey: ["risk-form-config", registerId] })
      ]);
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
      </Stack>
    </form>
  );
}
