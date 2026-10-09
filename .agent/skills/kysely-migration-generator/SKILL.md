---
name: kysely-migration-generator
description: Translates a Mermaid ERD (docs/architecture/schema.mmd or erd.svg) into a type-safe Kysely PostgreSQL migration in src/db/migrations/. Use when asked to generate a Kysely migration, database migration, or DDL from an ERD, Mermaid diagram, or schema.mmd file.
---

# Kysely Migration Generator

Converts a Mermaid `erDiagram` into a production-ready Kysely migration. Use `src/db/migrations/001_initial_schema.ts` as the structural baseline.

## Workflow

1. Read `docs/architecture/schema.mmd`. If only `docs/architecture/erd.svg` exists, extract entities, attributes, and relationships from it.
2. List existing migrations in `src/db/migrations/` and skip tables they already create (e.g. `users` from `001_initial_schema.ts`). Reference existing tables with FKs but do not recreate them.
3. Apply the translation rules below.
4. Sort tables in dependency order (referenced tables before referencing tables).
5. Write the migration file.
6. Run `npm run build`. Fix any TypeScript errors and re-run until it passes.
7. Run `npm run migrate:up`. Fix any errors and re-run until it passes.

## Translation Rules

### Entities → Tables

- Map each Mermaid entity to a snake_case table name: `USERS` → `users`, `BookAuthors` → `book_authors`, `LOAN_ITEMS` → `loan_items`.
- Map attribute names to snake_case column names.

### Data Types

| Mermaid type | Kysely type |
| --- | --- |
| `int`, `integer` | `'integer'` |
| `bigint` | `'bigint'` |
| `serial` | `'serial'` |
| `uuid` | `'uuid'` |
| `string`, `varchar` | `'varchar(255)'` |
| `text` | `'text'` |
| `boolean`, `bool` | `'boolean'` |
| `date` | `'date'` |
| `datetime`, `timestamp` | `'timestamp'` |
| `decimal`, `numeric`, `float` | `'numeric(10, 2)'` |
| `json`, `jsonb` | `'jsonb'` |

### Keys & Columns

- **PK** with `int`/`serial`: `.addColumn('id', 'serial', (col) => col.primaryKey())`.
- **PK** with `uuid`: `.addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql\`gen_random_uuid()\`))`.
- **FK**: match the referenced column's type (`serial` PK → `'integer'`, `uuid` PK → `'uuid'`) and use:

  ```ts
  .addColumn('user_id', 'integer', (col) =>
    col.references('users.id').onDelete('cascade').notNull()
  )
  ```

- **PK, FK** on a junction table: add both FK columns, then a composite key with `.addPrimaryKeyConstraint('<table>_pkey', ['col_a', 'col_b'])`.
- **UK**: append `.unique()`.
- Non-key columns are `.notNull()` unless the ERD comment marks them optional/nullable.
- `created_at` / `updated_at` timestamps: `col.defaultTo(sql\`NOW()\`).notNull()`.

### Cardinalities

- `||--o{` / `||--|{` (one-to-many): the FK lives on the "many" side table, referencing the "one" side PK. No unique constraint.
- `||--o|` / `||--||` (one-to-one): the FK lives on the dependent side and gets `.unique()` to enforce one-to-one.
- `}o--o{` (many-to-many): create a junction table with two FKs and a composite primary key.

## File Output

- Path: `src/db/migrations/<timestamp>_<migration_name>.ts`
- `<timestamp>` is `YYYYMMDDHHmmss` (e.g. `20261007153000`) so it sorts after `001_initial_schema.ts`.
- `<migration_name>` is snake_case (e.g. `library_schema`).

## Structure

The file must export both `up` and `down`:

```ts
import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('authors')
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('name', 'varchar(255)', (col) => col.notNull())
    .addColumn('created_at', 'timestamp', (col) =>
      col.defaultTo(sql`NOW()`).notNull()
    )
    .execute();

  await db.schema
    .createTable('books')
    .addColumn('id', 'serial', (col) => col.primaryKey())
    .addColumn('author_id', 'integer', (col) =>
      col.references('authors.id').onDelete('cascade').notNull()
    )
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('books').execute();
  await db.schema.dropTable('authors').execute();
}
```

## Guardrails

- `up` creates tables in dependency order; `down` drops tables in exact reverse dependency order.
- `down` drops only tables created by this migration.
- Import `sql` only if it is used.
- Every `createTable` chain ends with `.execute()` and is awaited.
- Use only Kysely schema builder APIs; no raw DDL strings except `sql` defaults.
- The file must pass `npm run build` and `npm run migrate:up`.
