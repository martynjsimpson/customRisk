import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("persons API client exports searchPersons and PersonDisplay type", async () => {
  const api = await readFile(new URL("../src/api/persons.api.ts", import.meta.url), "utf8");

  assert.match(api, /export async function searchPersons/);
  assert.match(api, /export interface PersonDisplay/);
  assert.match(api, /\/persons\/search/);
  assert.match(api, /params: \{ q: query, limit \}/);
});

test("PersonPicker uses searchPersons and accepts email as its value type", async () => {
  const picker = await readFile(new URL("../src/components/PersonPicker.tsx", import.meta.url), "utf8");

  assert.match(picker, /searchPersons/);
  assert.match(picker, /from "\.\.\/api\/persons\.api"/);
  assert.match(picker, /value: string/);
  assert.match(picker, /onChange: \(email: string\) => void/);
});

test("PersonPicker shows unresolved and inactive badges for data-quality awareness", async () => {
  const picker = await readFile(new URL("../src/components/PersonPicker.tsx", import.meta.url), "utf8");

  assert.match(picker, /Unresolved/);
  assert.match(picker, /Inactive/);
  assert.match(picker, /!person\.isResolved/);
  assert.match(picker, /person\.isResolved && !person\.isActive/);
});

test("RiskFormModal uses PersonPicker for the owner field", async () => {
  const form = await readFile(new URL("../src/features/risks/RiskFormModal.tsx", import.meta.url), "utf8");

  assert.match(form, /PersonPicker/);
  assert.match(form, /from "\.\.\/\.\.\/components\/PersonPicker"/);
  assert.match(form, /ownerUserId/);
});
