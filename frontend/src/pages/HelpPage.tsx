import {
  Accordion,
  Alert,
  Badge,
  Divider,
  Group,
  List,
  Paper,
  Stack,
  Tabs,
  Text,
  Title
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconBook,
  IconBulb,
  IconCheck,
  IconCopy,
  IconHelp,
  IconHistory,
  IconHome,
  IconInfoCircle,
  IconShield,
  IconUsers
} from "@tabler/icons-react";

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <Group gap="xs" mb="xs">
      <ThemeIcon variant="light" size="sm">
        <IconInfoCircle size={14} />
      </ThemeIcon>
      <Title order={4}>{children}</Title>
    </Group>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <Alert icon={<IconBulb size={16} />} color="blue" variant="light" radius="sm">
      {children}
    </Alert>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <Alert icon={<IconInfoCircle size={16} />} color="gray" variant="light" radius="sm">
      {children}
    </Alert>
  );
}

// ─── Getting Started ─────────────────────────────────────────────────────────

function GettingStartedTab() {
  return (
    <Stack>
      <Paper withBorder p="md" radius="sm">
        <Stack>
          <Title order={3}>Welcome to customRisk</Title>
          <Text>
            customRisk is a structured risk management platform that helps your organisation identify,
            track, review, and respond to risks. It is designed around the concept of a{" "}
            <Text span fw={600}>Risk Register</Text> — a central record of all known risks within a
            given scope, such as a project, team, or business unit.
          </Text>
          <Text>
            This Help section walks you through the key concepts and features of the platform. Whether
            you are a risk owner, a register administrator, or just getting started, you will find
            guidance here on how to get the most out of customRisk.
          </Text>
        </Stack>
      </Paper>

      <Paper withBorder p="md" radius="sm">
        <Stack>
          <Title order={3}>Navigating the app</Title>
          <Text c="dimmed" size="sm">
            Use the left-hand navigation bar to move between sections. The sidebar can be collapsed to
            icon-only mode to save screen space.
          </Text>
          <Divider />
          <Stack gap="sm">
            <Group gap="sm">
              <IconHome size={18} />
              <Stack gap={0}>
                <Text fw={600}>Home</Text>
                <Text size="sm" c="dimmed">
                  Your personal dashboard. Shows risks that need your attention, overdue reviews, and
                  (for administrators) a system-wide summary.
                </Text>
              </Stack>
            </Group>
            <Group gap="sm">
              <IconShield size={18} />
              <Stack gap={0}>
                <Text fw={600}>My Risks</Text>
                <Text size="sm" c="dimmed">
                  A consolidated view of all risks assigned to you across every register you have
                  access to.
                </Text>
              </Stack>
            </Group>
            <Group gap="sm">
              <IconBook size={18} />
              <Stack gap={0}>
                <Text fw={600}>Registers</Text>
                <Text size="sm" c="dimmed">
                  The list of all risk registers you can access. Select a register to view its risks,
                  configuration, and audit history.
                </Text>
              </Stack>
            </Group>
            <Group gap="sm">
              <IconHistory size={18} />
              <Stack gap={0}>
                <Text fw={600}>Audit (administrators only)</Text>
                <Text size="sm" c="dimmed">
                  A system-wide audit log of every change made across all registers — who did what
                  and when.
                </Text>
              </Stack>
            </Group>
            <Group gap="sm">
              <IconUsers size={18} />
              <Stack gap={0}>
                <Text fw={600}>Users (administrators only)</Text>
                <Text size="sm" c="dimmed">
                  Manage user accounts, roles, and access. Only System Administrators can access
                  this section.
                </Text>
              </Stack>
            </Group>
            <Group gap="sm">
              <IconCopy size={18} />
              <Stack gap={0}>
                <Text fw={600}>Templates (administrators only)</Text>
                <Text size="sm" c="dimmed">
                  Create and manage reusable risk templates that can be applied when setting up
                  new registers. Helps standardise risk entries across the organisation.
                </Text>
              </Stack>
            </Group>
            <Group gap="sm">
              <IconHelp size={18} />
              <Stack gap={0}>
                <Text fw={600}>Help</Text>
                <Text size="sm" c="dimmed">
                  This documentation section. Covers all features of customRisk as well as
                  high-level guidance on risk management concepts.
                </Text>
              </Stack>
            </Group>
          </Stack>
        </Stack>
      </Paper>

      <Paper withBorder p="md" radius="sm">
        <Stack>
          <Title order={3}>Your profile</Title>
          <Text>
            Click your name in the top-right header to view and update your profile. From there you
            can change your display name and password.
          </Text>
        </Stack>
      </Paper>

      <Paper withBorder p="md" radius="sm">
        <Stack>
          <Title order={3}>Home Dashboard</Title>
          <Text>
            The <Text span fw={600}>Home</Text> page is your personal dashboard. It is designed to
            surface the risks that need your attention without requiring you to manually scan every
            register.
          </Text>
          <Divider />
          <Stack gap="sm">
            <Text fw={600}>Risks needing attention</Text>
            <Text>
              This panel lists all open risks that are assigned to you where the review is overdue
              or due within the next 30 days. Each item links directly to that risk — click it to
              open the risk detail panel in the relevant register without needing to navigate there
              manually.
            </Text>
            <Text fw={600}>Overdue count summary</Text>
            <Text>
              A summary count of how many of your assigned risks are currently overdue for review.
              This gives you a quick at-a-glance indicator of your review obligations across all
              registers.
            </Text>
            <Text fw={600}>Recent system events (System Administrators only)</Text>
            <Text>
              System Administrators see an additional panel showing the most recent audit events
              across the entire system — a live view of activity without needing to visit the full
              Audit log.
            </Text>
          </Stack>
          <Note>
            If you have no risks that are overdue or due soon, the dashboard will show a positive
            confirmation message rather than an empty panel. No news is good news.
          </Note>
        </Stack>
      </Paper>
    </Stack>
  );
}

// ─── Risk Management Concepts ────────────────────────────────────────────────

function RiskConceptsTab() {
  return (
    <Stack>
      <Paper withBorder p="md" radius="sm">
        <Text>
          This section provides a high-level introduction to risk management concepts. Understanding
          these ideas will help you use customRisk more effectively and contribute meaningfully to
          your organisation&apos;s risk culture.
        </Text>
      </Paper>

      <Accordion variant="separated" radius="sm">
        <Accordion.Item value="what-is-risk">
          <Accordion.Control>
            <Text fw={600}>What is a Risk?</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <Text>
                A <Text span fw={600}>risk</Text> is any event or condition that, if it occurs, could
                have a positive or negative effect on an objective. In most organisational contexts,
                risks are treated as potential negative outcomes — things that could go wrong and
                cause harm, loss, or disruption.
              </Text>
              <Text>
                Risks are distinct from issues: a risk has not happened yet, whereas an issue is
                something that has already occurred. Good risk management focuses on identifying and
                responding to risks <Text span fw={600}>before</Text> they become issues.
              </Text>
              <Tip>
                A well-written risk describes a cause, an event, and a consequence. For example:
                &quot;Due to reliance on a single supplier, a supply chain disruption could result
                in project delays of more than four weeks.&quot;
              </Tip>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="likelihood-impact">
          <Accordion.Control>
            <Text fw={600}>Likelihood and Impact</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <Text>
                Every risk is assessed against two dimensions:
              </Text>
              <List spacing="xs">
                <List.Item>
                  <Text span fw={600}>Likelihood</Text> — how probable is it that the risk will
                  occur? This is usually scored on a scale (e.g. 1–5, from Rare to Almost Certain).
                </List.Item>
                <List.Item>
                  <Text span fw={600}>Impact</Text> — if the risk does occur, how severe would the
                  consequences be? Scored on a similar scale (e.g. 1–5, from Negligible to Critical).
                </List.Item>
              </List>
              <Text>
                The combination of these two scores produces the{" "}
                <Text span fw={600}>Risk Level</Text>, sometimes called a risk rating or risk score.
                Most scoring models multiply the two values together to produce a composite score
                which maps to a category such as Low, Medium, High, or Critical.
              </Text>
              <Tip>
                The exact scoring scales and risk level thresholds are configurable per register in
                customRisk. Your administrator controls how scores map to risk levels.
              </Tip>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="risk-lifecycle">
          <Accordion.Control>
            <Text fw={600}>The Risk Lifecycle</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <Text>
                Risks move through a lifecycle from identification to closure. In customRisk, a risk
                can be in one of three states:
              </Text>
              <List spacing="xs">
                <List.Item>
                  <Badge color="gray" variant="light" mr="xs">Draft</Badge>
                  The risk has been created but is not yet active. Draft risks are not included in
                  review tracking or dashboard counts. Useful for risks that are still being assessed
                  before being formally opened.
                </List.Item>
                <List.Item>
                  <Badge color="blue" variant="light" mr="xs">Open</Badge>
                  The risk is active and being managed. Open risks are included in review tracking
                  and will appear as overdue if their review date passes.
                </List.Item>
                <List.Item>
                  <Badge color="green" variant="light" mr="xs">Closed</Badge>
                  The risk has been resolved, mitigated to an acceptable level, or is no longer
                  relevant. Closed risks are retained in the register for audit purposes but are
                  excluded from review tracking.
                </List.Item>
              </List>
              <Text>
                A risk&apos;s state is set when creating or editing the risk. The default state for
                new risks is configured per register by the administrator.
              </Text>
              <Tip>
                Closing a risk does not delete it. Closed risks remain visible in the register with
                their full history, which is important for governance and audit trails.
              </Tip>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="risk-reviews">
          <Accordion.Control>
            <Text fw={600}>Risk Reviews</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <Text>
                Open risks should be reviewed at regular intervals to confirm that their likelihood,
                impact, and mitigation details remain accurate. Each register has a configurable
                default review frequency (e.g. every 3 months). When a review is submitted, the
                next review date is automatically calculated from that frequency.
              </Text>
              <Text>Each risk displays a review status indicating where it sits in its review cycle:</Text>
              <List spacing="xs">
                <List.Item>
                  <Badge color="gray" variant="light" mr="xs">Not Reviewed</Badge>
                  The risk has never been reviewed since it was created.
                </List.Item>
                <List.Item>
                  <Badge color="green" variant="light" mr="xs">Not Due</Badge>
                  The risk has been reviewed and the next review date is not approaching yet.
                </List.Item>
                <List.Item>
                  <Badge color="yellow" variant="light" mr="xs">Due Soon</Badge>
                  The next review date is within 30 days.
                </List.Item>
                <List.Item>
                  <Badge color="red" variant="light" mr="xs">Overdue</Badge>
                  The next review date has passed without a completed review. Overdue risks are
                  highlighted on the Home dashboard.
                </List.Item>
              </List>
              <Note>
                If reviews are disabled for a register (configured by the administrator), risks in
                that register will not have a review status and are excluded from review tracking.
              </Note>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="risk-response">
          <Accordion.Control>
            <Text fw={600}>Risk Response Strategies</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <Text>
                Once a risk has been identified and assessed, the risk owner should determine the
                appropriate response strategy. Common strategies include:
              </Text>
              <List spacing="xs">
                <List.Item>
                  <Text span fw={600}>Avoid</Text> — change plans to eliminate the risk entirely
                  (e.g. stop an activity that introduces the risk).
                </List.Item>
                <List.Item>
                  <Text span fw={600}>Mitigate</Text> — take action to reduce the likelihood or
                  impact of the risk to an acceptable level.
                </List.Item>
                <List.Item>
                  <Text span fw={600}>Transfer</Text> — shift the risk to a third party, for
                  example through insurance or a contractual arrangement.
                </List.Item>
                <List.Item>
                  <Text span fw={600}>Accept</Text> — consciously decide to tolerate the risk
                  without further action, usually where the cost of mitigation outweighs the
                  potential impact.
                </List.Item>
              </List>
              <Text>
                Your response strategy and the actions you are taking should be captured in the
                risk&apos;s <Text span fw={600}>mitigation</Text> or treatment notes.
              </Text>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="risk-appetite">
          <Accordion.Control>
            <Text fw={600}>Risk Appetite and Tolerance</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <Text>
                <Text span fw={600}>Risk appetite</Text> is the level of risk an organisation is
                willing to accept in pursuit of its objectives. It is typically set by senior
                leadership and expressed as a policy or threshold.
              </Text>
              <Text>
                <Text span fw={600}>Risk tolerance</Text> is the acceptable variation around the
                risk appetite — the upper boundary beyond which a risk must be escalated or treated
                as urgent.
              </Text>
              <Text>
                In customRisk, risk levels (e.g. High, Critical) act as a proxy for risk appetite
                thresholds. Register administrators can configure the scoring model to align with
                their organisation&apos;s defined appetite.
              </Text>
              <Tip>
                A well-governed risk register makes risk appetite visible: if you have a large
                number of High or Critical risks that are simply &quot;accepted&quot; without
                treatment, that is a signal that your risk appetite may need to be revisited.
              </Tip>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="risk-register-concept">
          <Accordion.Control>
            <Text fw={600}>What is a Risk Register?</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <Text>
                A <Text span fw={600}>risk register</Text> is a structured record of all identified
                risks within a defined scope. It serves as the single source of truth for risk
                information and forms the foundation of an effective risk management process.
              </Text>
              <Text>A well-maintained risk register typically records:</Text>
              <List spacing="xs">
                <List.Item>A unique identifier and title for each risk</List.Item>
                <List.Item>A description of the cause, event, and potential consequence</List.Item>
                <List.Item>An assessment of likelihood and impact</List.Item>
                <List.Item>The assigned risk owner</List.Item>
                <List.Item>Current mitigation or treatment actions</List.Item>
                <List.Item>The next scheduled review date</List.Item>
                <List.Item>The history of previous reviews and changes</List.Item>
              </List>
              <Text>
                In customRisk, each register can be tailored with custom fields to capture any
                additional information specific to your organisation or context.
              </Text>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="inherent-residual-concept">
          <Accordion.Control>
            <Text fw={600}>Inherent and Residual Risk</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <Text>
                <Text span fw={600}>Inherent risk</Text> is the level of risk that exists before
                any controls or mitigating actions are applied. It represents the raw exposure if
                the organisation did nothing to manage the risk.
              </Text>
              <Text>
                <Text span fw={600}>Residual risk</Text> is the level of risk that remains after
                controls have been put in place. It reflects your actual current exposure given
                what you are already doing to manage the risk.
              </Text>
              <Text>
                Tracking both values is valuable because it quantifies the effectiveness of your
                controls. A large gap between inherent and residual risk indicates that controls
                are working well. A small gap — particularly on a high inherent risk — may indicate
                that current controls are insufficient and further treatment is needed.
              </Text>
              <Note>
                Inherent and residual risk scoring is optional in customRisk. It is enabled or
                disabled per register by the administrator. When disabled, only a single risk score
                is captured for each risk.
              </Note>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="governance-compliance">
          <Accordion.Control>
            <Text fw={600}>Governance and Compliance Context</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <Text>
                Risk management practice is shaped by frameworks such as{" "}
                <Text span fw={600}>ISO 31000</Text>, which provides principles and guidelines for
                managing risk across any organisation or sector. While frameworks like ISO 31000 do
                not prescribe a specific tool or process, they establish common vocabulary and a
                shared understanding of what good risk management looks like.
              </Text>
              <Text>
                Many organisations maintain a risk register not only as a management tool but as
                a compliance requirement — driven by regulatory obligations, contractual terms, or
                internal governance policies. In these contexts, the ability to demonstrate that
                risks have been actively reviewed and managed is as important as the risk data
                itself.
              </Text>
              <Text>
                customRisk supports this through its immutable audit trail. Every change to a risk,
                every completed review, and every configuration update is permanently recorded.
                This provides a verifiable record of due diligence that can support governance
                reviews, internal audits, or regulatory enquiries.
              </Text>
              <Note>
                customRisk does not assert compliance with ISO 31000 or any other specific
                standard. It is a tool designed to support good risk management practice —
                compliance with any particular framework depends on how it is configured and used
                within your organisation.
              </Note>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="risk-culture">
          <Accordion.Control>
            <Text fw={600}>Risk Culture</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <Text>
                <Text span fw={600}>Risk culture</Text> refers to the shared values, beliefs, and
                behaviours within an organisation that shape how people think about and respond to
                risk. Organisations with a strong risk culture treat risk management as a
                meaningful part of how they operate — not just an administrative obligation.
              </Text>
              <Text>
                Poor risk culture often manifests as risks being added to a register and then
                forgotten, reviews being completed perfunctorily without genuine reassessment, or
                ownership being assigned in name only. These patterns undermine the value of the
                risk management process regardless of how good the tooling is.
              </Text>
              <Text>
                customRisk supports healthy risk culture through two mechanisms. First, ownership
                visibility — every risk has a named owner, and overdue reviews surface prominently
                on that person&apos;s dashboard, making accountability visible. Second, review
                tracking — the complete history of who reviewed a risk, when, and what they said
                creates a record that encourages meaningful engagement rather than checkbox
                completion.
              </Text>
              <Tip>
                Treat each risk review as a genuine checkpoint: does this risk still apply? Has
                anything changed that affects its likelihood or impact? Are the mitigation actions
                still relevant and being followed through? A review that confirms nothing has
                changed is still a valuable review — the important thing is that it was done
                deliberately.
              </Tip>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Stack>
  );
}

// ─── Registers ───────────────────────────────────────────────────────────────

function RegistersTab() {
  return (
    <Stack>
      <Paper withBorder p="md" radius="sm">
        <Text>
          A register in customRisk is a scoped collection of risks. You might have one register per
          project, per team, per business unit, or per compliance framework — whatever makes sense
          for your organisation.
        </Text>
      </Paper>

      <Accordion variant="separated" radius="sm">
        <Accordion.Item value="viewing-registers">
          <Accordion.Control>
            <Text fw={600}>Viewing Registers</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <Text>
                Navigate to <Text span fw={600}>Registers</Text> in the left-hand menu to see all
                registers you have access to. Each register card shows the register name and your
                current role within it.
              </Text>
              <Text>
                Click on a register name to open it. The register detail view is organised into tabs:
              </Text>
              <List spacing="xs">
                <List.Item>
                  <Text span fw={600}>Risks</Text> — the main risk table for this register. All
                  open and closed risks are visible here.
                </List.Item>
                <List.Item>
                  <Text span fw={600}>Configuration</Text> (admin only) — manage the register&apos;s
                  name, custom fields, scoring model, and settings.
                </List.Item>
                <List.Item>
                  <Text span fw={600}>Permissions</Text> (admin only) — manage which users have
                  access to this register and what role they hold.
                </List.Item>
                <List.Item>
                  <Text span fw={600}>Audit</Text> (admin only) — the full change history for this
                  register.
                </List.Item>
              </List>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="creating-registers">
          <Accordion.Control>
            <Text fw={600}>Creating a Register (Administrator)</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <Text>
                Only System Administrators can create new registers. From the Registers page, click{" "}
                <Text span fw={600}>Create register</Text> and follow the setup wizard. You will be
                prompted to provide:
              </Text>
              <List spacing="xs">
                <List.Item>A name and optional description for the register</List.Item>
                <List.Item>Initial scoring configuration (likelihood and impact scales)</List.Item>
                <List.Item>Any custom fields specific to your register</List.Item>
              </List>
              <Note>
                You can always change the register configuration after creation. Changing the scoring
                model will affect how existing risk scores are calculated and displayed going forward.
              </Note>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="register-config">
          <Accordion.Control>
            <Text fw={600}>Register Configuration</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <SectionHeading>Settings</SectionHeading>
              <Text>
                The Settings tab under Configuration allows you to rename the register and update its
                description.
              </Text>
              <Divider />
              <SectionHeading>Custom Fields</SectionHeading>
              <Text>
                Every register can have its own set of custom fields in addition to the standard risk
                fields. Custom fields allow you to capture organisation-specific information such as
                regulatory category, business owner, or treatment cost.
              </Text>
              <Text>Supported field types include:</Text>
              <List spacing="xs">
                <List.Item><Text span fw={600}>Text</Text> — free-form short text</List.Item>
                <List.Item><Text span fw={600}>Text area</Text> — longer free-form text</List.Item>
                <List.Item><Text span fw={600}>Number</Text> — numeric values</List.Item>
                <List.Item><Text span fw={600}>Date</Text> — date picker</List.Item>
                <List.Item><Text span fw={600}>Select</Text> — single choice from a defined list</List.Item>
                <List.Item><Text span fw={600}>Multi-select</Text> — multiple choices from a defined list</List.Item>
                <List.Item><Text span fw={600}>User</Text> — select a user from the system</List.Item>
                <List.Item><Text span fw={600}>Checkbox</Text> — true/false toggle</List.Item>
              </List>
              <Divider />
              <SectionHeading>Scoring</SectionHeading>
              <Text>
                The scoring model defines how likelihood and impact values map to a risk level. You
                can configure the number of levels, the labels, and the thresholds that determine
                when a risk is classified as Low, Medium, High, or Critical.
              </Text>
              <Tip>
                Align your scoring model with your organisation&apos;s existing risk framework if
                one exists — this makes it easier for users to apply their existing judgement to
                the scoring scales.
              </Tip>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="draft-config">
          <Accordion.Control>
            <Text fw={600}>Draft Configuration and Edit Mode</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <Text>
                When the version-controlled configuration feature is enabled, register configuration
                is protected by a <Text span fw={600}>draft and publish workflow</Text>. You cannot
                edit configuration directly — all changes must first be staged in a draft, reviewed,
                and then explicitly published before they affect the live register and its risks.
              </Text>
              <Text>
                This exists because configuration changes can have significant downstream effects on
                existing risks. For example, changing the scoring model will cause every open risk
                to have its risk level recalculated. The draft workflow gives administrators the
                opportunity to understand that impact before committing to it.
              </Text>

              <Divider label="The two states" labelPosition="left" />

              <Text>
                A register&apos;s configuration is always in one of two states:
              </Text>
              <List spacing="xs">
                <List.Item>
                  <Text span fw={600}>Locked (no draft)</Text> — the Configuration tab is visible
                  but all editing controls are disabled. The current published configuration is
                  shown for reference only. A banner at the top displays the current published
                  version number.
                </List.Item>
                <List.Item>
                  <Text span fw={600}>Edit mode (draft active)</Text> — a draft has been created
                  and the configuration tabs are fully editable. A yellow banner at the top warns
                  that changes are not yet published and will not affect the live register until
                  you do so.
                </List.Item>
              </List>

              <Divider label="Creating a draft" labelPosition="left" />

              <Text>
                Click <Text span fw={600}>Create Draft</Text> in the configuration banner to enter
                edit mode. This creates a copy of the current published configuration as a new
                draft. The live configuration is completely untouched — everything you edit from
                this point affects the draft only.
              </Text>
              <Note>
                Only one draft can exist at a time for a given register. If a draft already
                exists, the Create Draft button is unavailable. This prevents two administrators
                from making conflicting changes simultaneously.
              </Note>

              <Divider label="Making changes" labelPosition="left" />

              <Text>
                While a draft is active, all changes made in the Settings, Custom Fields, and
                Scoring tabs are saved to the draft. Users viewing the register&apos;s risks see
                the live configuration — they are completely unaffected by anything in the draft
                until it is published.
              </Text>

              <Divider label="Impact analysis" labelPosition="left" />

              <Text>
                Before publishing, it is strongly recommended to run an{" "}
                <Text span fw={600}>Impact Analysis</Text>. This examines the differences between
                the draft and the live configuration and reports:
              </Text>
              <List spacing="xs">
                <List.Item>
                  <Text span fw={600}>Blockers</Text> — errors that will prevent publishing
                  entirely, such as having no active likelihood values, no active impact values,
                  or no active risk levels. These must be resolved before the draft can be
                  published.
                </List.Item>
                <List.Item>
                  <Text span fw={600}>Warnings</Text> — non-blocking changes that will affect
                  existing risks. For example, if you deactivate a likelihood value that is
                  currently in use, the analysis reports how many risks will have that value
                  cleared on publish. Warnings do not stop you from publishing, but you should
                  understand their consequences before proceeding.
                </List.Item>
                <List.Item>
                  <Text span fw={600}>Affected risk counts</Text> — a breakdown of how many
                  existing risks will be affected by deactivated likelihood values, impact values,
                  or custom fields.
                </List.Item>
              </List>
              <Tip>
                Always run impact analysis before publishing a draft that modifies the scoring
                model or deactivates custom fields. Changes to the risk matrix will trigger an
                automatic recalculation of the risk level for every open risk in the register.
              </Tip>

              <Divider label="Publishing" labelPosition="left" />

              <Text>
                Click <Text span fw={600}>Publish</Text> to make the draft live. Publishing is
                an all-or-nothing operation — either all changes go live or none do. During
                publish, the system:
              </Text>
              <List spacing="xs">
                <List.Item>Applies all configuration changes from the draft to the live register</List.Item>
                <List.Item>
                  Recalculates the risk level for every open risk using the new scoring matrix —
                  risks may move between risk levels as a result
                </List.Item>
                <List.Item>
                  Deactivates any scoring values or custom fields that were removed in the draft
                  (existing risk data using those values is cleared)
                </List.Item>
                <List.Item>Records the published configuration as a new numbered version in the audit history</List.Item>
              </List>
              <Text>
                After a successful publish, the configuration returns to the locked state showing
                the new version number. The previous published version is retained in the audit
                history.
              </Text>

              <Divider label="Discarding a draft" labelPosition="left" />

              <Alert icon={<IconAlertTriangle size={16} />} color="yellow" variant="light" radius="sm">
                Clicking <Text span fw={600}>Discard Draft</Text> permanently deletes the draft
                and all changes within it. This cannot be undone. The configuration reverts to
                the last published version.
              </Alert>

              <Divider label="Drafts and templates" labelPosition="left" />

              <Text>
                When you apply a template update to a register (via the template link panel in
                the Configuration tab), the system creates a draft pre-populated with the
                template&apos;s configuration. This draft follows exactly the same workflow as
                a manually created draft — you can review and modify it before publishing, or
                discard it if you change your mind. Applying a template update requires that no
                draft already exists.
              </Text>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="register-permissions">
          <Accordion.Control>
            <Text fw={600}>Register Permissions</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <Text>
                Access to each register is controlled at the user level. Under the Permissions tab
                of a register, System Administrators can assign users one of the following roles:
              </Text>
              <List spacing="xs">
                <List.Item>
                  <Text span fw={600}>Viewer</Text> — can view risks but cannot create or edit them.
                </List.Item>
                <List.Item>
                  <Text span fw={600}>Editor</Text> — can create, edit, and review risks.
                </List.Item>
                <List.Item>
                  <Text span fw={600}>Admin</Text> — full access including register configuration
                  and permissions management.
                </List.Item>
              </List>
              <Note>
                System Administrators have implicit access to all registers regardless of whether
                they have been explicitly assigned a role.
              </Note>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="config-export-import">
          <Accordion.Control>
            <Text fw={600}>Configuration Export and Import</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <Text>
                A register&apos;s published configuration can be exported as a JSON file from the{" "}
                <Text span fw={600}>Configuration</Text> tab. The exported file contains the
                complete configuration snapshot — custom fields, scoring model, risk levels, and
                settings — and is the same format used by the Templates feature.
              </Text>
              <Text>
                This exported JSON can be used as the basis for a new template. Navigate to
                Templates, create a new template, and upload the file. From there the template can
                be used to create new registers with the same configuration, or shared with another
                instance of customRisk.
              </Text>
              <Note>
                Importing a configuration file does not directly apply it to an existing register.
                The import flow creates or updates a template — from which a new register can be
                created, or from which an update can be applied to a linked register via the
                standard draft and publish workflow.
              </Note>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="soft-delete">
          <Accordion.Control>
            <Text fw={600}>Archiving a Register</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <Text>
                Registers can be soft-deleted (archived) by System Administrators. An archived
                register and all its risks are removed from the active view but are retained in
                the system for audit and reporting purposes.
              </Text>
              <Alert icon={<IconAlertTriangle size={16} />} color="yellow" variant="light" radius="sm">
                Archiving a register is a significant action. All risks within the register will
                become inaccessible to users. Contact your System Administrator if you need a
                register restored.
              </Alert>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Stack>
  );
}

// ─── Managing Risks ───────────────────────────────────────────────────────────

function ManagingRisksTab() {
  return (
    <Stack>
      <Paper withBorder p="md" radius="sm">
        <Text>
          This section covers the day-to-day activities involved in creating, updating, and
          reviewing risks within a register.
        </Text>
      </Paper>

      <Accordion variant="separated" radius="sm">
        <Accordion.Item value="creating-risk">
          <Accordion.Control>
            <Text fw={600}>Creating a Risk</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <Text>
                From within a register, click <Text span fw={600}>Add risk</Text> to open the risk
                creation form. The following standard fields are available on every risk:
              </Text>
              <List spacing="xs">
                <List.Item>
                  <Text span fw={600}>Title</Text> — a short, descriptive name for the risk.
                </List.Item>
                <List.Item>
                  <Text span fw={600}>Description</Text> — a fuller explanation of the cause, event,
                  and potential consequence.
                </List.Item>
                <List.Item>
                  <Text span fw={600}>Likelihood</Text> — how likely is the risk to occur?
                </List.Item>
                <List.Item>
                  <Text span fw={600}>Impact</Text> — how severe would the consequence be?
                </List.Item>
                <List.Item>
                  <Text span fw={600}>Owner</Text> — the person responsible for managing this risk.
                </List.Item>
                <List.Item>
                  <Text span fw={600}>Next review date</Text> — when this risk should next be
                  formally reviewed.
                </List.Item>
                <List.Item>
                  <Text span fw={600}>Mitigation</Text> — what actions are being taken to address
                  the risk.
                </List.Item>
              </List>
              <Text>
                Any custom fields configured for the register will also appear in the form.
              </Text>
              <Tip>
                A well-written risk title is concise but specific. Avoid vague titles like
                &quot;Financial risk&quot; — prefer something like &quot;Budget overrun due to
                unplanned contractor costs&quot;.
              </Tip>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="editing-risk">
          <Accordion.Control>
            <Text fw={600}>Editing a Risk</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <Text>
                To edit a risk, click its row in the risk table to open the risk detail panel, then
                click the <Text span fw={600}>Edit</Text> button. This opens the full edit form for
                that risk.
              </Text>
              <Text>
                All standard fields — title, description, likelihood, impact, owner, next review
                date, and mitigation — are editable, as are any custom fields configured for the
                register. Edits are subject to your permissions: Editor and Admin roles can edit
                all fields, while Viewers cannot make changes.
              </Text>
              <Text>
                Changing the likelihood or impact values will immediately recalculate the risk
                level using the register&apos;s current scoring model. The updated risk level is
                reflected as soon as the change is saved.
              </Text>
              <Note>
                All edits are recorded in the audit trail. The previous values are captured in
                the audit log so the full change history is always available.
              </Note>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="deleting-risk">
          <Accordion.Control>
            <Text fw={600}>Deleting a Risk</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <Alert icon={<IconAlertTriangle size={16} />} color="yellow" variant="light" radius="sm">
                Deleting a risk is permanent and cannot be undone. Only register Admins and System
                Administrators can delete risks.
              </Alert>
              <Text>
                Before deletion, a full snapshot of the risk — including all its fields, scoring,
                and review history — is recorded in the audit log. This ensures that evidence of
                the risk&apos;s existence and management is never lost, even after the risk itself
                has been removed.
              </Text>
              <Tip>
                In most cases, closing a risk is preferable to deleting it. A closed risk remains
                visible in the register with its full history intact, and is excluded from review
                tracking without losing any of its information. Reserve deletion for cases where a
                risk was created in error.
              </Tip>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="risk-detail-panel">
          <Accordion.Control>
            <Text fw={600}>The Risk Detail Panel</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <Text>
                Clicking any row in the risk table opens the <Text span fw={600}>risk detail panel</Text> —
                a slide-out drawer that shows the full information for that risk without leaving the
                register view.
              </Text>
              <Text>The panel displays:</Text>
              <List spacing="xs">
                <List.Item>All standard fields: title, description, owner, status, likelihood, impact, mitigation, and next review date</List.Item>
                <List.Item>Any custom fields configured for the register</List.Item>
                <List.Item>The calculated risk level, displayed with its colour indicator</List.Item>
                <List.Item>The current review status and next review date</List.Item>
                <List.Item>The complete review history — each entry shows who submitted the review, when, any comment left, and the next review date that was set</List.Item>
              </List>
              <Text>
                From the panel you can click <Text span fw={600}>Review</Text> to submit a new
                review, or <Text span fw={600}>Edit</Text> to open the full edit form. Close the
                panel by clicking anywhere outside it or pressing{" "}
                <Text span ff="monospace">Escape</Text>.
              </Text>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="risk-id">
          <Accordion.Control>
            <Text fw={600}>Risk IDs</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <Text>
                Each risk is automatically assigned a unique display ID within its register (e.g.{" "}
                <Text span ff="monospace">RISK-001</Text>). This ID is stable and can be used to
                reference a specific risk in conversations, reports, or other documentation.
              </Text>
              <Note>
                The display ID prefix is derived from the register name and cannot be changed after
                the register is created.
              </Note>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="risk-levels">
          <Accordion.Control>
            <Text fw={600}>Risk Levels</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <Text>
                The risk level is automatically calculated from the combination of likelihood and
                impact scores, using the scoring model configured for the register. Common levels are:
              </Text>
              <Group gap="xs">
                <Badge color="green">Low</Badge>
                <Badge color="yellow">Medium</Badge>
                <Badge color="orange">High</Badge>
                <Badge color="red">Critical</Badge>
              </Group>
              <Text>
                The colour coding and thresholds for these levels are set by the register
                administrator and should reflect your organisation&apos;s risk appetite.
              </Text>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="inherent-residual-risks">
          <Accordion.Control>
            <Text fw={600}>Inherent and Residual Risk</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <Text>
                When a register is configured to use inherent and residual risk scoring, the risk
                creation and edit form shows two separate scoring sections: one for the{" "}
                <Text span fw={600}>inherent risk</Text> (before controls) and one for the{" "}
                <Text span fw={600}>residual risk</Text> (after controls). Each section has its
                own likelihood and impact fields, and each produces its own calculated risk level.
              </Text>
              <Text>
                Both risk levels are displayed in the risk table, allowing you to see at a glance
                both your raw exposure and your managed exposure for each risk.
              </Text>
              <Note>
                Inherent and residual risk scoring is optional and is configured by the register
                administrator. If only a single risk score is shown in the form and the risk table,
                this mode is not enabled for your register.
              </Note>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="reviewing-risk">
          <Accordion.Control>
            <Text fw={600}>Reviewing a Risk</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <Text>
                Users with edit access can submit a review from the risk detail panel by clicking
                the <Text span fw={600}>Review</Text> button. The review form asks you to:
              </Text>
              <List spacing="xs">
                <List.Item>
                  Read and confirm the register&apos;s review attestation statement (this text is
                  configured per register by the administrator)
                </List.Item>
                <List.Item>Optionally add a comment about the review</List.Item>
              </List>
              <Text>
                On submission, the next review date is automatically calculated based on the
                register&apos;s default review frequency. You do not set the next review date
                manually — it is derived from the register configuration.
              </Text>
              <Text>
                Each completed review is recorded in the risk&apos;s review history, showing who
                reviewed it, when, any comment left, and the next review date that was set.
              </Text>
              <Note>
                Submitting a review does not change the risk&apos;s state or any of its fields. If
                you need to update the likelihood, impact, or other details, edit the risk
                separately before or after completing the review.
              </Note>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="my-risks">
          <Accordion.Control>
            <Text fw={600}>My Risks</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <Text>
                The <Text span fw={600}>My Risks</Text> page provides a single view of all risks
                assigned to you across every register you have access to. This is particularly
                useful if you own risks across multiple registers.
              </Text>
              <Text>
                From My Risks you can open any risk to view its detail, submit a review, or update
                its information — without needing to navigate to each register separately.
              </Text>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="filtering-sorting">
          <Accordion.Control>
            <Text fw={600}>Filtering and Sorting Risks</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <Text>
                The risk table within a register supports filtering and sorting to help you focus
                on what matters:
              </Text>
              <List spacing="xs">
                <List.Item>Filter by risk level, owner, review status, or any custom field</List.Item>
                <List.Item>Sort by any column (click the column header)</List.Item>
                <List.Item>
                  Use the column picker to show or hide columns, including custom fields
                </List.Item>
              </List>
              <Text>
                Filters are applied in combination — for example, you can filter to show only{" "}
                <Text span fw={600}>High</Text> risks that are{" "}
                <Text span fw={600}>overdue for review</Text>.
              </Text>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
        <Accordion.Item value="export-csv">
          <Accordion.Control>
            <Text fw={600}>Exporting Risks as CSV</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <Text>
                The risk table toolbar includes an <Text span fw={600}>Export</Text> button that
                downloads the current view as a CSV file. The export respects any filters that are
                currently active — only the risks visible in the table at the time of export are
                included in the file.
              </Text>
              <Text>
                This means you can use filters to scope your export before downloading. For
                example, filter to show only High and Critical risks that are overdue for review,
                then export — the CSV will contain only those risks.
              </Text>
              <Text>
                The exported CSV can be opened in any spreadsheet application such as Microsoft
                Excel or Google Sheets for offline analysis or reporting.
              </Text>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Stack>
  );
}

// ─── Users & Permissions ─────────────────────────────────────────────────────

function UsersPermissionsTab() {
  return (
    <Stack>
      <Paper withBorder p="md" radius="sm">
        <Text>
          customRisk uses a role-based access control model. Access is controlled at two levels:
          system-wide and per-register.
        </Text>
      </Paper>

      <Accordion variant="separated" radius="sm">
        <Accordion.Item value="system-roles">
          <Accordion.Control>
            <Text fw={600}>System Roles</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <Text>
                Every user has one of the following system-level roles:
              </Text>
              <List spacing="xs">
                <List.Item>
                  <Group gap="xs" wrap="nowrap">
                    <Badge>System Admin</Badge>
                    <Text size="sm">
                      Full access to all registers, users, audit logs, and configuration. Can create
                      and delete registers, manage all users, and access all features.
                    </Text>
                  </Group>
                </List.Item>
                <List.Item>
                  <Group gap="xs" wrap="nowrap">
                    <Badge variant="light" color="gray">Standard User</Badge>
                    <Text size="sm">
                      Access is determined entirely by register-level permissions. A standard user
                      with no register assignments will see an empty Registers list.
                    </Text>
                  </Group>
                </List.Item>
              </List>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="register-roles">
          <Accordion.Control>
            <Text fw={600}>Register Roles</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <Text>
                Within each register, users can be assigned one of three roles:
              </Text>
              <List spacing="xs">
                <List.Item>
                  <Group gap="xs" align="flex-start" wrap="nowrap">
                    <Badge color="gray" variant="light">Viewer</Badge>
                    <Text size="sm">
                      Can see risks and their details but cannot make any changes. Suitable for
                      stakeholders who need visibility without edit access.
                    </Text>
                  </Group>
                </List.Item>
                <List.Item>
                  <Group gap="xs" align="flex-start" wrap="nowrap">
                    <Badge color="blue" variant="light">Editor</Badge>
                    <Text size="sm">
                      Can create new risks, edit existing risks, and submit reviews. This is the
                      standard role for risk owners and contributors.
                    </Text>
                  </Group>
                </List.Item>
                <List.Item>
                  <Group gap="xs" align="flex-start" wrap="nowrap">
                    <Badge color="violet" variant="light">Admin</Badge>
                    <Text size="sm">
                      Full control over the register including configuration, custom fields, scoring,
                      and permissions. Can also delete risks.
                    </Text>
                  </Group>
                </List.Item>
              </List>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="managing-users">
          <Accordion.Control>
            <Text fw={600}>Managing Users (Administrator)</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <Text>
                System Administrators can manage users from the{" "}
                <Text span fw={600}>Users</Text> section in the navigation. From here you can:
              </Text>
              <List spacing="xs">
                <List.Item>Create new user accounts</List.Item>
                <List.Item>Edit a user&apos;s name, email address, or password</List.Item>
                <List.Item>Grant or revoke System Administrator access</List.Item>
                <List.Item>Deactivate accounts for users who have left the organisation</List.Item>
              </List>
              <Note>
                Deactivating a user prevents them from logging in but does not remove their
                history from the system. Any risks they own will retain them as the owner until
                reassigned.
              </Note>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="assigning-register-access">
          <Accordion.Control>
            <Text fw={600}>Assigning Register Access</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <Text>
                To give a user access to a register, navigate to the register and open the{" "}
                <Text span fw={600}>Permissions</Text> tab. From here, search for the user and
                assign them the appropriate role.
              </Text>
              <Text>
                Access can be removed at any time by removing the user from the register&apos;s
                permissions list. Removing access does not affect the user&apos;s history within
                that register.
              </Text>
              <Tip>
                It is good practice to review register permissions regularly — especially when
                team members change roles or leave the organisation.
              </Tip>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Stack>
  );
}

// ─── Audit & Reporting ───────────────────────────────────────────────────────

// ─── Templates ───────────────────────────────────────────────────────────────

function TemplatesTab() {
  return (
    <Stack>
      <Paper withBorder p="md" radius="sm">
        <Stack>
          <Text>
            Templates allow System Administrators to save a complete register configuration —
            including custom fields, scoring model, risk levels, and settings — and reuse it when
            creating new registers. This ensures consistency across registers that share the same
            structure or governance framework.
          </Text>
          <Note>
            The Templates feature is only available to System Administrators and must be enabled
            via a feature flag. If you do not see a Templates option in the navigation, this
            feature is not currently enabled in your environment.
          </Note>
        </Stack>
      </Paper>

      <Accordion variant="separated" radius="sm">
        <Accordion.Item value="what-is-template">
          <Accordion.Control>
            <Text fw={600}>What Does a Template Contain?</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <Text>
                A template stores a complete snapshot of a register&apos;s configuration at a point
                in time. This includes:
              </Text>
              <List spacing="xs">
                <List.Item>Register settings (risk ID format, default risk state, review frequency, attestation text)</List.Item>
                <List.Item>All custom field definitions (field type, labels, options, validation rules)</List.Item>
                <List.Item>The full scoring model — likelihood values, impact values, and risk level thresholds</List.Item>
                <List.Item>The risk matrix — the cell-by-cell mapping of likelihood × impact to risk level</List.Item>
              </List>
              <Text>
                Templates do <Text span fw={600}>not</Text> contain any risk data. They capture
                structure and configuration only.
              </Text>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="creating-template">
          <Accordion.Control>
            <Text fw={600}>Creating a Template</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <Text>
                There are two ways to create a template:
              </Text>
              <List spacing="xs">
                <List.Item>
                  <Text span fw={600}>From the Templates page</Text> — upload a JSON configuration
                  file and give the template a name and optional description. The uploaded file
                  becomes version 1 of the template, published immediately.
                </List.Item>
                <List.Item>
                  <Text span fw={600}>From an existing register</Text> — within a register&apos;s
                  Configuration tab, you can save its current configuration as a new template.
                  This also automatically links that register to the new template.
                </List.Item>
              </List>
              <Tip>
                The easiest way to get a valid configuration file is to configure one register
                manually to your desired standard, then create a template from it. You can then
                use that template for all future registers with the same structure.
              </Tip>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="template-versions">
          <Accordion.Control>
            <Text fw={600}>Template Versions</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <Text>
                Templates are versioned. When you update a template&apos;s configuration, a new
                version is published (v2, v3, and so on). Each version is a complete configuration
                snapshot — not a diff.
              </Text>
              <Text>
                Publishing a new template version does <Text span fw={600}>not</Text> automatically
                update any registers that were created from an earlier version. Registers remain on
                the version they were linked to until an administrator explicitly applies the update.
              </Text>
              <Note>
                Only the template&apos;s name and description can be edited in place. To change the
                configuration, you must publish a new version by uploading an updated config file.
              </Note>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="register-from-template">
          <Accordion.Control>
            <Text fw={600}>Creating a Register from a Template</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <Text>
                From the Templates page, click <Text span fw={600}>Create register</Text> on the
                template you want to use. You will be asked to supply a name for the new register.
                All configuration from the template&apos;s latest published version is copied
                across automatically.
              </Text>
              <Text>
                The new register is linked to the template version it was created from. This link
                is visible in the register&apos;s Configuration tab and allows administrators to
                track whether the register is up to date with the latest template version.
              </Text>
              <Tip>
                When creating a register from a template, the register&apos;s configuration is
                an independent copy. Changes you make to the register later will not affect the
                template, and changes to the template will not automatically affect the register.
              </Tip>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="template-link">
          <Accordion.Control>
            <Text fw={600}>Template Linking and Updates</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <Text>
                Registers created from a template maintain a link back to the template version
                they were built from. In the register&apos;s Configuration tab, administrators
                can see:
              </Text>
              <List spacing="xs">
                <List.Item>Which template and version the register is linked to</List.Item>
                <List.Item>Whether the register is on the latest published version of the template</List.Item>
              </List>
              <Text>
                If the template has been updated since the register was created, two additional
                actions become available:
              </Text>
              <List spacing="xs">
                <List.Item>
                  <Text span fw={600}>Compare</Text> — shows a detailed diff between the
                  register&apos;s current configuration and the latest template version, including
                  which custom fields, scoring values, or settings have changed.
                </List.Item>
                <List.Item>
                  <Text span fw={600}>Apply latest</Text> — creates a draft configuration for the
                  register based on the latest template version. The draft must be reviewed and
                  published before it takes effect. This gives administrators a chance to review
                  the changes before they become live.
                </List.Item>
              </List>
              <Text>
                A register can also be <Text span fw={600}>unlinked</Text> from its template
                (System Administrators only). The register retains its current configuration but
                is no longer tracked against template versions.
              </Text>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="deactivating-template">
          <Accordion.Control>
            <Text fw={600}>Deactivating a Template</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <Text>
                Templates can be deactivated when they are no longer needed. A deactivated template
                cannot be used to create new registers, but existing registers that are linked to it
                are not affected — they retain their configuration and can still compare against the
                template&apos;s versions.
              </Text>
              <Alert icon={<IconAlertTriangle size={16} />} color="yellow" variant="light" radius="sm">
                Deactivating a template is not reversible through the UI. Contact your system
                administrator if a template needs to be reinstated.
              </Alert>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Stack>
  );
}

// ─── Audit & Export ───────────────────────────────────────────────────────────

function AuditExportTab() {
  return (
    <Stack>
      <Paper withBorder p="md" radius="sm">
        <Text>
          customRisk maintains a complete, immutable audit trail of all changes made to risks,
          registers, users, and configuration. This supports governance, compliance, and
          accountability requirements.
        </Text>
      </Paper>

      <Accordion variant="separated" radius="sm">
        <Accordion.Item value="audit-log">
          <Accordion.Control>
            <Text fw={600}>The Audit Log</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <Text>
                The <Text span fw={600}>Audit</Text> section (System Administrators only) provides
                a system-wide log of every action taken across all registers. Each entry shows:
              </Text>
              <List spacing="xs">
                <List.Item>The type of event (e.g. risk created, risk updated, user deactivated)</List.Item>
                <List.Item>The user who performed the action</List.Item>
                <List.Item>The date and time of the action</List.Item>
                <List.Item>The affected register and risk (where applicable)</List.Item>
                <List.Item>A summary of what changed</List.Item>
              </List>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="register-audit">
          <Accordion.Control>
            <Text fw={600}>Per-Register Audit History</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <Text>
                Each register has its own audit tab, visible to register admins. This shows the
                full change history for that specific register — all risk changes, configuration
                updates, and permission changes scoped to that register.
              </Text>
              <Text>
                You can also view the audit history of a specific risk by opening the risk detail
                panel and scrolling to the review history section.
              </Text>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="audit-filtering">
          <Accordion.Control>
            <Text fw={600}>Filtering Audit Events</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <Text>
                The audit log can be filtered by:
              </Text>
              <List spacing="xs">
                <List.Item>Event type (e.g. show only risk reviews)</List.Item>
                <List.Item>User (e.g. show only events performed by a specific person)</List.Item>
                <List.Item>Register (system-wide audit only)</List.Item>
                <List.Item>Date range</List.Item>
              </List>
              <Text>
                Use these filters when investigating a specific change or preparing for a
                governance review.
              </Text>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="audit-export">
          <Accordion.Control>
            <Text fw={600}>Exporting Audit Data</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <Text>
                The audit log supports CSV export. Use the filters to scope the audit log to the
                events you need — by event type, user, register, or date range — then click the
                export button to download the filtered result as a CSV file.
              </Text>
              <Text>
                This is particularly useful for governance reviews and compliance reporting, where
                you may need to provide evidence of activity over a specific period or for a
                specific register. The exported data reflects the immutable audit record exactly
                as it exists in the system — it cannot be edited after export.
              </Text>
              <Tip>
                Apply date range and register filters before exporting to keep the output focused
                and manageable. Exporting without filters on a large or long-running system can
                produce a very large file.
              </Tip>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="immutability">
          <Accordion.Control>
            <Text fw={600}>Immutability and Integrity</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <Text>
                Audit log entries cannot be edited or deleted. This ensures the integrity of the
                record and means the audit trail can be relied upon for compliance and governance
                purposes.
              </Text>
              <Text>
                Closed risks and archived registers are also retained in the system — they are
                never permanently deleted — so their history remains accessible.
              </Text>
              <Note>
                If your organisation has specific data retention requirements, speak to your System
                Administrator about data management policies.
              </Note>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Stack>
  );
}

// ─── Page root ────────────────────────────────────────────────────────────────

export function HelpPage() {
  return (
    <Stack>
      <Group>
        <ThemeIcon size="lg" variant="light" color="blue">
          <IconHelp size={20} />
        </ThemeIcon>
        <Stack gap={0}>
          <Title order={1}>Help &amp; Documentation</Title>
          <Text c="dimmed">Guidance on using customRisk and understanding risk management concepts.</Text>
        </Stack>
      </Group>

      <Tabs defaultValue="getting-started" keepMounted={false}>
        <Tabs.List mb="md" grow>
          <Tabs.Tab value="getting-started">Getting Started</Tabs.Tab>
          <Tabs.Tab value="concepts">Risk Concepts</Tabs.Tab>
          <Tabs.Tab value="registers">Registers</Tabs.Tab>
          <Tabs.Tab value="risks">Managing Risks</Tabs.Tab>
          <Tabs.Tab value="users">Users</Tabs.Tab>
          <Tabs.Tab value="templates">Templates</Tabs.Tab>
          <Tabs.Tab value="audit">Audit &amp; Export</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="getting-started"><GettingStartedTab /></Tabs.Panel>
        <Tabs.Panel value="concepts"><RiskConceptsTab /></Tabs.Panel>
        <Tabs.Panel value="registers"><RegistersTab /></Tabs.Panel>
        <Tabs.Panel value="risks"><ManagingRisksTab /></Tabs.Panel>
        <Tabs.Panel value="users"><UsersPermissionsTab /></Tabs.Panel>
        <Tabs.Panel value="templates"><TemplatesTab /></Tabs.Panel>
        <Tabs.Panel value="audit"><AuditExportTab /></Tabs.Panel>
      </Tabs>
    </Stack>
  );
}
