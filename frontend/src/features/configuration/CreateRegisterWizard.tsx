import {
  Box,
  Button,
  Checkbox,
  Divider,
  Group,
  Modal,
  MultiSelect,
  NumberInput,
  Progress,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { createRegister, updateRegister, type UpdateRegisterInput } from "../../api/registers.api";
import { listUsers } from "../../api/users.api";
import { ApiErrorAlert } from "../../components/ApiErrorAlert";
import { FieldConfigTab } from "./FieldConfigTab";
import { ImpactConfigTab } from "./ImpactConfigTab";
import { LikelihoodConfigTab } from "./LikelihoodConfigTab";
import { MatrixConfigTab } from "./MatrixConfigTab";
import { RiskLevelConfigTab } from "./RiskLevelConfigTab";

type StepId =
  | "basic-info"
  | "risk-ids"
  | "features"
  | "reviews"
  | "likelihood"
  | "impact"
  | "risk-levels"
  | "matrix"
  | "custom-fields";

interface StepMeta {
  title: string;
  description: string;
}

const STEP_META: Record<StepId, StepMeta> = {
  "basic-info": {
    title: "Name your register",
    description:
      "Give your register a name and description, and assign administrators who can manage its configuration and risks."
  },
  "risk-ids": {
    title: "Risk ID format",
    description:
      "Each risk gets a unique ID. Optionally add a prefix (e.g. \"PROJ-\") and enable zero-padding for fixed-width IDs like PROJ-0042."
  },
  features: {
    title: "Features",
    description:
      "Enable optional features for this register. All of these can be changed at any time from the register settings."
  },
  reviews: {
    title: "Review settings",
    description:
      "Configure how often risks in this register should be reviewed. Risk owners will be prompted to attest to their risks when reviews are due."
  },
  likelihood: {
    title: "Likelihood scale",
    description:
      "Define the likelihood scale for this register — values representing how probable a risk is, from rare to almost certain. You can add more values or edit these later."
  },
  impact: {
    title: "Impact scale",
    description:
      "Define the impact scale for this register — values representing how severe a risk's consequences would be. You can add more values or edit these later."
  },
  "risk-levels": {
    title: "Risk levels",
    description:
      "Define the risk levels used to classify risks. Assign names, colours, and descriptions to make your risk matrix easy to read at a glance."
  },
  matrix: {
    title: "Risk matrix",
    description:
      "Map each likelihood and impact combination to a risk level. Add your likelihood values, impact values, and risk levels in the steps above before filling in the matrix."
  },
  "custom-fields": {
    title: "Custom fields",
    description:
      "Add custom fields to capture additional information about each risk. This step is optional — you can skip it and add custom fields at any time from the register configuration."
  }
};

const FORM_STEPS: StepId[] = ["basic-info", "risk-ids", "features", "reviews"];

function getStepList(reviewsEnabled: boolean): StepId[] {
  const base: StepId[] = ["basic-info", "risk-ids", "features"];
  if (reviewsEnabled) base.push("reviews");
  return [...base, "likelihood", "impact", "risk-levels", "matrix", "custom-fields"];
}

interface CreateRegisterWizardProps {
  opened: boolean;
  onClose: () => void;
}

export function CreateRegisterWizard({ opened, onClose }: CreateRegisterWizardProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [stepId, setStepId] = useState<StepId>("basic-info");
  const [registerId, setRegisterId] = useState<string | null>(null);
  const [reviewsEnabled, setReviewsEnabled] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);

  const steps = getStepList(reviewsEnabled);
  const currentIndex = steps.indexOf(stepId);
  const isLastStep = currentIndex === steps.length - 1;
  const isFirstStep = currentIndex === 0;
  const isFormStep = FORM_STEPS.includes(stepId);

  // Reset when modal opens
  useEffect(() => {
    if (!opened) return;
    setStepId("basic-info");
    setRegisterId(null);
    setReviewsEnabled(false);
    basicInfoForm.reset();
    riskIdsForm.reset();
    featuresForm.reset();
    reviewsForm.reset();
    createMutation.reset();
    riskIdsMutation.reset();
    featuresMutation.reset();
    reviewsMutation.reset();
  // Form objects intentionally omitted — stable reset() methods but new object references each render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened]);

  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: listUsers,
    enabled: opened
  });

  // Step 1: create the register
  const createMutation = useMutation({
    mutationFn: createRegister,
    onSuccess: (data) => {
      setRegisterId(data.id);
      setStepId("risk-ids");
    }
  });

  // Step 2: risk IDs
  const riskIdsMutation = useMutation({
    mutationFn: (input: UpdateRegisterInput) => updateRegister(registerId!, input),
    onSuccess: () => setStepId("features")
  });

  // Step 3: features — reviewsEnabled drives conditional step
  const featuresMutation = useMutation({
    mutationFn: ({ input }: { input: UpdateRegisterInput; reviewsEnabled: boolean }) =>
      updateRegister(registerId!, input),
    onSuccess: (_, variables) => {
      setReviewsEnabled(variables.reviewsEnabled);
      setStepId(variables.reviewsEnabled ? "reviews" : "likelihood");
    }
  });

  // Step 3b: reviews settings
  const reviewsMutation = useMutation({
    mutationFn: (input: UpdateRegisterInput) => updateRegister(registerId!, input),
    onSuccess: () => setStepId("likelihood")
  });

  const isPending =
    createMutation.isPending ||
    riskIdsMutation.isPending ||
    featuresMutation.isPending ||
    reviewsMutation.isPending;

  const mutationError =
    createMutation.error ??
    riskIdsMutation.error ??
    featuresMutation.error ??
    reviewsMutation.error;

  // Forms
  const basicInfoForm = useForm({
    initialValues: {
      name: "",
      description: "",
      initialRegisterAdminUserIds: [] as string[]
    }
  });

  const riskIdsForm = useForm({
    initialValues: {
      riskIdPrefix: "",
      riskIdZeroPaddingEnabled: false,
      riskIdZeroPaddingWidth: 4
    }
  });

  const featuresForm = useForm({
    initialValues: {
      allowViewerExport: false,
      customFieldValidationEnabled: false,
      reviewsEnabled: false
    }
  });

  const reviewsForm = useForm({
    initialValues: {
      defaultReviewFrequencyMonths: 3
    }
  });

  function handleNextClick() {
    if (isFormStep) {
      formRef.current?.requestSubmit();
    } else if (isLastStep) {
      handleFinish();
    } else {
      setStepId(steps[currentIndex + 1]!);
    }
  }

  function handleFinish() {
    queryClient.invalidateQueries({ queryKey: ["registers"] });
    if (registerId) navigate(`/registers/${registerId}`);
    onClose();
  }

  function handleClose() {
    if (registerId) queryClient.invalidateQueries({ queryKey: ["registers"] });
    onClose();
  }

  function renderStepContent() {
    switch (stepId) {
      case "basic-info":
        return (
          <form
            ref={formRef}
            onSubmit={basicInfoForm.onSubmit((values) =>
              createMutation.mutate({
                name: values.name,
                description: values.description || undefined,
                riskIdZeroPaddingEnabled: false,
                riskIdZeroPaddingWidth: 4,
                initialRegisterAdminUserIds: values.initialRegisterAdminUserIds
              })
            )}
          >
            <Stack>
              <TextInput label="Name" required {...basicInfoForm.getInputProps("name")} />
              <Textarea
                label="Description"
                autosize
                minRows={2}
                {...basicInfoForm.getInputProps("description")}
              />
              <MultiSelect
                label="Register admins"
                description="Users who can manage this register's configuration and risks."
                data={(usersQuery.data?.data ?? []).map((user) => ({
                  value: user.id,
                  label: `${user.name} (${user.email})`
                }))}
                searchable
                {...basicInfoForm.getInputProps("initialRegisterAdminUserIds")}
              />
            </Stack>
          </form>
        );

      case "risk-ids":
        return (
          <form
            ref={formRef}
            onSubmit={riskIdsForm.onSubmit((values) =>
              riskIdsMutation.mutate({
                riskIdPrefix: values.riskIdPrefix || null,
                riskIdZeroPaddingEnabled: values.riskIdZeroPaddingEnabled,
                riskIdZeroPaddingWidth: values.riskIdZeroPaddingWidth
              })
            )}
          >
            <Stack>
              <TextInput
                label="Risk ID prefix"
                description='Optional. A short label prepended to every risk ID (e.g. "PROJ-").'
                maw={220}
                {...riskIdsForm.getInputProps("riskIdPrefix")}
              />
              <Checkbox
                label="Zero-pad risk IDs"
                description="Pad risk numbers with leading zeros for a consistent width."
                {...riskIdsForm.getInputProps("riskIdZeroPaddingEnabled", { type: "checkbox" })}
              />
              {riskIdsForm.values.riskIdZeroPaddingEnabled ? (
                <NumberInput
                  label="Padding width"
                  description="Total digits in the risk number (e.g. 4 gives IDs like 0042)."
                  min={2}
                  max={12}
                  w={140}
                  {...riskIdsForm.getInputProps("riskIdZeroPaddingWidth")}
                />
              ) : null}
            </Stack>
          </form>
        );

      case "features":
        return (
          <form
            ref={formRef}
            onSubmit={featuresForm.onSubmit((values) =>
              featuresMutation.mutate({
                input: {
                  allowViewerExport: values.allowViewerExport,
                  customFieldValidationEnabled: values.customFieldValidationEnabled,
                  reviewsEnabled: values.reviewsEnabled
                },
                reviewsEnabled: values.reviewsEnabled
              })
            )}
          >
            <Stack>
              <Checkbox
                label="Allow viewer export"
                description="Users with Viewer access can export the risk register to a spreadsheet."
                {...featuresForm.getInputProps("allowViewerExport", { type: "checkbox" })}
              />
              <Checkbox
                label="Custom field validation"
                description="Enables per-field validation modes (Allow / Warn / Block) for custom fields, replacing the simple required flag."
                {...featuresForm.getInputProps("customFieldValidationEnabled", { type: "checkbox" })}
              />
              <Checkbox
                label="Reviews"
                description="Risk owners are periodically prompted to review and attest to their risks."
                {...featuresForm.getInputProps("reviewsEnabled", { type: "checkbox" })}
              />
            </Stack>
          </form>
        );

      case "reviews":
        return (
          <form
            ref={formRef}
            onSubmit={reviewsForm.onSubmit((values) =>
              reviewsMutation.mutate({
                defaultReviewFrequencyMonths: values.defaultReviewFrequencyMonths
              })
            )}
          >
            <Stack>
              <NumberInput
                label="Default review frequency"
                description="How often, in months, risks should be reviewed by default."
                suffix=" months"
                min={1}
                max={60}
                w={240}
                {...reviewsForm.getInputProps("defaultReviewFrequencyMonths")}
              />
            </Stack>
          </form>
        );

      case "likelihood":
        return registerId ? (
          <LikelihoodConfigTab registerId={registerId} draftConfigMode={false} />
        ) : null;

      case "impact":
        return registerId ? (
          <ImpactConfigTab registerId={registerId} draftConfigMode={false} />
        ) : null;

      case "risk-levels":
        return registerId ? (
          <RiskLevelConfigTab registerId={registerId} draftConfigMode={false} />
        ) : null;

      case "matrix":
        return registerId ? (
          <MatrixConfigTab registerId={registerId} draftConfigMode={false} wizardMode />
        ) : null;

      case "custom-fields":
        return registerId ? (
          <FieldConfigTab registerId={registerId} draftConfigMode={false} />
        ) : null;
    }
  }

  const meta = STEP_META[stepId];
  const progressValue = ((currentIndex + 1) / steps.length) * 100;

  const modalSize = stepId === "custom-fields" ? "90vw" : "xl";

  return (
    <Modal opened={opened} onClose={handleClose} title="Create register" size={modalSize}>
      <Stack gap="md">
        <Box>
          <Group justify="space-between" mb={6}>
            <Text size="sm" c="dimmed" fw={500}>
              Step {currentIndex + 1} of {steps.length}
            </Text>
          </Group>
          <Progress value={progressValue} size="xs" />
        </Box>

        <Box>
          <Title order={4}>{meta.title}</Title>
          <Text size="sm" c="dimmed" mt={4}>
            {meta.description}
          </Text>
        </Box>

        <Divider />

        <ApiErrorAlert error={mutationError} fallback="Unable to save. Please try again." />

        {renderStepContent()}

        <Divider />

        <Group justify="space-between">
          <Button variant="subtle" onClick={() => setStepId(steps[currentIndex - 1]!)} disabled={isFirstStep}>
            Back
          </Button>
          <Button onClick={handleNextClick} loading={isPending}>
            {isLastStep ? "Finish" : "Next"}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
