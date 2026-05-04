import { AppShell, Button, Group, NavLink, Text, Title } from "@mantine/core";
import { Link, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../auth/session";

export function MainLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <AppShell header={{ height: 60 }} navbar={{ width: 240, breakpoint: "sm" }} padding="md">
      <AppShell.Header px="md">
        <Group h="100%" justify="space-between">
          <Title order={3}>Custom Risk</Title>
          <Group gap="sm">
            <Text size="sm">{user?.name}</Text>
            <Button variant="light" onClick={() => void logout()}>
              Logout
            </Button>
          </Group>
        </Group>
      </AppShell.Header>
      <AppShell.Navbar p="sm">
        <NavLink
          component={Link}
          to="/"
          label="Home"
          active={location.pathname === "/"}
        />
      </AppShell.Navbar>
      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
