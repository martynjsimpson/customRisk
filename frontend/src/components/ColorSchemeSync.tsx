import { useEffect } from "react";
import { type MantineColorScheme, useMantineColorScheme } from "@mantine/core";

import { usePreferences } from "../hooks/usePreferences";

export function ColorSchemeSync() {
  const preferences = usePreferences();
  const { setColorScheme } = useMantineColorScheme();

  useEffect(() => {
    if (preferences?.colorScheme) {
      setColorScheme(preferences.colorScheme as MantineColorScheme);
    }
  }, [preferences?.colorScheme, setColorScheme]);

  return null;
}
