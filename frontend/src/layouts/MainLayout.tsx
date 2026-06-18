import { AppShell, Button, Group, NavLink, Stack, Text, Title, Tooltip } from "@mantine/core";
import {
  IconBook,
  IconCopy,
  IconHelp,
  IconHistory,
  IconHome,
  IconKey,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconLogout,
  IconShield,
  IconUser,
  IconUsers
} from "@tabler/icons-react";
import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../auth/session";
import { useFeatureFlags } from "../hooks/useFeatureFlags";
import { usePermissions } from "../hooks/usePermissions";
import packageJson from "../../package.json";

const NAV_WIDTH_FULL = 240;
const NAV_WIDTH_COLLAPSED = 60;

interface NavItemProps {
  to: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
  collapsed: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

function NavItem({ to, label, icon, active, collapsed, onClick }: NavItemProps) {
  const link = onClick ? (
    <NavLink
      label={collapsed ? undefined : label}
      leftSection={icon}
      active={active}
      styles={collapsed ? { root: { justifyContent: "center" } } : undefined}
      onClick={onClick}
    />
  ) : (
    <NavLink
      component={Link}
      to={to}
      label={collapsed ? undefined : label}
      leftSection={icon}
      active={active}
      styles={collapsed ? { root: { justifyContent: "center" } } : undefined}
    />
  );

  if (collapsed) {
    return (
      <Tooltip label={label} position="right" withArrow>
        {link}
      </Tooltip>
    );
  }
  return link;
}

export function MainLayout() {
  const { user, logout, appEnvironment } = useAuth();
  const { isSystemAdmin, registerRoles } = usePermissions();
  const flags = useFeatureFlags();
  const location = useLocation();
  const hasRegisterAccess = isSystemAdmin || registerRoles.length > 0;
  const [collapsed, setCollapsed] = useState(false);

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: collapsed ? NAV_WIDTH_COLLAPSED : NAV_WIDTH_FULL, breakpoint: "sm" }}
      padding="md"
    >
      <AppShell.Header px="md">
        <Group h="100%" justify="space-between">
          <Title order={3}>Custom Risk</Title>
          <Group gap="sm">
            <Button
              component={Link}
              to="/profile"
              variant="subtle"
              size="sm"
              leftSection={<IconUser size={18} />}
              aria-label="My Profile"
            >
              {user?.name}
            </Button>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="sm" style={{ display: "flex", flexDirection: "column" }}>
        <Stack gap={4} style={{ flex: 1 }}>
          <NavItem
            to="/"
            label="Home"
            icon={<IconHome size={18} />}
            active={location.pathname === "/"}
            collapsed={collapsed}
          />
          <NavItem
            to="/my-risks"
            label="My Risks"
            icon={<IconShield size={18} />}
            active={location.pathname.startsWith("/my-risks")}
            collapsed={collapsed}
          />
          {hasRegisterAccess ? (
            <NavItem
              to="/registers"
              label="Registers"
              icon={<IconBook size={18} />}
              active={location.pathname.startsWith("/registers")}
              collapsed={collapsed}
            />
          ) : null}
          {isSystemAdmin ? (
            <NavItem
              to="/audit"
              label="Audit"
              icon={<IconHistory size={18} />}
              active={location.pathname.startsWith("/audit")}
              collapsed={collapsed}
            />
          ) : null}
          {isSystemAdmin ? (
            <NavItem
              to="/users"
              label="Users"
              icon={<IconUsers size={18} />}
              active={location.pathname.startsWith("/users")}
              collapsed={collapsed}
            />
          ) : null}
          {isSystemAdmin && flags.apiKeys ? (
            <NavItem
              to="/api-keys"
              label="API Keys"
              icon={<IconKey size={18} />}
              active={location.pathname.startsWith("/api-keys")}
              collapsed={collapsed}
            />
          ) : null}
          {isSystemAdmin && flags.draftConfig ? (
            <NavItem
              to="/templates"
              label="Templates"
              icon={<IconCopy size={18} />}
              active={location.pathname.startsWith("/templates")}
              collapsed={collapsed}
            />
          ) : null}
          <NavItem
            to="/help"
            label="Help"
            icon={<IconHelp size={18} />}
            active={location.pathname.startsWith("/help")}
            collapsed={collapsed}
          />
        </Stack>
        <Stack gap={0} pt="xs" style={{ borderTop: "1px solid var(--mantine-color-default-border)" }}>
          <NavItem
            to="#"
            label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            icon={collapsed ? <IconLayoutSidebarLeftExpand size={18} /> : <IconLayoutSidebarLeftCollapse size={18} />}
            active={false}
            collapsed={collapsed}
            onClick={(e) => { e.preventDefault(); setCollapsed((c) => !c); }}
          />
          <NavItem
            to="#"
            label="Logout"
            icon={<IconLogout size={18} />}
            active={false}
            collapsed={collapsed}
            onClick={(e) => { e.preventDefault(); void logout(); }}
          />
          {!collapsed && (
            <Text size="xs" c="dimmed" ta="center" py={4}>
              {appEnvironment
                ? `[${appEnvironment.toUpperCase()} v${packageJson.version}]`
                : `v${packageJson.version}`}
            </Text>
          )}
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
