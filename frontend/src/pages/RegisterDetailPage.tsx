import { Badge, Group, Loader, Stack, Tabs, Text, Title } from "@mantine/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";

import {
  getRegister,
  listRegisterPermissionCandidates,
  listRegisterPermissions
} from "../api/registers.api";
import { ApiErrorAlert } from "../components/ApiErrorAlert";
import { RegisterAuditPanel } from "../features/audit/RegisterAuditPanel";
import { RegisterConfigurationPanel } from "../features/configuration/RegisterConfigurationPanel";
import { TemplateDriftBanner } from "../features/configuration/TemplateDriftBanner";
import { RegisterPermissionsPanel } from "../features/registers/RegisterPermissionsPanel";
import { RiskRegisterPanel } from "../features/risks/RiskRegisterPanel";
import { usePermissions } from "../hooks/usePermissions";

export function RegisterDetailPage() {
  const { registerId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("risks");

  useEffect(() => {
    if (searchParams.get("riskId")) {
      setActiveTab("risks");
    }
  }, [searchParams]);

  const queryClient = useQueryClient();
  const { isSystemAdmin } = usePermissions();
  const registerQuery = useQuery({
    queryKey: ["register", registerId],
    queryFn: () => getRegister(registerId),
    enabled: Boolean(registerId)
  });
  const canManage = isSystemAdmin || registerQuery.data?.effectiveRole === "REGISTER_ADMIN";

  const permissionsQuery = useQuery({
    queryKey: ["register-permissions", registerId],
    queryFn: () => listRegisterPermissions(registerId),
    enabled: Boolean(registerId)
  });

  const usersQuery = useQuery({
    queryKey: ["register-permission-candidates", registerId],
    queryFn: () => listRegisterPermissionCandidates(registerId),
    enabled: Boolean(registerId) && canManage
  });

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["register", registerId] }),
      queryClient.invalidateQueries({ queryKey: ["register-permissions", registerId] }),
      queryClient.invalidateQueries({ queryKey: ["registers"] })
    ]);
  };

  return (
    <Stack>
      <Group justify="space-between" align="flex-start">
        <Stack gap={0}>
          <Title order={1}>{registerQuery.data?.name ?? "Register"}</Title>
          {registerQuery.data?.description ? (
            <Text c="dimmed">{registerQuery.data.description}</Text>
          ) : null}
        </Stack>
        <Badge>{registerQuery.data?.effectiveRole}</Badge>
      </Group>
      {registerQuery.isLoading ? <Loader /> : null}
      <ApiErrorAlert error={registerQuery.error} fallback="Unable to load register" />
      {canManage && registerQuery.data ? (
        <TemplateDriftBanner
          linkedTemplate={registerQuery.data.linkedTemplate}
          onViewChanges={() => setActiveTab("configuration")}
        />
      ) : null}
      <Tabs value={activeTab} onChange={(v) => setActiveTab(v ?? "risks")}>
        <Tabs.List>
          <Tabs.Tab value="risks">Risks</Tabs.Tab>
          {canManage ? <Tabs.Tab value="configuration">Configuration</Tabs.Tab> : null}
          {canManage ? <Tabs.Tab value="permissions">Permissions</Tabs.Tab> : null}
          {canManage ? <Tabs.Tab value="audit">Audit</Tabs.Tab> : null}
        </Tabs.List>
        <Tabs.Panel value="risks" pt="md">
          {registerQuery.data ? <RiskRegisterPanel register={registerQuery.data} /> : null}
        </Tabs.Panel>
        <Tabs.Panel value="configuration" pt="md">
          {canManage ? <RegisterConfigurationPanel registerId={registerId} canManage={canManage} /> : null}
        </Tabs.Panel>
        <Tabs.Panel value="permissions" pt="md">
          {canManage ? (
            <RegisterPermissionsPanel
              registerId={registerId}
              permissions={permissionsQuery.data ?? []}
              candidates={usersQuery.data ?? []}
              isLoading={permissionsQuery.isLoading}
              permissionsError={permissionsQuery.error}
              candidatesError={usersQuery.error}
              onSuccess={invalidate}
            />
          ) : null}
        </Tabs.Panel>
        <Tabs.Panel value="audit" pt="md">
          {canManage ? <RegisterAuditPanel registerId={registerId} /> : null}
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}
