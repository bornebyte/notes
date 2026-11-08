# Notes MCP server

This app exposes an MCP server at `https://notes.example.com/api/mcp`. It uses MCP Streamable HTTP and OAuth 2.1 authorization-code flow with PKCE, so compatible clients can discover the tools without a provider-specific integration.

## Setup

1. Set `MCP_BASE_URL` to the canonical HTTPS origin of the deployed site (no path), for example `https://notes.example.com`. Production requires this explicit value; preview deployment URLs are not used as the issuer.
2. For an existing Notes database, run `pnpm db:migrate` before deploying. For a new database, run `pnpm db:init`. Both commands read `DATABASE_URL` from `.env.local` and apply only the checked-in schema or additive migrations. A new schema uses the app's default admin password; change it immediately after the first sign-in.
3. Deploy the website over HTTPS. The OAuth authorization and protected-resource discovery documents are served at `/.well-known/oauth-authorization-server` and `/.well-known/oauth-protected-resource`.
4. Add `https://notes.example.com/api/mcp` to an MCP client. The client will open the website login and permission screen, then obtain short-lived access tokens.

In local development, set `NEXT_PUBLIC_DOMAIN=http://localhost:3000` and `MCP_BASE_URL=http://localhost:3000` in `.env.local`. If `MCP_BASE_URL` is omitted outside production, it defaults to `http://localhost:3000`. Plain HTTP is accepted only for loopback addresses; use the same hostname and port when connecting so Host and OAuth resource validation match.

## Tools

| Tool | Permission | What it does |
| --- | --- | --- |
| `list_notes` | `notes:read` | Lists visible note metadata, without bodies |
| `search_notes` | `notes:read` | Searches visible notes and returns short excerpts |
| `get_note` | `notes:read` | Reads one visible note |
| `create_note` | `notes:write` | Creates a note |
| `update_note` | `notes:write` | Updates a note |
| `trash_note` | `notes:write` | Moves a note to trash (reversible) |
| `restore_note` | `notes:write` | Restores a note from trash |

Permanent deletion is not exposed. The authorization screen lets the user grant only the requested read and/or write scopes and choose a grant duration: 1 hour, 1 day, 7 days, 30 days (default), or no expiry. Access tokens still expire hourly; the duration controls refresh access. The duration can be changed later under **Admin → Settings → MCP Connections**. No expiry remains active until manually revoked. The settings page distinguishes registered clients awaiting authorization from connected and expired clients; successful OAuth token issuance is recorded so expired connections remain visible after token cleanup. Revoking a client removes its tokens immediately.

## Connect clients

### ChatGPT

In ChatGPT on the web, add a custom MCP server and use the URL above with **OAuth** authentication. This server supports OAuth discovery, public-client registration, PKCE (`S256`), resource-bound tokens, and refresh-token rotation. ChatGPT's custom MCP connection uses OAuth for authenticated servers; it cannot use this app's API key as a custom API-key credential.

### Claude and other hosted clients

Add the same HTTPS URL as a remote Streamable HTTP MCP server and choose the client's OAuth authentication option. Client UI and availability vary by product and account.

### Local clients

For local testing, run `pnpm dev` and connect a local MCP client to `http://localhost:3000/api/mcp`. A local client with OAuth support can use the authorization flow and sign in to the Notes app at `http://localhost:3000`. Hosted clients cannot reach a server bound to your computer's `localhost`; use a deployed HTTPS URL with those clients.

Clients that support custom bearer headers can instead use an API token created in **Admin → Settings → API Tokens**:

```text
Authorization: Bearer <api-token>
```

For a direct local check, create a token in **Admin → Settings → API Tokens**, then run this command and paste the token at the hidden prompt:

```sh
read -rsp "API token: " MCP_API_TOKEN || exit 1
printf '\n'
curl --fail-with-body http://localhost:3000/api/mcp -H "Authorization: Bearer ${MCP_API_TOKEN}" -H 'Accept: application/json, text/event-stream' -H 'Content-Type: application/json' --data '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"local-smoke-test","version":"1.0.0"}}}'
curl_status=$?
unset MCP_API_TOKEN
exit "$curl_status"
```

An API token grants both read and write access to MCP tools. Treat it as a password and revoke it in Settings if it is lost. API-token values are shown only when created and are stored as hashes. OAuth clients receive only the scopes approved on the consent screen.

## Security behavior

- OAuth uses exact registered redirect-URI matching, short-lived single-use authorization codes, PKCE `S256`, resource-bound tokens, one-hour access tokens, and rotating refresh tokens whose lifetime is chosen during consent (30 days by default).
- Refresh grants default to 30 days and support 1 hour, 1 day, 7 days, or no expiry. No-expiry grants remain revocable from Settings; access tokens still rotate hourly.
- Access tokens, refresh tokens, authorization codes, and API tokens are stored as SHA-256 digests; raw OAuth credentials are never persisted.
- Requests require HTTPS in production (HTTP is limited to local loopback in development), a valid resource-bound bearer token, per-tool scope checks, an allowed Host/Origin, bounded request sizes, and database-backed rate limits. OAuth consent forms also carry a short-lived HMAC token bound to the exact authorization request and signed admin session, so embedded browser contexts can complete consent without trusting an arbitrary Origin.
- Reads omit hidden and trashed notes. Search and list responses are bounded; full note reads are capped at 50,000 characters.
- Connected clients can edit notes when the user grants `notes:write`. The MCP client/model receives the note content the user asks it to read, so connect only clients and model providers you trust.

No internet-facing service can be guaranteed “unhackable.” Keep Next.js and dependencies current, protect the admin password and `SESSION_SECRET`, use HTTPS, review the OAuth permission screen, and revoke clients you no longer use.
