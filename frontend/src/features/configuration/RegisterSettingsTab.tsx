import { Button, Checkbox, Stack, Textarea, TextInput, NumberInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { getRegister, updateRegister } from "../../api/registers.api";
import { ApiErrorAlert } from "../../components/ApiErrorAlert";
import { usePermissions } from "../../hooks/usePermissions";

interface RegisterSettingsTabProps {
  registerId: string;
}

export function RegisterSettingsTab({ registerId }: RegisterSettingsTabProps) {
  const queryClient = useQueryClient();
  const { isSystemAdmin } = usePermissions();

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
      allowViewerExport: false
    }
  });

  useEffect(() => {
    const register = registerQuery.data;
    if (register) {
      settingsForm.setValues({
        name: register.name,
        description: register.description ?? "",
        riskIdPrefix: register.riskIdPrefix ?? "",
        riskIdZeroPaddingEnabled: register.riskIdZeroPaddingEnabled,
        riskIdZeroPaddingWidth: register.riskIdZeroPaddingWidth,
        reviewsEnabled: register.reviewsEnabled,
        defaultReviewFrequencyMonths: register.defaultReviewFrequencyMonths,
        allowViewerExport: register.allowViewerExport
      });
    }
  }, [registerQuery.data]);

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

  return (
    <form onSubmit={settingsForm.onSubmit(() => updateSettingsMutation.mutate())}>
      <Stack>
        <ApiErrorAlert error={updateSettingsMutation.error} fallback="Unable to save register settings" />
        <TextInput label="Name" disabled={!canManage} {...settingsForm.getInputProps("name")} />
        <Textarea label="Description" disabled={!canManage} {...settingsForm.getInputProps("description")} />
        <TextInput label="Risk ID prefix" disabled={!canManage} {...settingsForm.getInputProps("riskIdPrefix")} />
        <Checkbox
          label="Zero-pad risk IDs"
          disabled={!canManage}
          {...settingsForm.getInputProps("riskIdZeroPaddingEnabled", { type: "checkbox" })}
        />
        <NumberInput
          label="Padding width"
          min={2}
          max={12}
          disabled={!canManage}
          {...settingsForm.getInputProps("riskIdZeroPaddingWidth")}
        />
        <Checkbox
          label="Reviews enabled"
          disabled={!canManage}
          {...settingsForm.getInputProps("reviewsEnabled", { type: "checkbox" })}
        />
        <NumberInput
          label="Default review frequency months"
          min={1}
          max={120}
          disabled={!canManage}
          {...settingsForm.getInputProps("defaultReviewFrequencyMonths")}
        />
        <Checkbox
          label="Allow Register Viewers to export"
          disabled={!canManage}
          {...settingsForm.getInputProps("allowViewerExport", { type: "checkbox" })}
        />
        {canManage ? (
          <Button type="submit" loading={updateSettingsMutation.isPending}>
            Save settings
          </Button>
        ) : null}
      </Stack>
    </form>
  );
}
