/**
 * Limited formula evaluator for CALCULATED custom fields (PM5-05).
 *
 * Syntax:
 *   - Field references: {field:uuid}  → resolved to a number (from the risk's scalar custom field values)
 *   - Built-in references: {score}, {likelihood}, {impact}  → risk-level numeric values
 *   - Arithmetic: +  -  *  /  (  )
 *   - Functions: round(x), ceil(x), floor(x), min(x,y), max(x,y), abs(x)
 *   - Numeric literals: integers and decimals
 *
 * The evaluator produces a number which is serialised as a string and stored in
 * RiskCustomFieldValue.textValue so that the existing column can hold it without
 * a schema migration.
 */

export class FormulaEvaluationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FormulaEvaluationError";
  }
}

export interface FormulaContext {
  /** numeric value for each custom-field definition ID that is referenced */
  fieldValues: Record<string, number | null>;
  /** numeric score if available */
  score?: number | null;
  /** numeric likelihood order/score */
  likelihood?: number | null;
  /** numeric impact order/score */
  impact?: number | null;
}

// ─── Tokeniser ───────────────────────────────────────────────────────────────

type Token =
  | { type: "NUMBER"; value: number }
  | { type: "FIELD"; id: string }
  | { type: "BUILTIN"; name: "score" | "likelihood" | "impact" }
  | { type: "FUNC"; name: "round" | "ceil" | "floor" | "min" | "max" | "abs" }
  | { type: "OP"; op: "+" | "-" | "*" | "/" }
  | { type: "LPAREN" }
  | { type: "RPAREN" }
  | { type: "COMMA" };

const FIELD_RE = /^\{field:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\}/i;
const BUILTIN_RE = /^\{(score|likelihood|impact)\}/i;
const FUNC_RE = /^(round|ceil|floor|min|max|abs)\s*(?=\()/i;
const NUMBER_RE = /^-?(?:0|[1-9]\d*)(?:\.\d+)?/;
const WHITESPACE_RE = /^\s+/;

function tokenise(formula: string): Token[] {
  const tokens: Token[] = [];
  let rest = formula;

  while (rest.length > 0) {
    // Skip whitespace
    const ws = WHITESPACE_RE.exec(rest);
    if (ws) { rest = rest.slice(ws[0].length); continue; }

    // Field reference
    const field = FIELD_RE.exec(rest);
    if (field?.[1]) {
      tokens.push({ type: "FIELD", id: field[1].toLowerCase() });
      rest = rest.slice(field[0].length);
      continue;
    }

    // Built-in reference
    const builtin = BUILTIN_RE.exec(rest);
    if (builtin?.[1]) {
      tokens.push({ type: "BUILTIN", name: builtin[1].toLowerCase() as "score" | "likelihood" | "impact" });
      rest = rest.slice(builtin[0].length);
      continue;
    }

    // Functions (must come before number so "round" isn't confused)
    const func = FUNC_RE.exec(rest);
    if (func?.[1]) {
      tokens.push({ type: "FUNC", name: func[1].toLowerCase() as "round" | "ceil" | "floor" | "min" | "max" | "abs" });
      rest = rest.slice(func[1].length);
      continue;
    }

    // Number literal
    const num = NUMBER_RE.exec(rest);
    if (num) {
      tokens.push({ type: "NUMBER", value: parseFloat(num[0]) });
      rest = rest.slice(num[0].length);
      continue;
    }

    // Single-char tokens
    if (rest[0] === "(") { tokens.push({ type: "LPAREN" }); rest = rest.slice(1); continue; }
    if (rest[0] === ")") { tokens.push({ type: "RPAREN" }); rest = rest.slice(1); continue; }
    if (rest[0] === ",") { tokens.push({ type: "COMMA" }); rest = rest.slice(1); continue; }
    if (rest[0] === "+") { tokens.push({ type: "OP", op: "+" }); rest = rest.slice(1); continue; }
    if (rest[0] === "-") { tokens.push({ type: "OP", op: "-" }); rest = rest.slice(1); continue; }
    if (rest[0] === "*") { tokens.push({ type: "OP", op: "*" }); rest = rest.slice(1); continue; }
    if (rest[0] === "/") { tokens.push({ type: "OP", op: "/" }); rest = rest.slice(1); continue; }

    throw new FormulaEvaluationError(`Unexpected character: ${rest[0]}`);
  }

  return tokens;
}

// ─── Recursive-descent parser / evaluator ────────────────────────────────────

class Parser {
  private tokens: Token[];
  private pos = 0;
  private ctx: FormulaContext;

  constructor(tokens: Token[], ctx: FormulaContext) {
    this.tokens = tokens;
    this.ctx = ctx;
  }

  private peek(): Token | undefined { return this.tokens[this.pos]; }
  private consume(): Token {
    const t = this.tokens[this.pos++];
    if (!t) throw new FormulaEvaluationError("Unexpected end of input");
    return t;
  }

  private expect(type: Token["type"]): Token {
    const t = this.consume();
    if (!t || t.type !== type) throw new FormulaEvaluationError(`Expected ${type}`);
    return t;
  }

  parse(): number {
    const value = this.parseExpr();
    if (this.pos < this.tokens.length) {
      throw new FormulaEvaluationError("Unexpected token after expression");
    }
    return value;
  }

  // expr = term (('+' | '-') term)*
  private parseExpr(): number {
    let left = this.parseTerm();
    while (this.peek()?.type === "OP" && (this.peek() as { op: string }).op !== "*" && (this.peek() as { op: string }).op !== "/") {
      const op = (this.consume() as { type: "OP"; op: string }).op;
      const right = this.parseTerm();
      left = op === "+" ? left + right : left - right;
    }
    return left;
  }

  // term = unary (('*' | '/') unary)*
  private parseTerm(): number {
    let left = this.parseUnary();
    while (this.peek()?.type === "OP" && ((this.peek() as { op: string }).op === "*" || (this.peek() as { op: string }).op === "/")) {
      const op = (this.consume() as { type: "OP"; op: string }).op;
      const right = this.parseUnary();
      if (op === "/" && right === 0) throw new FormulaEvaluationError("Division by zero");
      left = op === "*" ? left * right : left / right;
    }
    return left;
  }

  // unary = '-' unary | primary
  private parseUnary(): number {
    if (this.peek()?.type === "OP" && (this.peek() as { op: string }).op === "-") {
      this.consume();
      return -this.parseUnary();
    }
    return this.parsePrimary();
  }

  // primary = NUMBER | FIELD | BUILTIN | FUNC '(' args ')' | '(' expr ')'
  private parsePrimary(): number {
    const t = this.peek();
    if (!t) throw new FormulaEvaluationError("Unexpected end of formula");

    if (t.type === "NUMBER") {
      this.consume();
      return t.value;
    }

    if (t.type === "FIELD") {
      this.consume();
      const val = this.ctx.fieldValues[t.id];
      if (val === undefined) throw new FormulaEvaluationError(`Unknown field: ${t.id}`);
      return val ?? 0;
    }

    if (t.type === "BUILTIN") {
      this.consume();
      const val = t.name === "score" ? this.ctx.score
        : t.name === "likelihood" ? this.ctx.likelihood
        : this.ctx.impact;
      return val ?? 0;
    }

    if (t.type === "FUNC") {
      this.consume();
      this.expect("LPAREN");
      const args: number[] = [this.parseExpr()];
      while (this.peek()?.type === "COMMA") {
        this.consume();
        args.push(this.parseExpr());
      }
      this.expect("RPAREN");
      return applyFunc(t.name, args);
    }

    if (t.type === "LPAREN") {
      this.consume();
      const val = this.parseExpr();
      this.expect("RPAREN");
      return val;
    }

    throw new FormulaEvaluationError(`Unexpected token: ${t.type}`);
  }
}

function applyFunc(name: string, args: number[]): number {
  switch (name) {
    case "round": return Math.round(args[0] ?? 0);
    case "ceil":  return Math.ceil(args[0] ?? 0);
    case "floor": return Math.floor(args[0] ?? 0);
    case "abs":   return Math.abs(args[0] ?? 0);
    case "min":   return Math.min(...args);
    case "max":   return Math.max(...args);
    default: throw new FormulaEvaluationError(`Unknown function: ${name}`);
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function evaluateFormula(formula: string, ctx: FormulaContext): number {
  const tokens = tokenise(formula);
  const parser = new Parser(tokens, ctx);
  return parser.parse();
}

export function validateScoringFormula(
  formula: string,
  availableFieldKeys: string[]
): { valid: boolean; error?: string } {
  // Empty string means "use default" — always valid
  if (formula === "") {
    return { valid: true };
  }

  if (/\{score\}/i.test(formula)) {
    return {
      valid: false,
      error: "The {score} variable cannot be used in a scoring formula (circular reference)"
    };
  }

  // Check that any {field:uuid} references are in the available set
  const availableSet = new Set(availableFieldKeys.map((k) => k.toLowerCase()));
  const fieldRefs = [...formula.matchAll(/\{field:([0-9a-f-]{36})\}/gi)];
  for (const m of fieldRefs) {
    const id = m[1];
    if (id && !availableSet.has(id.toLowerCase())) {
      return {
        valid: false,
        error: `Field ${id} is not a numeric custom field in this register`
      };
    }
  }

  try {
    const fieldValues: Record<string, number> = {};
    for (const key of availableFieldKeys) {
      fieldValues[key.toLowerCase()] = 0;
    }
    evaluateFormula(formula, { fieldValues, score: null, likelihood: 0, impact: 0 });
    return { valid: true };
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export function validateFormula(formula: string): { valid: boolean; error?: string } {
  try {
    // Use a stub context with all referenced fields resolving to 0
    const deps = formula.matchAll(/\{field:([0-9a-f-]{36})\}/gi);
    const fieldValues: Record<string, number> = {};
    for (const m of deps) {
      const id = m[1];
      if (id) fieldValues[id.toLowerCase()] = 0;
    }
    evaluateFormula(formula, { fieldValues, score: 0, likelihood: 0, impact: 0 });
    return { valid: true };
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : String(error) };
  }
}
