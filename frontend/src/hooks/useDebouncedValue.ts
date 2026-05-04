import { useDebouncedValue as useMantineDebouncedValue } from "@mantine/hooks";

export function useDebouncedValue<T>(value: T, delay = 250) {
  return useMantineDebouncedValue(value, delay);
}
