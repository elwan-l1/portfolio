# Portfolio

## Project

- Personal portfolio site. One page, multilingual, content from DB.
- Site look: Catppuccin Mocha, monospace, art drawn as real text.

## Stack

- Next.js 16 App Router, React 19, TypeScript 7 strict.
- Tailwind CSS 4. Theme tokens in `app/mocha.css`.
- Prisma 7 + MySQL 9.7 in Docker. MariaDB driver adapter. Stay on Prisma 7 until
  8 stable.
- pnpm 11, Node 26. oxlint, oxfmt, pre-commit. GitHub Actions CI.
- Commands: `pnpm dev`, `pnpm build`, `pnpm check` (all hooks), `pnpm db:up`,
  `pnpm db:migrate`, `pnpm db:seed`, `pnpm db:studio`.

## Map

- `app/[lang]/`: routes, root layout, metadata. Locales `en`, `fr`, `de`, `it`.
- `app/fonts/`: `next/font/local` definitions and font files.
- `app/globals.css`, `app/mocha.css`: theme.
- `app/icon.svg`, `app/favicon.ico`, `app/apple-icon.png`: icons.
- `dictionaries/`: UI strings per locale.
- `constants/`: shared constants.
- `lib/prisma.ts`: DB client.
- `prisma/`: schema, migrations, seed.
- `generated/prisma/`: Prisma client. Generated on install, gitignored.
- `proxy.ts`: redirects `/` to browser locale.
- `compose.yml`: MySQL.

## Architecture

- Server components default. Client components only for interaction.
- DB access server side only, through `lib/prisma.ts`.
- Content lives in DB. Translatable text in `*_translations` tables, one row per
  locale. Email and logos stay in code.
- Seed idempotent: upsert by natural key.
- Fonts: both through `next/font/local`. Read family from `.style.fontFamily`,
  never hard-code name.

## Engineering

- Repo conventions first. Simple code. Focused patch.
- Guard clauses over nested conditions. Arrow functions in JS/TS.
- Strict TypeScript. No `any` without narrow, justified escape hatch.
- Comments rare. Inline comments lowercase. Public APIs use standard doc comments
  only when useful.
- No compatibility shims, aliases, dual paths, or deprecation layers. Change
  internal callers directly unless user requests migration period.
- No speculative safeguards, fallback, retry, validation, or abstraction. Require
  concrete boundary, failure, or invariant.
- No unrelated cleanup, refactor, lint fix, or dependency upgrade.

## Work

- All task file operations and command working directories stay inside repo.
  System executables and runtime dependencies allowed only for project commands.
- Destructive command only when required. Resolve every target inside repo.
  Never target broad path, unresolved variable, home, filesystem root, or repo
  root.
- Never use `sudo`. Never install or update global/system packages. No Homebrew or
  global `npm`/`pnpm`.
- Git read-only by default. Allowed: `git status`, `git diff`, `git log`,
  `git show`, `git blame`, `git grep`, `git ls-files`, `git rev-parse`.
  `git stash`, `git commit`, and `git push` are allowed only when the user
  explicitly requests the exact operation. `git add` is allowed only to stage
  the files included in an explicitly requested commit. All other Git actions
  forbidden.

## Communication

Default response style: full Caveman. Active every response until user opts out.
Technical substance stays; conversational overhead dies. Style never reduces
analysis, implementation, or verification.

- Drop unnecessary articles, filler, pleasantries, hedging. Fragments OK. Short
  common words. Each fact once.
- Preferred shape: subject, action, reason. Next step.
- Preserve exact technical terms, code, commands, paths, API/function names,
  commit types, and quoted errors. Translate only when requested.
- Always communicate with the user in English, regardless of the language they
  use. Translate content only when explicitly requested.
- Established acronyms OK: API, DB, HTTP. Never invent abbreviations such as
  `cfg`, `impl`, `req`, `res`, or `fn`. No decorative arrows.
- No self-reference, style announcement, normal-answer-plus-recap, emoji,
  decorative table, repetitive tool narration, or long raw error dump. Quote
  shortest decisive error line unless full output requested.
- Security warning, irreversible confirmation, ambiguity-prone ordered steps, or
  confused/repeating user: use clear normal prose for that part. Resume Caveman
  afterward.
- Code, commit messages, PR descriptions, and repo artifacts use normal
  conventional style.
- User says `stop caveman`, `normal mode`, `do not use caveman`, or equivalent:
  write normal prose for rest of task/session. Resume only after explicit user
  enablement. Latest explicit style preference wins.

## Search

- Use `rg` for search. Use `rg --files` for files.
- Search local path first. Expand only when needed.
- Combine terms in one regex. Read matches and nearby lines.
- No `grep`, `find`, or broad scans unless `rg` fails.
- Example: `rg -n "symbol|error|behavior" src/`

## Verification

- Never add unit/integration tests, snapshots, fixtures, or test-only helpers
  unless user explicitly requests them.
- Existing automated tests may run. They never replace real behavior validation.
- Code review, lint, type-check, build success do not prove feature works. Exercise
  affected behavior realistically before claiming success.
- UI: when useful, inspect browser before edit for baseline. Inspect after edit.
  Verify requested elements, states, interactions, relevant viewports, intended
  visual change, regressions.
- Docker/infrastructure/config/dependency/service: validate rendered config and
  runtime paths. As applicable check startup, health, connectivity, ordering,
  persistence, changed behavior.
- Blocked validation: never claim success. State verified work, unverified work,
  exact blocker.
