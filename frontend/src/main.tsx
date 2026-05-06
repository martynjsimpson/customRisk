import React from "react";
import ReactDOM from "react-dom/client";
import { createTheme, MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";

import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";

import { AuthProvider } from "./auth/session";
import { router } from "./router/routes";

const passwordManagerIgnoreProps = {
  autoComplete: "off",
  "data-bwignore": "true",
  "data-lpignore": "true",
  "data-1p-ignore": "true"
};

const theme = createTheme({
  components: {
    Alert: {
      defaultProps: {
        variant: "light"
      }
    },
    Badge: {
      defaultProps: {
        variant: "light"
      }
    },
    Table: {
      defaultProps: {
        striped: true,
        highlightOnHover: true
      }
    },
    MultiSelect: {
      defaultProps: passwordManagerIgnoreProps
    },
    NumberInput: {
      defaultProps: passwordManagerIgnoreProps
    },
    PasswordInput: {
      defaultProps: passwordManagerIgnoreProps
    },
    Select: {
      defaultProps: passwordManagerIgnoreProps
    },
    Textarea: {
      defaultProps: passwordManagerIgnoreProps
    },
    TextInput: {
      defaultProps: passwordManagerIgnoreProps
    }
  }
});

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <MantineProvider theme={theme}>
      <Notifications />
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </QueryClientProvider>
    </MantineProvider>
  </React.StrictMode>
);
