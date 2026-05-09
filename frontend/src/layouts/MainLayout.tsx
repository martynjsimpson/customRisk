import { AppShell, Button, Group, NavLink, Stack, Text, Title, Tooltip } from "@mantine/core";
import {
  IconBook,
  IconHistory,
  IconHome,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconShield,
  IconUser,
  IconUsers
} from "@tabler/icons-react";
import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../auth/session";
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
  const { user, logout } = useAuth();
  const { isSystemAdmin, registerRoles } = usePermissions();
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
            <Button variant="light" onClick={() => void logout()}>
              Logout
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
          {!collapsed && (
            <Text size="xs" c="dimmed" ta="center" py={4}>
              v{packageJson.version}
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
