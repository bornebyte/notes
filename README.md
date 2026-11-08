# Notes

Notes is a personal note-taking web application with a private admin area for managing notes and a remote MCP server that lets compatible AI clients work with notes when you authorize them.

The project is built with Next.js App Router, React, JavaScript, Tailwind CSS, and Neon Postgres. It can be run locally or deployed to a Node.js host such as Vercel.

## What you can do

- Create, edit, search, categorize, and format notes.
- Mark notes as favorites and restore notes from the trash.
- Generate links to share notes.
- View note activity and statistics on the admin dashboard.
- Manage targets, inbox messages, API tokens, and MCP connections from Settings.
- Connect an MCP-compatible AI client after reviewing and approving its requested access.

## Using the app

The home page is at `/`. Sign in at `/auth` with the admin password configured for your database. The admin area is at `/admin`.

| Page | What it is for |
| --- | --- |
| `/admin` | Dashboard with activity and note statistics. |
| `/admin/note` | Create, edit, search, favorite, share, export, and manage trashed notes. |
| `/admin/target` | Manage target dates and goals. |
| `/admin/inbox` | Review messages sent to the site's inbox. |
| `/admin/generations` | View the connected generations service, when configured. |
| `/admin/settings` | Change the admin password, manage API tokens, and review or revoke MCP connections. |

Notes are private to the account by default. Shared links are for notes you choose to share. The MCP server also omits hidden and trashed notes from reads.

## Run locally

### Requirements

- Node.js compatible with the Next.js version in `package.json`
- npm
- A PostgreSQL database (Neon is used by the project)

### Install and configure

```sh
git clone https://github.com/bornebyte/notes.git
cd notes
npm install
cp .env.example .env.local
```

Edit `.env.local` and set the database connection, a private session secret, and the local site origins:

```env
DATABASE_URL="postgresql://..."
SESSION_SECRET="your-private-session-secret"
NEXT_PUBLIC_DOMAIN="http://localhost:3000"
MCP_BASE_URL="http://localhost:3000"
```

`MCP_BASE_URL` is the canonical site origin used by MCP and OAuth. Keep it at the local origin for local development. In production it must be the public HTTPS origin, without a path. See [MCP.md](MCP.md) for the full MCP setup and connection details.

Initialize the database:

```sh
npm run db:init
```

For an existing Notes database, use `npm run db:migrate` to apply the checked-in additive migrations instead. Both commands read `DATABASE_URL` from `.env.local`.

Start the development server:

```sh
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Use the admin password configured for that database to sign in at `/auth`.

## MCP for AI clients

The remote MCP endpoint is:

```text
https://YOUR_NOTES_DOMAIN/api/mcp
```

OAuth is the usual way to connect: the AI client opens Notes, you sign in, and you choose whether to grant read access, write access, or both. API-token authentication is also available for clients that support custom bearer headers. MCP write access can create or edit notes, move a note to trash, and restore it; permanent deletion is not exposed.

For the full connection walkthrough—including every MCP/OAuth URL, authentication and refresh behavior, request and response shapes, tool parameters, source-file responsibilities, and deployment details—read the **[MCP integration guide](MCP.md)**.

## Project documentation

- [MCP integration guide](MCP.md) — connect an AI client and understand the MCP implementation.
- [Deployment guide](DEPLOYMENT.md) — deploy the Notes web application.
- [REST API overview](API_OVERVIEW.md)
- [REST API reference](API_REFERENCE.md)
- [Security notes](SECURITY.md)
- [Changelog](CHANGES.md)

## Useful commands

```sh
npm run dev       # Start local development
npm run build     # Build for deployment
npm run start     # Start the production server
npm run db:init   # Initialize a new database
npm run db:migrate # Apply additive migrations to an existing database
```

## Configuration notes

Keep `.env.local` and all secrets out of version control. `DATABASE_URL` is used by the app and database scripts. `SESSION_SECRET` signs browser sessions and MCP consent forms. `NEXT_PUBLIC_USERNAME` and `NEXT_PUBLIC_LOGO` are optional display settings; see [.env.example](.env.example) for the complete list.

For an existing database, apply migrations before deploying code that depends on them. Back up the database before making production schema changes.
