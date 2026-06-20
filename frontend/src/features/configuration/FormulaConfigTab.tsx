import {
  Badge,
  Box,
  Button,
  Group,
  Stack,
  Text,
  Textarea,
  Tooltip
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import {
  updateDraftConfig,
  validateScoringFormula,
  type ValidateFormulaResult
} from "../../api/configVersion.api";
import { getRegisterConfiguration } from "../../api/customFields.api";
import { ApiErrorAlert } from "../../components/ApiErrorAlert";

interface FormulaConfigTabProps {
  registerId: string;
  draftConfigMode?: boolean;
}

const DEFAULT_FORMULA_PLACEHOLDER = "{likelihood} * {impact}";

export function FormulaConfigTab({ registerId, draftConfigMode }: FormulaConfigTabProps) {
  const queryClient = useQueryClient();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const configQuery = useQuery({
    queryKey: ["register-config", registerId],
    queryFn: () => getRegisterConfiguration(registerId),
    enabled: Boolean(registerId)
  });

  const savedFormula = configQuery.data?.register.scoringFormula ?? "";

  const [formula, setFormula] = useState<string>(savedFormula);
  const [validationResult, setValidationResult] = useState<ValidateFormulaResult | null>(null);
  const [hasValidated, setHasValidated] = useState(false);

  // Sync from server when config loads/reloads
  useEffect(() => {
    setFormula(savedFormula);
    setValidationResult(null);
    setHasValidated(false);
  }, [savedFormula]);

  const [debouncedFormula] = useDebouncedValue(formula, 600);

  const validateMutation = useMutation({
    mutationFn: (f: string) => validateScoringFormula(registerId, f),
    onSuccess: (result) => {
      setValidationResult(result);
      setHasValidated(true);
    },
    onError: () => {
      setValidationResult(null);
      setHasValidated(false);
    }
  });

  // Trigger validation after debounce when formula is non-empty
  useEffect(() => {
    if (debouncedFormula.trim() !== "") {
      validateMutation.mutate(debouncedFormula);
    } else {
      setValidationResult(null);
      setHasValidated(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedFormula]);

  const saveMutation = useMutation({
    mutationFn: (f: string) =>
      updateDraftConfig(registerId, { register: { scoringFormula: f } }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["register-config", registerId] }),
        queryClient.invalidateQueries({ queryKey: ["config-version-status", registerId] })
      ]);
    }
  });

  // Custom fields available as formula variables (NUMBER and CALCULATED)
  const numericFields = (configQuery.data?.customFields ?? []).filter(
    (f) => f.fieldType === "NUMBER" || f.fieldType === "CALCULATED"
  );

  const insertVariable = (variable: string) => {
    const el = textareaRef.current;
    if (!el) {
      setFormula((prev) => prev + variable);
      return;
    }
    const start = el.selectionStart ?? formula.length;
    const end = el.selectionEnd ?? formula.length;
    const next = formula.slice(0, start) + variable + formula.slice(end);
    setFormula(next);
    // Restore cursor after inserted text
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + variable.length, start + variable.length);
    });
  };

  const isDirty = formula !== savedFormula;
  const isFormulaEmpty = formula.trim() === "";

  // Formula is valid if empty (uses default) or has passed validation
  const isFormulaValid =
    isFormulaEmpty ||
    (hasValidated && validationResult?.valid === true);

  const canSave =
    Boolean(draftConfigMode) &&
    isDirty &&
    isFormulaValid &&
    !saveMutation.isPending &&
    !validateMutation.isPending;

  return (
    <Stack>
      <ApiErrorAlert error={configQuery.error} fallback="Unable to load register configuration" />
      <ApiErrorAlert error={saveMutation.error} fallback="Unable to save scoring formula" />

      <Box>
        <Text size="sm" fw={500} mb={4}>Score Formula</Text>
        <Textarea
          ref={textareaRef}
          placeholder={DEFAULT_FORMULA_PLACEHOLDER}
          value={formula}
          onChange={(e) => setFormula(e.currentTarget.value)}
          minRows={2}
          autosize
          readOnly={!draftConfigMode}
          styles={{ input: { fontFamily: "monospace" } }}
        />
        {isFormulaEmpty ? (
          <Text size="xs" c="dimmed" mt={4}>
            Default formula (likelihood × impact) will be used
          </Text>
        ) : hasValidated && validationResult ? (
          validationResult.valid ? (
            <Text size="xs" c="green" mt={4}>Formula is valid</Text>
          ) : (
            <Text size="xs" c="red" mt={4}>{validationResult.error ?? "Formula is invalid"}</Text>
          )
        ) : null}
      </Box>

      <Box>
        <Text size="sm" fw={500} mb={6}>Variable reference</Text>
        <Text size="xs" c="dimmed" mb={8}>
          Click a variable to insert it at the cursor position.
        </Text>
        <Group gap="xs" wrap="wrap">
          <Badge
            variant="outline"
            style={{ cursor: draftConfigMode ? "pointer" : "default" }}
            onClick={() => draftConfigMode && insertVariable("{likelihood}")}
          >
            {"{likelihood}"}
          </Badge>
          <Badge
            variant="outline"
            style={{ cursor: draftConfigMode ? "pointer" : "default" }}
            onClick={() => draftConfigMode && insertVariable("{impact}")}
          >
            {"{impact}"}
          </Badge>
          {numericFields.map((field) => (
            <Tooltip key={field.id} label={field.fieldName} withArrow>
              <Badge
                variant="light"
                style={{ cursor: draftConfigMode ? "pointer" : "default" }}
                onClick={() => draftConfigMode && insertVariable(`{field:${field.id}}`)}
              >
                {`{field:${field.fieldName}}`}
              </Badge>
            </Tooltip>
          ))}
        </Group>
      </Box>

      {draftConfigMode ? (
        <Group justify="flex-end">
          <Tooltip
            label="Scoring formula is invalid"
            disabled={isFormulaEmpty || isFormulaValid}
          >
            <Box>
              <Button
                disabled={!canSave}
                loading={saveMutation.isPending}
                onClick={() => saveMutation.mutate(formula)}
              >
                Save Formula
              </Button>
            </Box>
          </Tooltip>
        </Group>
      ) : null}
    </Stack>
  );
}
