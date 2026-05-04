import { Center, Loader } from "@mantine/core";
import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "../auth/session";

export function ProtectedRoute() {
  const { accessToken, isBootstrapping } = useAuth();

  if (isBootstrapping) {
    return (
      <Center h="100vh">
        <Loader />
      </Center>
    );
  }

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
