import { createBrowserRouter } from "react-router-dom";

import { AuthLayout } from "../layouts/AuthLayout";
import { MainLayout } from "../layouts/MainLayout";
import { HomePage } from "../pages/HomePage";
import { LoginPage } from "../pages/LoginPage";
import { RegisterDetailPage } from "../pages/RegisterDetailPage";
import { RegistersPage } from "../pages/RegistersPage";
import { UsersPage } from "../pages/UsersPage";
import { ProtectedRoute } from "./ProtectedRoute";

export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      {
        path: "/login",
        element: <LoginPage />
      }
    ]
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <MainLayout />,
        children: [
          {
            path: "/",
            element: <HomePage />
          },
          {
            path: "/registers",
            element: <RegistersPage />
          },
          {
            path: "/registers/:registerId",
            element: <RegisterDetailPage />
          },
          {
            path: "/users",
            element: <UsersPage />
          }
        ]
      }
    ]
  }
]);
