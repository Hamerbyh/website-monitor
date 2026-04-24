# AGENTS.md

## Project Rules

### Project Context
- This is an open-source project.
- Keep architecture, naming, and documentation understandable for public contributors and future readers.
- Prefer generic examples and reusable patterns over project-specific shortcuts that are hard to explain publicly.

### Text Management
- Do not hardcode reusable or user-facing copy in React components, layouts, or route handlers.
- Store product copy, labels, button text, page descriptions, navigation text, empty states, and status text in JSON files under `/content`.
- If a new feature needs text, add or extend a JSON file first, then consume it from code.
- Exceptions are limited to:
  - database identifiers
  - enum values used as internal data
  - protocol values and HTTP method names
  - non-user-facing developer error text when needed for debugging

### Product Direction
- This is a personal-use website operations dashboard.
- The repository is open source even if the initial product workflow is optimized for personal use.
- Prefer dense, practical information layouts over marketing-style whitespace.
- The homepage should prioritize actionable issues before trends or vanity metrics.
- The first monitoring version should use server-side HTTP checks from the deployed server.
- Public self-service sign-up should remain disabled unless explicitly requested.
- Admin or initial users should be created through local scripts or controlled setup flows.

### Current Stack
- Framework: Next.js
- ORM: Drizzle ORM
- Database: PostgreSQL
- Auth: Better Auth
- Deployment: Dokploy with Dockerfile

### App Structure
- Authenticated app routes live under `/app/(app)`.
- Public auth routes live under `/app/(auth)`.
- Shared copy lives under `/content`.
- Persistent local project memory lives under `/project-memory`.
- Change notes live under `/project-memory/changes`.
- Topic index lives at `/project-memory/index.md`.

### Engineering Notes
- Keep new UI copy centralized.
- When adding new pages, reuse the app shell instead of duplicating layout logic.
- Favor minimal, evolvable implementations first; expand after the data flow is correct.
- After each meaningful change, update `/project-memory/changes` with a concise dated note.
- Before continuing a new implementation thread, prefer checking the latest note in `/project-memory/changes`.
- After each meaningful change, also update `/project-memory/index.md` when the change affects an existing topic or introduces a new one.
- When resuming work, check both the latest dated note and `/project-memory/index.md`.
- Never store user-sensitive project details in notes or docs for this repo.
- Do not write private URLs, credentials, internal hostnames, secrets, tokens, or personally sensitive operational data into `/project-memory`, `README`, or other tracked files.
- When a change note needs examples, use generic placeholders instead of real project-specific values.
