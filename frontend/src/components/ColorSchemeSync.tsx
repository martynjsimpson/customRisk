import { useEffect } from "react";
import { type MantineColorScheme, useMantineColorScheme } from "@mantine/core";

import { useAuth } from "../auth/session";

export function ColorSchemeSync() {
  const { preferences } = useAuth();
  const { setColorScheme } = useMantineColorScheme();

  useEffect(() => {
    if (preferences?.colorScheme) {
      setColorScheme(preferences.colorScheme as MantineColorScheme);
    }
  }, [preferences?.colorScheme, setColorScheme]);

  return null;
}
