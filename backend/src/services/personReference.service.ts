import { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { logger } from "../config/logger.js";

export type PersonClient = typeof prisma | Prisma.TransactionClient;

export interface PersonDisplay {
  id: string;
  email: string;
  displayName: string;
  isResolved: boolean;
  isActive: boolean;
}

export type PersonInput =
  | { type: "user"; userId: string }
  | { type: "email"; email: string; displayName?: string };

function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email);
}

export const personReferenceSelect = {
  id: true,
  email: true,
  displayName: true,
  userId: true,
  user: { select: { id: true, name: true, email: true, isActive: true } }
} satisfies Prisma.PersonReferenceSelect;

type PersonRow = Prisma.PersonReferenceGetPayload<{ select: typeof personReferenceSelect }>;

export function formatPersonDisplay(row: PersonRow): PersonDisplay {
  if (row.user) {
    return {
      id: row.id,
      email: row.email,
      displayName: row.user.name,
      isResolved: true,
      isActive: row.user.isActive
    };
  }
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName ?? row.email,
    isResolved: false,
    isActive: false
  };
}

export async function upsertPersonReference(
  email: string,
  displayName?: string,
  client: PersonClient = prisma
): Promise<string> {
  const normalised = normaliseEmail(email);
  const ref = await (client as typeof prisma).personReference.upsert({
    where: { email: normalised },
    create: { email: normalised, displayName: displayName ?? null },
    update: {},
    select: { id: true }
  });
  return ref.id;
}

export async function resolvePersonInput(
  input: PersonInput,
  client: PersonClient = prisma
): Promise<string> {
  if (input.type === "user") {
    const user = await (client as typeof prisma).user.findUniqueOrThrow({
      where: { id: input.userId },
      select: { id: true, email: true, name: true }
    });

    const ref = await (client as typeof prisma).personReference.upsert({
      where: { email: user.email.toLowerCase() },
      create: {
        email: user.email.toLowerCase(),
        userId: user.id,
        displayName: user.name,
        resolvedAt: new Date()
      },
      update: { userId: user.id, displayName: user.name, resolvedAt: new Date() },
      select: { id: true }
    });

    return ref.id;
  }

  return upsertPersonReference(input.email, input.displayName, client);
}

export async function getPersonDisplay(personId: string): Promise<PersonDisplay | null> {
  const row = await prisma.personReference.findUnique({
    where: { id: personId },
    select: personReferenceSelect
  });

  if (!row) return null;
  return formatPersonDisplay(row);
}

export async function searchPersons(
  query: string,
  limit = 10
): Promise<PersonDisplay[]> {
  const term = query.trim();
  if (!term) return [];

  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      OR: [
        { name: { contains: term, mode: "insensitive" } },
        { email: { contains: term, mode: "insensitive" } }
      ]
    },
    select: { id: true, name: true, email: true, isActive: true },
    take: limit
  });

  const results: PersonDisplay[] = [];
  for (const u of users) {
    const ref = await prisma.personReference.upsert({
      where: { email: u.email.toLowerCase() },
      create: {
        email: u.email.toLowerCase(),
        userId: u.id,
        displayName: u.name,
        resolvedAt: new Date()
      },
      update: { userId: u.id, displayName: u.name },
      select: personReferenceSelect
    });
    results.push(formatPersonDisplay(ref));
  }

  return results;
}

export async function linkPersonReferenceToUser(userId: string, email: string): Promise<void> {
  const normalised = normaliseEmail(email);

  try {
    await prisma.personReference.upsert({
      where: { email: normalised },
      create: {
        email: normalised,
        userId,
        resolvedAt: new Date()
      },
      update: {
        userId,
        resolvedAt: new Date()
      }
    });
  } catch (err) {
    logger.warn({ err, userId, email: normalised }, "Failed to link person reference to user");
  }
}
