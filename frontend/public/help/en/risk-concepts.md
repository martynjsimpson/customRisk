# Risk Management Concepts

This section provides a high-level introduction to risk management concepts. Understanding these ideas will help you use customRisk more effectively and contribute meaningfully to your organisation's risk culture.

## What is a Risk?

A **risk** is any event or condition that, if it occurs, could have a positive or negative effect on an objective. In most organisational contexts, risks are treated as potential negative outcomes — things that could go wrong and cause harm, loss, or disruption.

Risks are distinct from issues: a risk has not happened yet, whereas an issue is something that has already occurred. Good risk management focuses on identifying and responding to risks **before** they become issues.

> **Tip:** A well-written risk describes a cause, an event, and a consequence. For example: "Due to reliance on a single supplier, a supply chain disruption could result in project delays of more than four weeks."

## Likelihood and Impact

Every risk is assessed against two dimensions:

- **Likelihood** — how probable is it that the risk will occur? This is usually scored on a scale (e.g. 1–5, from Rare to Almost Certain).
- **Impact** — if the risk does occur, how severe would the consequences be? Scored on a similar scale (e.g. 1–5, from Negligible to Critical).

The combination of these two scores produces the **Risk Level**, sometimes called a risk rating or risk score. Most scoring models multiply the two values together to produce a composite score which maps to a category such as Low, Medium, High, or Critical.

> **Tip:** The exact scoring scales and risk level thresholds are configurable per register in customRisk. Your administrator controls how scores map to risk levels.

## The Risk Lifecycle

Risks move through a lifecycle from identification to closure. In customRisk, a risk can be in one of three states:

- **Draft** — The risk has been created but is not yet active. Draft risks are not included in review tracking or dashboard counts. Useful for risks that are still being assessed before being formally opened.
- **Open** — The risk is active and being managed. Open risks are included in review tracking and will appear as overdue if their review date passes.
- **Closed** — The risk has been resolved, mitigated to an acceptable level, or is no longer relevant. Closed risks are retained in the register for audit purposes but are excluded from review tracking.

A risk's state is set when creating or editing the risk. The default state for new risks is configured per register by the administrator.

> **Tip:** Closing a risk does not delete it. Closed risks remain visible in the register with their full history, which is important for governance and audit trails.

## Risk Reviews

Open risks should be reviewed at regular intervals to confirm that their likelihood, impact, and mitigation details remain accurate. Each register has a configurable default review frequency (e.g. every 3 months). When a review is submitted, the next review date is automatically calculated from that frequency.

Each risk displays a review status indicating where it sits in its review cycle:

- **Not Reviewed** — The risk has never been reviewed since it was created.
- **Not Due** — The risk has been reviewed and the next review date is not approaching yet.
- **Due Soon** — The next review date is within 30 days.
- **Overdue** — The next review date has passed without a completed review. Overdue risks are highlighted on the Home dashboard.

> **Note:** If reviews are disabled for a register (configured by the administrator), risks in that register will not have a review status and are excluded from review tracking.

## Risk Response Strategies

Once a risk has been identified and assessed, the risk owner should determine the appropriate response strategy. Common strategies include:

- **Avoid** — change plans to eliminate the risk entirely (e.g. stop an activity that introduces the risk).
- **Mitigate** — take action to reduce the likelihood or impact of the risk to an acceptable level.
- **Transfer** — shift the risk to a third party, for example through insurance or a contractual arrangement.
- **Accept** — consciously decide to tolerate the risk without further action, usually where the cost of mitigation outweighs the potential impact.

Your response strategy and the actions you are taking should be captured in the risk's **Risk Response Action** notes.

## Risk Appetite and Tolerance

**Risk appetite** is the level of risk an organisation is willing to accept in pursuit of its objectives. It is typically set by senior leadership and expressed as a policy or threshold.

**Risk tolerance** is the acceptable variation around the risk appetite — the upper boundary beyond which a risk must be escalated or treated as urgent.

In customRisk, risk levels (e.g. High, Critical) act as a proxy for risk appetite thresholds. Register administrators can configure the scoring model to align with their organisation's defined appetite.

> **Tip:** A well-governed risk register makes risk appetite visible: if you have a large number of High or Critical risks that are simply "accepted" without treatment, that is a signal that your risk appetite may need to be revisited.

## What is a Risk Register?

A **risk register** is a structured record of all identified risks within a defined scope. It serves as the single source of truth for risk information and forms the foundation of an effective risk management process.

A well-maintained risk register typically records:

- A unique identifier and title for each risk
- A description of the cause, event, and potential consequence
- An assessment of likelihood and impact
- The assigned risk owner
- Current mitigation or treatment actions
- The next scheduled review date
- The history of previous reviews and changes

In customRisk, each register can be tailored with custom fields to capture any additional information specific to your organisation or context.

## Inherent and Residual Risk

**Inherent risk** is the level of risk that exists before any controls or mitigating actions are applied. It represents the raw exposure if the organisation did nothing to manage the risk.

**Residual risk** is the level of risk that remains after controls have been put in place. It reflects your actual current exposure given what you are already doing to manage the risk.

Tracking both values is valuable because it quantifies the effectiveness of your controls. A large gap between inherent and residual risk indicates that controls are working well. A small gap — particularly on a high inherent risk — may indicate that current controls are insufficient and further treatment is needed.

> **Note:** Inherent and residual risk scoring is optional in customRisk. It is enabled or disabled per register by the administrator. When disabled, only a single risk score is captured for each risk.

## Governance and Compliance Context

Risk management practice is shaped by frameworks such as **ISO 31000**, which provides principles and guidelines for managing risk across any organisation or sector. While frameworks like ISO 31000 do not prescribe a specific tool or process, they establish common vocabulary and a shared understanding of what good risk management looks like.

Many organisations maintain a risk register not only as a management tool but as a compliance requirement — driven by regulatory obligations, contractual terms, or internal governance policies. In these contexts, the ability to demonstrate that risks have been actively reviewed and managed is as important as the risk data itself.

customRisk supports this through its immutable audit trail. Every change to a risk, every completed review, and every configuration update is permanently recorded. This provides a verifiable record of due diligence that can support governance reviews, internal audits, or regulatory enquiries.

> **Note:** customRisk does not assert compliance with ISO 31000 or any other specific standard. It is a tool designed to support good risk management practice — compliance with any particular framework depends on how it is configured and used within your organisation.

## Risk Culture

**Risk culture** refers to the shared values, beliefs, and behaviours within an organisation that shape how people think about and respond to risk. Organisations with a strong risk culture treat risk management as a meaningful part of how they operate — not just an administrative obligation.

Poor risk culture often manifests as risks being added to a register and then forgotten, reviews being completed perfunctorily without genuine reassessment, or ownership being assigned in name only. These patterns undermine the value of the risk management process regardless of how good the tooling is.

customRisk supports healthy risk culture through two mechanisms. First, ownership visibility — every risk has a named owner, and overdue reviews surface prominently on that person's dashboard, making accountability visible. Second, review tracking — the complete history of who reviewed a risk, when, and what they said creates a record that encourages meaningful engagement rather than checkbox completion.

> **Tip:** Treat each risk review as a genuine checkpoint: does this risk still apply? Has anything changed that affects its likelihood or impact? Are the mitigation actions still relevant and being followed through? A review that confirms nothing has changed is still a valuable review — the important thing is that it was done deliberately.
