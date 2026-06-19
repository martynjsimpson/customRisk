import {
  Accordion,
  Alert,
  Divider,
  Group,
  List,
  Loader,
  Paper,
  Stack,
  Tabs,
  Text,
  ThemeIcon,
  Title
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconBulb,
  IconInfoCircle
} from "@tabler/icons-react";
import { useEffect, useState } from "react";

// ─── Markdown renderer ───────────────────────────────────────────────────────
//
// A minimal structural Markdown-to-JSX renderer. It handles the subset of
// Markdown used in the help content files:
//   - # / ## / ### headings
//   - Paragraphs and blank-line separation
//   - **bold** inline
//   - `code` inline
//   - Bulleted lists (- item)
//   - Numbered lists (1. item)
//   - > blockquote (used for Tips, Notes, Warnings)
//   - Horizontal rules (---)
//
// It does NOT attempt to render arbitrary Markdown — it is scoped to the
// patterns used in frontend/public/help/en/*.md.

type Block =
  | { type: "h1" | "h2" | "h3"; text: string }
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "blockquote"; label: "Tip" | "Note" | "Warning"; text: string }
  | { type: "hr" }
  | { type: "accordion-start"; title: string }
  | { type: "accordion-end" };

function parseMarkdown(md: string): Block[] {
  const lines = md.split("\n");
  const blocks: Block[] = [];
  let i = 0;

  // Helper: safely read a line within bounds
  const at = (idx: number): string => lines[idx] ?? "";

  while (i < lines.length) {
    const line = at(i);

    // Headings
    if (line.startsWith("### ")) {
      blocks.push({ type: "h3", text: line.slice(4).trim() });
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push({ type: "h2", text: line.slice(3).trim() });
      i++;
      continue;
    }
    if (line.startsWith("# ")) {
      blocks.push({ type: "h1", text: line.slice(2).trim() });
      i++;
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      const content = line.slice(2).trim();
      let label: "Tip" | "Note" | "Warning" = "Note";
      let text = content;
      if (content.startsWith("**Tip:**")) {
        label = "Tip";
        text = content.slice(8).trim();
      } else if (content.startsWith("**Note:**")) {
        label = "Note";
        text = content.slice(9).trim();
      } else if (content.startsWith("**Warning:**")) {
        label = "Warning";
        text = content.slice(12).trim();
      }
      // Collect continuation lines
      i++;
      while (i < lines.length && at(i).startsWith("> ")) {
        text += " " + at(i).slice(2).trim();
        i++;
      }
      blocks.push({ type: "blockquote", label, text });
      continue;
    }

    // Unordered list
    if (line.startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && at(i).startsWith("- ")) {
        items.push(at(i).slice(2).trim());
        i++;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    // Ordered list
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(at(i))) {
        items.push(at(i).replace(/^\d+\.\s/, "").trim());
        i++;
      }
      blocks.push({ type: "ol", items });
      continue;
    }

    // Empty line — skip
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Paragraph — collect until blank line or structural element
    let text = line;
    i++;
    while (i < lines.length) {
      const nextLine = at(i);
      if (
        nextLine.trim() === "" ||
        nextLine.startsWith("#") ||
        nextLine.startsWith(">") ||
        nextLine.startsWith("- ") ||
        /^\d+\.\s/.test(nextLine) ||
        /^---/.test(nextLine)
      ) break;
      text += " " + nextLine;
      i++;
    }
    blocks.push({ type: "p", text: text.trim() });
  }

  return blocks;
}

// Render inline Markdown: **bold**, `code`, and plain text
function InlineText({ text }: { text: string }) {
  const parts: Array<{ kind: "text" | "bold" | "code"; value: string }> = [];
  let remaining = text;

  while (remaining.length > 0) {
    const boldIdx = remaining.indexOf("**");
    const codeIdx = remaining.indexOf("`");
    const first = Math.min(boldIdx === -1 ? Infinity : boldIdx, codeIdx === -1 ? Infinity : codeIdx);

    if (first === Infinity) {
      parts.push({ kind: "text", value: remaining });
      break;
    }

    if (first > 0) {
      parts.push({ kind: "text", value: remaining.slice(0, first) });
      remaining = remaining.slice(first);
    }

    if (remaining.startsWith("**")) {
      const end = remaining.indexOf("**", 2);
      if (end === -1) {
        parts.push({ kind: "text", value: remaining });
        break;
      }
      parts.push({ kind: "bold", value: remaining.slice(2, end) });
      remaining = remaining.slice(end + 2);
    } else if (remaining.startsWith("`")) {
      const end = remaining.indexOf("`", 1);
      if (end === -1) {
        parts.push({ kind: "text", value: remaining });
        break;
      }
      parts.push({ kind: "code", value: remaining.slice(1, end) });
      remaining = remaining.slice(end + 1);
    }
  }

  return (
    <>
      {parts.map((part, idx) => {
        if (part.kind === "bold") return <Text key={idx} span fw={600}>{part.value}</Text>;
        if (part.kind === "code") return <Text key={idx} span ff="monospace" size="sm">{part.value}</Text>;
        return <span key={idx}>{part.value}</span>;
      })}
    </>
  );
}

// Render a list item — items may contain sub-lists (indented with spaces)
// For simplicity the help content does not use nested lists, so we render flat.
function renderListItem(text: string, idx: number) {
  // Handle nested list marker inside item (e.g. "**Label** — description")
  return (
    <List.Item key={idx}>
      <InlineText text={text} />
    </List.Item>
  );
}

function BlockquoteAlert({ label, text }: { label: "Tip" | "Note" | "Warning"; text: string }) {
  if (label === "Tip") {
    return (
      <Alert icon={<IconBulb size={16} />} color="blue" variant="light" radius="sm">
        <InlineText text={text} />
      </Alert>
    );
  }
  if (label === "Warning") {
    return (
      <Alert icon={<IconAlertTriangle size={16} />} color="yellow" variant="light" radius="sm">
        <InlineText text={text} />
      </Alert>
    );
  }
  return (
    <Alert icon={<IconInfoCircle size={16} />} color="gray" variant="light" radius="sm">
      <InlineText text={text} />
    </Alert>
  );
}

// Group blocks under h2 headings into accordion panels; h3 headings become
// sub-section headings within a panel. Top-level content (before the first h2)
// is rendered as a Paper intro block.
interface Section {
  title: string;
  value: string;
  blocks: Block[];
}

function groupIntoSections(blocks: Block[]): { intro: Block[]; sections: Section[] } {
  const intro: Block[] = [];
  const sections: Section[] = [];
  let current: Section | null = null;

  for (const block of blocks) {
    if (block.type === "h1") {
      // Skip — the tab title serves as the h1 context
      continue;
    }
    if (block.type === "h2") {
      if (current) sections.push(current);
      current = {
        title: block.text,
        value: block.text.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
        blocks: []
      };
      continue;
    }
    if (current) {
      current.blocks.push(block);
    } else {
      intro.push(block);
    }
  }
  if (current) sections.push(current);
  return { intro, sections };
}

function renderBlock(block: Block, idx: number): React.ReactNode {
  switch (block.type) {
    case "h3":
      return (
        <Group key={idx} gap="xs" mb="xs" mt="sm">
          <ThemeIcon variant="light" size="sm">
            <IconInfoCircle size={14} />
          </ThemeIcon>
          <Title order={4}>{block.text}</Title>
        </Group>
      );
    case "p":
      return <Text key={idx}><InlineText text={block.text} /></Text>;
    case "ul":
      return (
        <List key={idx} spacing="xs">
          {block.items.map((item, i) => renderListItem(item, i))}
        </List>
      );
    case "ol":
      return (
        <List key={idx} type="ordered" spacing="xs">
          {block.items.map((item, i) => renderListItem(item, i))}
        </List>
      );
    case "blockquote":
      return <BlockquoteAlert key={idx} label={block.label} text={block.text} />;
    case "hr":
      return <Divider key={idx} />;
    default:
      return null;
  }
}

function MarkdownTab({ blocks }: { blocks: Block[] }) {
  const { intro, sections } = groupIntoSections(blocks);

  return (
    <Stack>
      {intro.length > 0 ? (
        <Paper withBorder p="md" radius="sm">
          <Stack gap="sm">
            {intro.map((block, idx) => renderBlock(block, idx))}
          </Stack>
        </Paper>
      ) : null}
      {sections.length > 0 ? (
        <Accordion variant="separated" radius="sm">
          {sections.map((section) => (
            <Accordion.Item key={section.value} value={section.value}>
              <Accordion.Control>
                <Text fw={600}>{section.title}</Text>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap="sm">
                  {section.blocks.map((block, idx) => renderBlock(block, idx))}
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      ) : null}
    </Stack>
  );
}

// ─── Help file manifest ──────────────────────────────────────────────────────

const HELP_TABS = [
  { value: "getting-started", label: "Getting Started", file: "getting-started.md" },
  { value: "concepts",        label: "Risk Concepts",   file: "risk-concepts.md" },
  { value: "registers",       label: "Registers",       file: "registers.md" },
  { value: "risks",           label: "Managing Risks",  file: "managing-risks.md" },
  { value: "users",           label: "Users",           file: "users-permissions.md" },
  { value: "templates",       label: "Templates",       file: "templates.md" },
  { value: "audit",           label: "Audit & Export",  file: "audit-export.md" },
] as const;

const HELP_BASE = "/help/en/";

// ─── Page root ────────────────────────────────────────────────────────────────

export function HelpPage() {
  const [activeTab, setActiveTab] = useState<string>("getting-started");
  const [contentCache, setContentCache] = useState<Record<string, Block[]>>({});
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (contentCache[activeTab]) return;

    const tab = HELP_TABS.find((t) => t.value === activeTab);
    if (!tab) return;

    setLoading(true);
    setFetchError(null);

    fetch(`${HELP_BASE}${tab.file}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load help content (${res.status})`);
        return res.text();
      })
      .then((text) => {
        setContentCache((prev) => ({ ...prev, [activeTab]: parseMarkdown(text) }));
      })
      .catch((err: unknown) => {
        setFetchError(err instanceof Error ? err.message : "Failed to load help content");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [activeTab, contentCache]);

  const currentBlocks = contentCache[activeTab] ?? null;

  return (
    <Stack>
      <Stack gap={0}>
        <Title order={1}>Help &amp; Documentation</Title>
        <Text c="dimmed">Guidance on using customRisk and understanding risk management concepts.</Text>
      </Stack>

      <Tabs value={activeTab} onChange={(v) => v && setActiveTab(v)} keepMounted={false}>
        <Tabs.List mb="md" grow>
          {HELP_TABS.map((tab) => (
            <Tabs.Tab key={tab.value} value={tab.value}>{tab.label}</Tabs.Tab>
          ))}
        </Tabs.List>

        {HELP_TABS.map((tab) => (
          <Tabs.Panel key={tab.value} value={tab.value}>
            {activeTab === tab.value ? (
              loading ? (
                <Loader />
              ) : fetchError ? (
                <Alert icon={<IconInfoCircle size={16} />} color="red" variant="light" radius="sm">
                  {fetchError}
                </Alert>
              ) : currentBlocks ? (
                <MarkdownTab blocks={currentBlocks} />
              ) : null
            ) : null}
          </Tabs.Panel>
        ))}
      </Tabs>
    </Stack>
  );
}

