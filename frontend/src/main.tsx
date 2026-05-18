import React from "react";
import ReactDOM from "react-dom/client";
import { createTheme, MantineProvider, Modal } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";

import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";

import { AuthProvider } from "./auth/session";
import { ColorSchemeSync } from "./components/ColorSchemeSync";
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
      },
      styles: {
        root: {
          flexShrink: 0,
          minWidth: "max-content",
          maxWidth: "none",
          overflow: "visible",
          textOverflow: "clip",
          whiteSpace: "nowrap"
        },
        label: {
          overflow: "visible",
          textOverflow: "clip",
          whiteSpace: "nowrap"
        }
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
    },
    Anchor: {
      defaultProps: {
        size: 'md'
      }
    },
    Modal: Modal.extend({
      styles: (theme) => ({
        title: {
          fontSize: theme.fontSizes.xl,
          fontWeight: 700
        },
      })
    })
  }
});

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="auto">
      <Notifications />
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ColorSchemeSync />
          <RouterProvider router={router} />
        </AuthProvider>
      </QueryClientProvider>
    </MantineProvider>
  </React.StrictMode>
);
