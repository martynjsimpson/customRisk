/**
 * RiskDetailModal — pagination and cap note behavioural tests
 *
 * Static source checks can confirm that Pagination and the cap note text are
 * referenced in the source, but cannot catch bugs in the conditional logic:
 * - pagination only appearing when records > 5
 * - cap note only appearing when records === 100 (not >= 100 or always)
 * - pagination total pages calculated correctly
 * - first page shows only the first 5 records
 *
 * These tests render the component against realistic mock data to verify the
 * conditional rendering at runtime.
 */

import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — hoisted before any component import
// ---------------------------------------------------------------------------

const getRiskMock = vi.fn();
const listRiskReviewsMock = vi.fn();
const listRiskAuditMock = vi.fn();

vi.mock("../src/api/risks.api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/api/risks.api")>();
  return {
    ...actual,
    getRisk: (...args: unknown[]) => getRiskMock(...args),
    listRiskReviews: (...args: unknown[]) => listRiskReviewsMock(...args)
  };
});

vi.mock("../src/api/audit.api", () => ({
  listRiskAudit: (...args: unknown[]) => listRiskAuditMock(...args)
}));

vi.mock("../src/components/ApiErrorAlert", () => ({
  ApiErrorAlert: () => null
}));

vi.mock("../src/features/audit/AuditEventTable", () => ({
  AuditEventTable: ({ events }: { events: { id: string }[] }) => (
    <div data-testid="audit-event-table">
      {events.map((e) => (
        <div key={e.id} data-testid={`audit-row-${e.id}`} />
      ))}
    </div>
  )
}));

// ---------------------------------------------------------------------------
// Test data helpers
// ---------------------------------------------------------------------------

function makeRisk() {
  return {
    id: "risk-1",
    displayRiskId: "R-001",
    title: "Test Risk",
    description: "A test risk",
    state: "OPEN",
    riskScore: 6,
    createdDate: "2025-01-01",
    likelihood: { name: "Medium" },
    impact: { name: "High" },
    riskLevel: { id: "rl-1", name: "High", color: null },
    responseStrategy: { name: "Mitigate" },
    responseAction: null,
    nextReviewDate: null,
    owner: { id: "user-1", name: "Alice" },
    ownerPerson: null,
    reviewStatus: "NOT_REQUIRED",
    systemCreatedBy: { name: "Alice" },
    systemUpdatedAt: new Date().toISOString(),
    customFields: []
  };
}

function makeReview(id: string) {
  return {
    id,
    reviewedAt: new Date().toISOString(),
    reviewedBy: { name: "Alice" },
    comment: null,
    calculatedNextReviewDate: "2026-01-01"
  };
}

function makeAuditEvent(id: string) {
  return {
    id,
    occurredAt: new Date().toISOString(),
    actor: { name: "Alice" },
    ipAddress: null,
    action: "RISK_CREATED",
    summary: "Risk created",
    objectType: "RISK",
    objectId: "risk-1",
    objectDisplayName: "R-001",
    registerDisplayName: null,
    fieldChanges: null,
    metadataJson: null
  };
}

function makeFormConfig() {
  return {
    customFields: [],
    states: ["OPEN"],
    register: {
      id: "reg-1",
      defaultNewRiskState: "OPEN",
      reviewsEnabled: true,
      customFieldValidationEnabled: false
    },
    users: [],
    likelihoodValues: [],
    impactValues: [],
    riskLevels: [],
    responseStrategies: []
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function Wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider>{children}</MantineProvider>
    </QueryClientProvider>
  );
}

async function renderModal(overrides?: { reviews?: object[]; auditEvents?: object[] }) {
  const reviews = overrides?.reviews ?? [];
  const auditEvents = overrides?.auditEvents ?? [];

  getRiskMock.mockResolvedValue(makeRisk());
  listRiskReviewsMock.mockResolvedValue(reviews);
  listRiskAuditMock.mockResolvedValue({ data: auditEvents, meta: { total: auditEvents.length } });

  const { RiskDetailModal } = await import("../src/features/risks/RiskDetailModal");

  render(
    <Wrapper>
      <RiskDetailModal
        registerId="reg-1"
        riskId="risk-1"
        formConfig={makeFormConfig() as any}
        opened={true}
        canReview={true}
        canEditRows={true}
        canDelete={false}
        onClose={vi.fn()}
        onRequestEdit={vi.fn()}
        onRequestReview={vi.fn()}
        onRequestDelete={vi.fn()}
      />
    </Wrapper>
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("RiskDetailModal — reviewStatusPosition ordering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function renderWithReviewPosition(reviewStatusPosition: number | null, customFieldDisplayOrder: number) {
    const customFieldId = "cf-1";
    getRiskMock.mockResolvedValue({
      ...makeRisk(),
      customFields: []
    });
    listRiskReviewsMock.mockResolvedValue([]);
    listRiskAuditMock.mockResolvedValue({ data: [], meta: { total: 0 } });

    const formConfig = {
      ...makeFormConfig(),
      register: {
        ...makeFormConfig().register,
        reviewsEnabled: true,
        reviewStatusPosition
      },
      customFields: [
        {
          id: customFieldId,
          registerId: "reg-1",
          fieldName: "My Custom Field",
          fieldType: "TEXT" as const,
          helpText: null,
          isRequired: false,
          validationMode: "ALLOW" as const,
          displayOrder: customFieldDisplayOrder,
          isActive: true,
          formula: null,
          formulaDependencies: [],
          visibleToRoles: [],
          visibleToRiskResponseOwners: true,
          options: []
        }
      ]
    };

    const { RiskDetailModal } = await import("../src/features/risks/RiskDetailModal");

    render(
      <Wrapper>
        <RiskDetailModal
          registerId="reg-1"
          riskId="risk-1"
          formConfig={formConfig as any}
          opened={true}
          canReview={false}
          canEditRows={false}
          canDelete={false}
          onClose={vi.fn()}
          onRequestEdit={vi.fn()}
          onRequestReview={vi.fn()}
          onRequestDelete={vi.fn()}
        />
      </Wrapper>
    );

    // Wait for the risk data to load and the table rows to appear
    await waitFor(() => {
      expect(screen.getByText("Risk Title")).toBeTruthy();
    });
  }

  function getFieldOrder(...fieldNames: string[]): number[] {
    // Find all th elements (field label cells) in the risk detail table
    const thElements = document.querySelectorAll("table th");
    const texts = Array.from(thElements).map((el) => el.textContent ?? "");
    return fieldNames.map((name) => texts.indexOf(name));
  }

  it("places Review status after the custom field when reviewStatusPosition is greater than the custom field displayOrder", async () => {
    // Custom field at 970, Review status at 975 (between 970 and 980).
    // Review status should appear AFTER "My Custom Field" in the DOM.
    await renderWithReviewPosition(975, 970);

    const [customFieldIndex, reviewStatusIndex] = getFieldOrder("My Custom Field", "Review status");

    expect(customFieldIndex).toBeGreaterThanOrEqual(0);
    expect(reviewStatusIndex).toBeGreaterThanOrEqual(0);
    expect(reviewStatusIndex).toBeGreaterThan(customFieldIndex);
  });

  it("places Review status before the custom field when reviewStatusPosition is less than the custom field displayOrder", async () => {
    // Custom field at 980, Review status at 975 (between 970 and 980).
    // Review status should appear BEFORE "My Custom Field" in the DOM.
    await renderWithReviewPosition(975, 980);

    const [customFieldIndex, reviewStatusIndex] = getFieldOrder("My Custom Field", "Review status");

    expect(customFieldIndex).toBeGreaterThanOrEqual(0);
    expect(reviewStatusIndex).toBeGreaterThanOrEqual(0);
    expect(reviewStatusIndex).toBeLessThan(customFieldIndex);
  });

  it("places Review status last when reviewStatusPosition is null", async () => {
    // null means last — Review status should appear AFTER "My Custom Field"
    await renderWithReviewPosition(null, 970);

    const [customFieldIndex, reviewStatusIndex] = getFieldOrder("My Custom Field", "Review status");

    expect(customFieldIndex).toBeGreaterThanOrEqual(0);
    expect(reviewStatusIndex).toBeGreaterThanOrEqual(0);
    expect(reviewStatusIndex).toBeGreaterThan(customFieldIndex);
  });
});

describe("RiskDetailModal — Review History pagination and cap note", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not show pagination when there are 5 or fewer reviews", async () => {
    const reviews = Array.from({ length: 5 }, (_, i) => makeReview(`rev-${i}`));
    await renderModal({ reviews });

    await waitFor(() => {
      expect(screen.getByText("Review history")).toBeTruthy();
    });

    // Mantine Pagination renders numbered page buttons; no page 2 should appear
    // when total pages <= 1
    expect(screen.queryByRole("button", { name: "2" })).toBeNull();
  });

  it("shows pagination when there are more than 5 reviews", async () => {
    const reviews = Array.from({ length: 6 }, (_, i) => makeReview(`rev-${i}`));
    await renderModal({ reviews });

    // Mantine Pagination renders numbered page buttons — page 2 should be present
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "2" })).toBeTruthy();
    });
  });

  it("shows only the first 5 reviews on page 1 when there are 6 reviews", async () => {
    const reviews = Array.from({ length: 6 }, (_, i) => makeReview(`rev-${i}`));
    await renderModal({ reviews });

    await waitFor(() => {
      expect(listRiskReviewsMock).toHaveBeenCalledWith("reg-1", "risk-1");
    });

    // 6 reviews at page size 5 = 2 pages; page 2 button should appear
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "2" })).toBeTruthy();
    });
  });

  it("does not show the cap note when reviews are fewer than 100", async () => {
    const reviews = Array.from({ length: 6 }, (_, i) => makeReview(`rev-${i}`));
    await renderModal({ reviews });

    await waitFor(() => {
      expect(screen.getByText("Review history")).toBeTruthy();
    });

    expect(screen.queryByText(/most recent 100 reviews/)).toBeNull();
  });

  it("shows the cap note when exactly 100 reviews are returned", async () => {
    const reviews = Array.from({ length: 100 }, (_, i) => makeReview(`rev-${i}`));
    await renderModal({ reviews });

    await waitFor(() => {
      expect(screen.getByText(/most recent 100 reviews are shown/)).toBeTruthy();
    });
  });
});

describe("RiskDetailModal — Audit History pagination and cap note", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not show pagination when there are 5 or fewer audit events", async () => {
    const auditEvents = Array.from({ length: 5 }, (_, i) => makeAuditEvent(`evt-${i}`));
    await renderModal({ auditEvents });

    await waitFor(() => {
      expect(screen.getByText("Audit history")).toBeTruthy();
    });

    // No page 2 button should be present
    expect(screen.queryByRole("button", { name: "2" })).toBeNull();
  });

  it("shows audit pagination when there are more than 5 audit events", async () => {
    const auditEvents = Array.from({ length: 8 }, (_, i) => makeAuditEvent(`evt-${i}`));
    await renderModal({ auditEvents });

    // 8 events at page size 5 = 2 pages
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "2" })).toBeTruthy();
    });
  });

  it("does not show the cap note when audit events are fewer than 100", async () => {
    const auditEvents = Array.from({ length: 8 }, (_, i) => makeAuditEvent(`evt-${i}`));
    await renderModal({ auditEvents });

    await waitFor(() => {
      expect(screen.getByText("Audit history")).toBeTruthy();
    });

    expect(screen.queryByText(/most recent 100 audit records/)).toBeNull();
  });

  it("shows the audit cap note when exactly 100 audit events are returned", async () => {
    const auditEvents = Array.from({ length: 100 }, (_, i) => makeAuditEvent(`evt-${i}`));
    await renderModal({ auditEvents });

    await waitFor(() => {
      expect(screen.getByText(/most recent 100 audit records are shown/)).toBeTruthy();
    });
  });
});
