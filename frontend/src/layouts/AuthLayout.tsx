import { Box, Container, Paper, Title } from "@mantine/core";
import { Outlet } from "react-router-dom";

export function AuthLayout() {
  return (
    <Box bg="gray.0" mih="100vh" py="xl">
      <Container size={420}>
        <Title order={1} ta="center" mb="lg">
          Custom Risk
        </Title>
        <Paper withBorder p="lg" radius="sm">
          <Outlet />
        </Paper>
      </Container>
    </Box>
  );
}
