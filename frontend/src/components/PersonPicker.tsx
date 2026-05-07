import { Badge, Combobox, Group, Loader, Text, TextInput, useCombobox } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { useEffect, useState } from "react";

import { searchPersons, type PersonDisplay } from "../api/persons.api";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface PersonPickerProps {
  label: string;
  required?: boolean;
  value: string;          // email string (empty = no selection)
  onChange: (email: string) => void;
  error?: string;
  disabled?: boolean;
}

export function PersonPicker({ label, required, value, onChange, error, disabled }: PersonPickerProps) {
  const [inputValue, setInputValue] = useState(value);
  const [results, setResults] = useState<PersonDisplay[]>([]);
  const [loading, setLoading] = useState(false);
  const [debounced] = useDebouncedValue(inputValue, 250);

  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption()
  });

  // Sync external value → input display (e.g. when form pre-populates)
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Search when debounced input changes
  useEffect(() => {
    if (!debounced.trim()) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    searchPersons(debounced)
      .then((data) => {
        if (!cancelled) setResults(data);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [debounced]);

  const showFreeEmail =
    EMAIL_RE.test(inputValue.trim()) &&
    !results.some((r) => r.email === inputValue.trim().toLowerCase());

  const options = results.map((person) => (
    <Combobox.Option key={person.id} value={person.email}>
      <Group gap="xs" wrap="nowrap">
        <Text size="sm" flex={1}>
          {person.displayName}
          {person.displayName !== person.email && (
            <Text component="span" size="xs" c="dimmed"> ({person.email})</Text>
          )}
        </Text>
        {!person.isResolved && <Badge size="xs" color="orange">Unresolved</Badge>}
        {person.isResolved && !person.isActive && <Badge size="xs" color="gray">Inactive</Badge>}
      </Group>
    </Combobox.Option>
  ));

  if (showFreeEmail) {
    options.push(
      <Combobox.Option key="__free__" value={inputValue.trim()}>
        <Group gap="xs">
          <Text size="sm">{inputValue.trim()}</Text>
          <Badge size="xs" color="blue">Unresolved email</Badge>
        </Group>
      </Combobox.Option>
    );
  }

  return (
    <Combobox
      store={combobox}
      onOptionSubmit={(val) => {
        onChange(val);
        setInputValue(val);
        combobox.closeDropdown();
      }}
    >
      <Combobox.Target>
        <TextInput
          label={required ? `${label} *` : label}
          value={inputValue}
          disabled={disabled}
          error={error}
          rightSection={loading ? <Loader size="xs" /> : null}
          onChange={(event) => {
            const next = event.currentTarget.value;
            setInputValue(next);
            if (next !== value) onChange("");
            combobox.openDropdown();
          }}
          onFocus={() => combobox.openDropdown()}
          onBlur={() => {
            combobox.closeDropdown();
            // If typed value is a valid email and user didn't select from dropdown, accept it
            const trimmed = inputValue.trim();
            if (trimmed && EMAIL_RE.test(trimmed) && trimmed !== value) {
              onChange(trimmed);
            }
          }}
          placeholder="Search by name or enter email"
        />
      </Combobox.Target>

      {options.length > 0 && (
        <Combobox.Dropdown>
          <Combobox.Options>{options}</Combobox.Options>
        </Combobox.Dropdown>
      )}
    </Combobox>
  );
}
