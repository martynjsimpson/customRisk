# Group 4 — Portability, Reporting, Attachments, and Integrations

This group is the broadest expansion bucket. Most of it should come after Groups 1 to 3 because it depends on stronger field, scoring, workflow, and permission foundations.

## Included tickets

### Phase 10 — Import and Export

- partial today:
- `PM10-09`: risk CSV export exists, but not with advanced field-selection behavior.
- `PM10-10`: audit CSV export exists, but without full export-audit coverage.
- not started:
- `PM10-01` to `PM10-08` other than config JSON import/export already covered by Phase 4.

### Phase 11 — Reporting

- partial today:
- `PM11-01`, `PM11-02`: column persistence behaves like a very small saved-view precursor.
- `PM11-03`: dashboard aggregates exist.
- `PM11-07`: risk and audit CSV export exist, but not saved/custom report export.
- not started:
- charts, report builder, scheduled reports, and real cross-register reporting.

### Phase 12 — Attachments

- `PM12-01` partial only at design level through the ADR.
- `PM12-02` to `PM12-06` are not found in the product.

### Phase 13 — Integrations

- `PM13-01` partial: API key table and hashing utilities exist.
- `PM13-02` to `PM13-07` are not found in the product.

## Recommended order inside this group

1. Finish export and audit polish already adjacent to the current product: `PM10-09`, `PM10-10`, `PM11-07`.
2. Build proper saved views and reporting foundations: `PM11-01` to `PM11-06`.
3. Add CSV import only after advanced fields/scoring/actions are stable enough to avoid rework: `PM10-01` to `PM10-08`.
4. Add attachments after object models and permissions are stable: `PM12-01` to `PM12-06`.
5. Finish API keys and webhooks last, unless external integration has become a near-term commercial need: `PM13-01` to `PM13-07`.

## Exit condition

This group is done when data can move into and out of the platform safely, reporting is more than dashboards, and external integrations are supported by real authentication and delivery controls.
