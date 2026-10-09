---
name: erd-generator
description: Designs and validates a Mermaid Entity-Relationship Diagram (erDiagram) from an unstructured domain description, writes it to docs/architecture/schema.mmd, and compiles it to docs/architecture/erd.svg. Use when asked to design an ERD, entity-relationship diagram, data model, database schema diagram, or architecture diagram for a domain.
---

# ERD Generator

Converts domain requirements into a verified Mermaid `erDiagram` and renders it to an SVG asset.

## Execution Workflow

1. **Parse requirements.** Extract from the domain description:
   - Entities (UPPER_SNAKE_CASE names, e.g. `USERS`, `BOOK_AUTHORS`).
   - Attributes with types (`int`, `uuid`, `varchar`, `text`, `boolean`, `date`, `timestamp`, `decimal`).
   - Primary keys marked `PK`, foreign keys marked `FK`, unique columns marked `UK`.
   - Cardinalities between entities.
   - If a relation is stated to already exist (e.g. `USERS`), include it in the diagram using its existing columns so relationships to it are shown.

2. **Write the diagram** directly to `docs/architecture/schema.mmd` (raw Mermaid only, no Markdown fences).

3. **Validate and render** from the repository root:

   ```bash
   node .agent/skills/erd-generator/scripts/render_erd.js docs/architecture/schema.mmd
   ```

   The skill-relative form is `node scripts/render_erd.js docs/architecture/schema.mmd`.
   - Prints `SUCCESS` and exits `0` when `docs/architecture/erd.svg` is compiled.
   - Prints `SYNTAX_ERROR:` followed by the stderr trace and exits `1` on failure.

4. **Self-Correction Loop.** If the output starts with `SYNTAX_ERROR`:
   - Parse the error trace (line number, unexpected token, expected tokens).
   - Fix the Mermaid syntax in `docs/architecture/schema.mmd`.
   - Re-run the script.
   - Repeat up to **3 retries**. If it still fails after 3 retries, stop and report the last error trace to the user.

5. **Final Output.** Present the raw Mermaid block from `docs/architecture/schema.mmd` to the user in a ```mermaid code block and reference the generated image asset path `docs/architecture/erd.svg`.

## Mermaid Syntax Rules

- First line must be `erDiagram`.
- Entity block format:

  ```
  ENTITY_NAME {
      type column_name PK
      type column_name FK
      type column_name UK
      type column_name "optional comment"
  }
  ```

- A column with multiple key types uses a comma: `int user_id PK, FK`.
- Relationship format: `ENTITY_A ||--o{ ENTITY_B : "label"`.
- Cardinality markers:
  - `||--||` one-to-one (both required)
  - `||--o|` one-to-one (optional on the right)
  - `||--o{` one-to-many
  - `||--|{` one-to-many (at least one)
  - `}o--o{` many-to-many (resolve with a junction entity instead)
- Model many-to-many relationships with a junction entity holding two `FK` columns.
- Types and column names must not contain spaces, parentheses, or commas (use `varchar`, not `varchar(255)`).
- Relationship labels must be quoted.

## Common Fixes

| Error symptom | Fix |
| --- | --- |
| `Parse error ... Expecting 'ATTRIBUTE_WORD'` | Remove parentheses/special characters from types or names |
| `Expecting ':'` | Add `: "label"` to the relationship line |
| Unknown cardinality token | Use only the markers listed above |
| `No diagram type detected` | Ensure the file begins with `erDiagram` and has no Markdown fences |
