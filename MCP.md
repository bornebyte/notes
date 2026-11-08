# Notes MCP server

This app exposes a remote MCP server at `https://your-domain.com/api/mcp`. It uses MCP Streamable HTTP and OAuth 2.1 authorization-code flow with PKCE, so compatible clients can discover the tools without a provider-specific integration.

## Setup

1. Set `MCP_BASE_URL` to the canonical HTTPS origin of the deployed site (no path), for example `https://notes.example.com`.
2. Apply [`migrations/20261108_add_mcp.sql`](migrations/20261108_add_mcp.sql) to an existing Neon database before deploying. Fresh databases created from `schema.sql` already include these tables.
3. Deploy the website over HTTPS. The OAuth authorization and protected-resource discovery documents are served at `/.well-known/oauth-authorization-server` and `/.well-known/oauth-protected-resource`.
4. Add `https://your-domain.com/api/mcp` to an MCP client. The client will open the website login and permission screen, then obtain short-lived access tokens.

`MCP_BASE_URL` falls back to `NEXT_PUBLIC_DOMAIN`, then `VERCEL_URL`. Set it explicitly in production so OAuth issuer, token audience, callback URLs, and Host validation all use the same stable domain. Preview deployment hosts are intentionally not accepted as MCP hosts.

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

Permanent deletion is not exposed. The authorization screen lets the user grant only the requested read and/or write scopes. Each connected client can be revoked under **Admin → Settings → MCP Connections**; revoking it removes its tokens immediately.

## Connect clients

### ChatGPT

In ChatGPT on the web, add a custom MCP server and use the URL above with **OAuth** authentication. This server supports OAuth discovery, public-client registration, PKCE (`S256`), resource-bound tokens, and refresh-token rotation. ChatGPT's custom MCP connection uses OAuth for authenticated servers; it cannot use this app's API key as a custom API-key credential.

### Claude and other hosted clients

Add the same HTTPS URL as a remote Streamable HTTP MCP server and choose the client's OAuth authentication option. Client UI and availability vary by product and account.

### Local clients

Use the same HTTPS URL in any MCP client that supports Streamable HTTP and OAuth. Clients that support custom bearer headers can instead use an API token created in **Admin → Settings → API Tokens**:

```text
Authorization: Bearer <api-token>
```

That token grants both read and write access to the Notes API. Treat it as a password and revoke it in Settings if it is lost. API-token values are shown only when created and are stored as hashes.

## Security behavior

- OAuth uses exact registered redirect-URI matching, short-lived single-use authorization codes, PKCE `S256`, resource-bound tokens, one-hour access tokens, and rotating 30-day refresh tokens.
- Access tokens, refresh tokens, authorization codes, and API tokens are stored as SHA-256 digests; raw OAuth credentials are never persisted.
- Requests require HTTPS in production, a valid resource-bound bearer token, per-tool scope checks, an allowed Host/Origin, bounded request sizes, and database-backed rate limits.
- Reads omit hidden and trashed notes. Search and list responses are bounded; full note reads are capped at 50,000 characters.
- Connected clients can edit notes when the user grants `notes:write`. The MCP client/model receives the note content the user asks it to read, so connect only clients and model providers you trust.

No internet-facing service can be guaranteed “unhackable.” Keep Next.js and dependencies current, protect the admin password and `SESSION_SECRET`, use HTTPS, review the OAuth permission screen, and revoke clients you no longer use.
