# Notes MCP Integration Guide

This guide explains how an AI client connects to the Notes [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server. It covers the OAuth connection flow, URLs and endpoints, authentication, tool inputs and outputs, relevant source files, and MCP deployment configuration.

For an overview of the Notes project and instructions for using the web application, see [README.md](README.md).

## The quick version

- MCP server URL: `https://YOUR_NOTES_DOMAIN/api/mcp`
- Normal connection method: OAuth authorization code flow with PKCE (`S256`). You sign in to Notes and approve the requested permissions in a browser.
- MCP scopes: `notes:read` and `notes:write`. You can approve only the permissions you want to grant.
- An alternate method for clients that support custom bearer headers is an API token created in **Admin → Settings → API Tokens**.
- OAuth access tokens last at most one hour. A refresh grant lasts for the duration selected at consent, and can be revoked or changed in **Admin → Settings → MCP Connections**.
- Notes in trash and notes marked hidden are excluded from MCP reads. MCP does not expose permanent deletion.

Replace `YOUR_NOTES_DOMAIN` with the canonical public domain where this Notes application runs. Do not add `/api/mcp` to `MCP_BASE_URL`; it is the MCP endpoint path, not the site origin.

## What an AI connection means

The AI client connects to the Notes server. Notes does not send all of your notes to the AI automatically. The client asks the server to use a tool, and the server returns that tool's result. For example, a client can call `list_notes` to receive titles and metadata, then call `get_note` to receive the content of one note.

When the server returns note text, that text is available to the AI client and its model provider as part of the conversation or tool result. Only connect clients and model providers you trust. Note contents are treated by the MCP server as data, not as instructions for the AI.

The authorization screen controls which tools can be used:

| Permission | Allows |
| --- | --- |
| `notes:read` | List note metadata, search note titles and bodies, and read a note. |
| `notes:write` | Create and update notes, move notes to trash, and restore notes. |

The screen also lets you choose how long the client can refresh its authorization: 1 hour, 1 day, 7 days, 30 days, or no expiry. The default is 30 days. “No expiry” remains active until you revoke it. Access tokens still expire after at most one hour in every case.

## Connect an AI client

1. Deploy the Notes app at a public HTTPS URL.
2. Set `MCP_BASE_URL` to the app's canonical origin, such as `https://notes.example.com`.
3. Apply the MCP database migrations as described in [Database setup](#database-setup).
4. In the AI client, add a custom or remote MCP server using `https://notes.example.com/api/mcp` and choose OAuth when asked for an authentication method.
5. The AI client opens Notes in a browser. Sign in if asked, review the permission and connection duration, and approve or cancel.
6. After approval, the AI client finishes connecting and can discover the Notes tools. In the client's settings, make sure the tools you want to use are enabled.

The exact names and locations of MCP settings differ between AI products and can change over time. The server URL and OAuth flow above are the details this Notes application provides.

### Use an API token instead

If the MCP client supports a custom bearer token, create an API token under **Admin → Settings → API Tokens**, then configure the MCP server with:

```text
URL: https://notes.example.com/api/mcp
Authorization: Bearer YOUR_API_TOKEN
```

For MCP, send the token in the standard `Authorization: Bearer ...` header. The Notes REST API also accepts the same token in `X-API-Token`, but that header is not what the MCP endpoint checks. An API token grants both MCP scopes (`notes:read` and `notes:write`); it cannot be limited to read-only access. Treat it like your account password and revoke it in Settings if it is exposed.

Use the OAuth option when the client offers it. Use the API-token option only if the client lets you set a custom bearer header. The client's own documentation explains where its MCP connection settings are.

## URLs used during connection

Let `ORIGIN` mean the configured site origin, for example `https://notes.example.com`. The MCP resource URL is `ORIGIN/api/mcp`.

### MCP endpoint

| URL | Methods | Purpose |
| --- | --- | --- |
| `ORIGIN/api/mcp` | `POST`, `GET`, `DELETE` | Streamable HTTP MCP endpoint. It handles MCP protocol traffic such as initialization, tool discovery, and tool calls. Each request must pass host and origin validation and bearer authentication. |

The official MCP server SDK handles the MCP protocol details after the route's checks pass. The request body limit is 64 KiB. Authenticated MCP clients are limited to 120 requests per minute per client and source IP.

### OAuth discovery URLs

| URL | Method | Purpose |
| --- | --- | --- |
| `ORIGIN/.well-known/oauth-protected-resource` | `GET` | Protected-resource metadata. It tells an MCP client which authorization server protects `/api/mcp`, which scopes exist, and that bearer tokens are sent in a header. |
| `ORIGIN/.well-known/oauth-authorization-server` | `GET` | Authorization-server metadata. It tells the client the authorization, token, and registration endpoint URLs and the supported OAuth features. |
| `ORIGIN/.well-known/openid-configuration` | `GET` | Returns the same authorization-server metadata as the OAuth authorization-server URL. |

The app also serves equivalent protected-resource metadata at `ORIGIN/.well-known/oauth-protected-resource/mcp` and `ORIGIN/.well-known/oauth-protected-resource/api/mcp`, and equivalent authorization-server metadata at `ORIGIN/.well-known/oauth-authorization-server/api/mcp`. These are path-specific discovery aliases; they do not create different OAuth servers.

Protected-resource metadata has this shape (the actual values come from `MCP_BASE_URL`):

```json
{
  "resource": "https://notes.example.com/api/mcp",
  "authorization_servers": ["https://notes.example.com"],
  "scopes_supported": ["notes:read", "notes:write"],
  "bearer_methods_supported": ["header"]
}
```

Authorization-server metadata has this shape:

```json
{
  "issuer": "https://notes.example.com",
  "authorization_endpoint": "https://notes.example.com/api/oauth/authorize",
  "token_endpoint": "https://notes.example.com/api/oauth/token",
  "registration_endpoint": "https://notes.example.com/api/oauth/register",
  "response_types_supported": ["code"],
  "grant_types_supported": ["authorization_code", "refresh_token"],
  "token_endpoint_auth_methods_supported": ["none"],
  "code_challenge_methods_supported": ["S256"],
  "scopes_supported": ["notes:read", "notes:write"],
  "client_id_metadata_document_supported": false,
  "authorization_response_iss_parameter_supported": true
}
```

### OAuth endpoints

| URL | Method | Purpose |
| --- | --- | --- |
| `ORIGIN/api/oauth/register` | `POST` | Public OAuth dynamic client registration. The AI client registers its display name and redirect URLs and receives a public client ID. Registration by itself does not grant access to notes. |
| `ORIGIN/api/oauth/authorize` | `GET`, `POST` | `GET` validates an authorization request and renders the Notes sign-in redirect or permission screen. `POST` validates the submitted permission form and either denies access or creates a short-lived authorization code and redirects back to the registered client. |
| `ORIGIN/api/oauth/token` | `POST` | Exchanges an authorization code for access and refresh tokens, or rotates tokens using a refresh token. The OAuth client is public and does not send a client secret. |
| `ORIGIN/api/oauth/clients` | `GET`, `PATCH`, `DELETE` | Private Settings API used to list registered MCP clients, change an active grant's duration, or remove a client and revoke its access. Requires a valid Notes admin session. |

### Sign-in and Settings URLs used by the browser

| URL | Purpose |
| --- | --- |
| `ORIGIN/auth` | Notes sign-in page. The OAuth flow redirects here if there is no valid Notes session, preserving the authorization request to continue after sign-in. |
| `ORIGIN/api/auth/login` | Browser login API. On a correct password it creates the Notes session cookie used by the consent screen and Settings. |
| `ORIGIN/api/auth/token` | Settings API for listing, creating, and revoking API tokens. Its methods require a valid Notes session cookie. |
| `ORIGIN/admin/settings` | Settings screen containing API Tokens and MCP Connections. |

The OAuth client does not receive the Notes password. The user signs in directly to the Notes website, and the AI client receives OAuth tokens after consent.

## What happens in OAuth, step by step

1. **The client starts with the MCP URL.** It contacts `ORIGIN/api/mcp` and discovers the protected-resource metadata URL from the server's authentication challenge or its MCP OAuth discovery support.
2. **The client discovers the authorization server.** It reads protected-resource metadata, then fetches `ORIGIN/.well-known/oauth-authorization-server` for the authorization, token, and registration endpoints.
3. **The client registers itself.** It sends `POST /api/oauth/register` with a client name and one or more callback URLs. Notes returns a public `client_id`. The redirect URLs are saved and must match exactly later.
4. **The client creates a PKCE request.** It makes a random verifier and its `S256` challenge, plus a random `state`, then opens `GET /api/oauth/authorize` with the client ID, exact redirect URL, response type `code`, challenge, `code_challenge_method=S256`, requested scopes, state, and resource URL.
5. **Notes checks the request.** The authorization route checks that the client exists, the redirect URL was registered, the resource matches this Notes server, PKCE is `S256`, and every requested scope is supported. The app does not accept arbitrary redirect URLs.
6. **The user signs in and reviews consent.** If the browser lacks a valid signed session, Notes redirects it to `/auth`, then returns to the same authorization request after login. Notes displays the requesting client, requested permissions, and grant-duration options. The user can deselect requested scopes.
7. **The browser submits the consent form.** It posts to `/api/oauth/authorize`. A five-minute HMAC-signed form token binds the submission to the authorization request and the signed admin session. This token protects the consent POST even when an embedded browser sends no matching `Origin` header; the app does not rely on an arbitrary Origin as proof of consent.
8. **Notes returns a one-time code.** If approved, Notes stores a hash of a random authorization code, bound to the client, redirect URL, PKCE challenge, approved scopes, resource, and grant duration. The code expires after two minutes. Notes redirects to the registered callback with `code`, `iss`, and the original `state` if one was supplied. If denied, it redirects with `error=access_denied` instead.
9. **The client exchanges the code.** It posts the code, the exact redirect URL, client ID, and original PKCE verifier to `/api/oauth/token`. Notes checks the code is valid, unexpired, unused, for the same client and redirect, and that the verifier hashes to the saved challenge.
10. **Notes issues tokens.** The client receives a bearer access token and a refresh token. Notes stores hashes of the credentials, not their raw values. The access token expires in at most one hour; the refresh token follows the duration selected on the consent screen.
11. **The client calls MCP.** It sends `Authorization: Bearer ACCESS_TOKEN` to `/api/mcp`. Notes checks the token, resource, expiry, client, and required scope before the MCP SDK handles the request.
12. **The client refreshes access.** When the access token expires, the client posts its refresh token to `/api/oauth/token`. Notes invalidates that refresh token and issues a new access token and a new refresh token. The previous refresh token cannot be reused.

The authorization code, access token, and refresh token are random secrets. Database records hold SHA-256 digests. The refresh grant expires at the time chosen during consent; using a refresh token rotates it but does not extend that grant's expiry. A user can revoke the client under **Admin → Settings → MCP Connections**; removing the client also removes its related OAuth records.

## OAuth endpoint details

### `POST /api/oauth/register`

This endpoint accepts JSON and is intentionally usable before a user signs in. It is rate-limited to 10 attempts per source IP per hour and accepts request bodies up to 8 KiB.

Request fields:

```json
{
  "client_name": "ChatGPT",
  "redirect_uris": ["https://client.example/callback"]
}
```

- `redirect_uris`: required array with 1–10 URLs. The server saves the unique URLs. HTTPS URLs, loopback HTTP URLs, and non-web custom callback schemes are supported; credentials and fragments are rejected. Some dangerous schemes (such as `javascript:` and `data:`) are rejected.
- `client_name`: optional string, trimmed and capped at 100 characters. If omitted, the name is `MCP client`.

Successful response (`201`):

```json
{
  "client_id": "mcp_client_RANDOM_VALUE",
  "client_id_issued_at": 1794000000,
  "client_name": "ChatGPT",
  "redirect_uris": ["https://client.example/callback"],
  "grant_types": ["authorization_code", "refresh_token"],
  "response_types": ["code"],
  "token_endpoint_auth_method": "none",
  "scope": "notes:read notes:write"
}
```

The sample client ID and timestamp above are illustrative. The returned client ID is not a secret and is not authorization to access notes. Errors use JSON such as `{"error":"invalid_redirect_uri"}`, `{"error":"invalid_client_metadata"}`, `{"error":"rate_limited"}`, or `{"error":"server_error"}`.

### `GET` and `POST /api/oauth/authorize`

The AI client calls `GET` with OAuth authorization query parameters. Required values include:

| Query parameter | Meaning |
| --- | --- |
| `client_id` | Previously registered public client ID. |
| `redirect_uri` | One of that client's registered URLs, matched exactly. |
| `response_type` | Must be `code`. |
| `code_challenge` | Base64url PKCE `S256` challenge (43 characters). |
| `code_challenge_method` | Must be `S256`. |
| `scope` | Space-separated supported scopes. If omitted, the server defaults to `notes:read`. |
| `state` | Client-generated state, returned in the callback if present. |
| `resource` | The MCP resource URL. The canonical `/api/mcp` URL is used if omitted. |

For an unauthenticated browser, `GET` returns a `302` to `/auth?returnTo=...`. With a valid session it returns an HTML consent page. The page defaults to all requested scopes selected and the grant duration set to `30d`.

The browser submits an `application/x-www-form-urlencoded` POST to the same endpoint. The form contains the authorization request values, `consent_token`, one `grant_duration` (`1h`, `1d`, `7d`, `30d`, or `never`), the selected `approved_scope` values, and `decision=approve` or `decision=deny`. A valid signed Notes session and consent token are required. The POST is limited to 8 KiB and 30 attempts per source IP per minute.

On approval, the browser is redirected to the registered callback with query parameters in this form:

```text
https://client.example/callback?code=mcp_code_RANDOM_VALUE&iss=https%3A%2F%2Fnotes.example.com&state=CLIENT_STATE
```

`state` is included only if the client supplied it. On denial, the callback gets `error=access_denied`, `iss`, and `state` (when present), with no authorization code. If the embedded browser cannot follow the redirect automatically, the route renders a small redirect fallback page.

### `POST /api/oauth/token`

This endpoint accepts URL-encoded form data, allows bodies up to 8 KiB, and is rate-limited to 30 attempts per source IP per minute. It rejects client secrets because this server registers public OAuth clients.

Authorization-code exchange fields:

```text
grant_type=authorization_code
client_id=CLIENT_ID
code=CODE_FROM_CALLBACK
redirect_uri=THE_SAME_REGISTERED_REDIRECT_URI
code_verifier=THE_ORIGINAL_PKCE_VERIFIER
resource=https://notes.example.com/api/mcp
```

Refresh fields:

```text
grant_type=refresh_token
client_id=CLIENT_ID
refresh_token=CURRENT_REFRESH_TOKEN
resource=https://notes.example.com/api/mcp
```

Successful response:

```json
{
  "access_token": "mcp_at_RANDOM_VALUE",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "mcp_rt_RANDOM_VALUE",
  "scope": "notes:read notes:write",
  "refresh_token_expires_in": 2592000
}
```

`refresh_token_expires_in` is omitted for a `never` grant. `expires_in` is in seconds and can be less than 3600 near the end of a grant. On refresh, Notes rotates both tokens; clients must save and use the new refresh token. OAuth errors are JSON with an `error` value such as `invalid_request`, `invalid_client`, `invalid_grant`, `unauthorized_client`, `unsupported_grant_type`, `slow_down`, or `server_error`.

### `GET`, `PATCH`, and `DELETE /api/oauth/clients`

These routes are for the signed-in Settings screen, not for an AI agent. Every method requires a valid Notes session cookie.

- `GET /api/oauth/clients` returns `{ "success": true, "server_url": ".../api/mcp", "clients": [...] }`. Each client entry includes its ID, display name, registration and last-authorization times, active and total grant counts, and the active grant's duration and expiry fields. It does not return OAuth token values.
- `PATCH /api/oauth/clients?id=CLIENT_ID` accepts a JSON object whose `duration` is `1h`, `1d`, `7d`, `30d`, or `never`, for example `{"duration":"1h"}`. It requires a same-origin request. It changes active, unexpired grants and responds with `{ "success": true, "duration": "...", "expires_at": "...", "active_grants": 1 }`. If there is no active authorization, it returns `409` and asks the user to reconnect the client.
- `DELETE /api/oauth/clients?id=CLIENT_ID` requires a same-origin request. It deletes the registered client; the database's cascading foreign keys remove its codes and tokens too. Success is `{ "success": true }`.

The Settings page distinguishes a registered client that has not completed OAuth from a connected client and an expired client. A registration is not considered connected until OAuth token issuance has completed.

## MCP tools available to the AI client

The server advertises seven tools. Each tool validates a strict JSON input object, checks its scope, and returns an MCP text content block whose `text` contains JSON (for successful results) or a short safe error message. The SDK wraps this tool result in the normal MCP/JSON-RPC response; these examples show the tool content rather than a full JSON-RPC envelope.

### `list_notes` — requires `notes:read`

Input:

```json
{ "limit": 20 }
```

`limit` is an integer from 1 to 50 and defaults to 20. Returns the most recently created visible notes in descending ID order. Note bodies are not returned. Hidden and trashed notes are excluded.

The text content is a JSON array with entries shaped like:

```json
[
  {
    "id": 12,
    "title": "Planning",
    "category": "Work",
    "created_at": "11/8/2026, 10:00:00 AM",
    "lastupdated": null,
    "fav": false
  }
]
```

### `search_notes` — requires `notes:read`

Input:

```json
{ "query": "planning", "limit": 20 }
```

`query` is required, trimmed, and 1–200 characters. `limit` is an integer from 1 to 50 and defaults to 20. Search checks title and body case-insensitively, excludes hidden and trashed notes, orders results by descending ID, and returns at most 1,200 body characters per matching note as `excerpt`.

Example result entry:

```json
{
  "id": 12,
  "title": "Planning",
  "excerpt": "First part of the note...",
  "category": "Work",
  "created_at": "11/8/2026, 10:00:00 AM",
  "lastupdated": null,
  "fav": false
}
```

### `get_note` — requires `notes:read`

Input:

```json
{ "id": 12 }
```

`id` is a positive 32-bit integer. Returns one visible, non-trashed note, including its body. The body is capped at 50,000 characters. The `truncated` field is `true` when the stored body was longer than that limit.

```json
{
  "id": 12,
  "title": "Planning",
  "body": "Full note text, up to 50,000 characters...",
  "truncated": false,
  "category": "Work",
  "created_at": "11/8/2026, 10:00:00 AM",
  "lastupdated": null,
  "fav": false
}
```

If the note is hidden, trashed, or does not exist, the tool returns `Note not found.`

### `create_note` — requires `notes:write`

Input:

```json
{ "title": "Shopping", "body": "Apples and tea", "category": "Personal" }
```

- `title`: required, trimmed, 1–255 characters.
- `body`: required, 1–50,000 characters. It is not trimmed.
- `category`: optional, trimmed, at most 255 characters. An empty category is stored as `null`.

Returns:

```json
{ "success": true, "id": 34, "title": "Shopping" }
```

The route also adds a Notes notification indicating that MCP created a note. The database uses the app's existing `&apos;` encoding convention for apostrophes in titles and bodies; tool reads decode that convention.

### `update_note` — requires `notes:write`

Input can contain any one or more of `title`, `body`, and `category`, plus the required ID:

```json
{ "id": 34, "title": "Groceries", "category": "Home" }
```

- `id`: required positive 32-bit integer.
- `title`: optional; if supplied, trimmed and 1–255 characters.
- `body`: optional; if supplied, 1–50,000 characters.
- `category`: optional; if omitted, the existing category stays. If supplied as an empty string, the category is cleared to `null`.
- At least one editable field must be supplied.

Only visible, non-trashed notes can be updated. Omitted title/body/category fields retain their current value. The update timestamp is changed, and a Notes notification is added.

Success:

```json
{ "success": true, "id": 34, "title": "Groceries" }
```

### `trash_note` — requires `notes:write`

Input: `{ "id": 34 }`.

Moves a visible note to trash. This is reversible and does not permanently delete the note. Success:

```json
{ "success": true, "id": 34, "trashed": true }
```

The tool is marked destructive in its MCP annotations so clients can present it accordingly. The tool description says to use it only when the user explicitly asks.

### `restore_note` — requires `notes:write`

Input: `{ "id": 34 }`.

Restores a hidden=false note that is currently in trash. Success:

```json
{ "success": true, "id": 34, "trashed": false }
```

### Tool errors and validation

Database errors are converted into short messages such as `Could not list notes.`, `Could not search notes.`, `Could not read this note.`, `Could not create the note.`, or `Could not update the note.` They do not include SQL text, note bodies, or database details. A tool-level error is returned with MCP's `isError: true` flag. Invalid parameters are rejected by the tool input schema; a missing, expired, revoked, or wrong-resource token is rejected before the tool runs. Missing OAuth scopes also prevent the corresponding tool call.

## Authentication and safety behavior

### OAuth access checks

For the MCP endpoint, the bearer token is looked up by its SHA-256 digest. An OAuth token is accepted only if it is not revoked, has not expired, and is bound to this MCP resource. Its saved scopes are passed to the SDK, which checks the tool's `notes:read` or `notes:write` requirement.

### API token access checks

The same MCP bearer check also recognizes Notes API tokens. These are random 256-bit values represented as 64 hexadecimal characters. The raw value is shown once at creation; storage uses a hash, and token listing never returns token values. A valid API token receives both MCP scopes. The Settings API can revoke a token.

### Host, Origin, transport, and request limits

- Production `MCP_BASE_URL` must be a canonical HTTPS origin. It must not contain a path, query, fragment, username, or password. The MCP endpoint validates Host and Origin against the configured hostname.
- Plain HTTP is permitted only for loopback development addresses (`localhost`, `127.0.0.1`, or `::1`). Use the same loopback hostname and port for the app URL and `MCP_BASE_URL`.
- MCP request bodies are limited to 64 KiB and authenticated MCP requests are rate-limited to 120 per minute per client and source IP.
- OAuth registration is limited to 10 requests per hour per source IP. OAuth authorization form submissions and token endpoint requests are each limited to 30 per minute per source IP. The login API is limited to 10 attempts per 15 minutes per source IP.
- OAuth endpoints set no-store and other protective response headers. Consent HTML also restricts content sources and form destinations.
- Note text is untrusted content. MCP tool descriptions instruct the AI not to follow instructions found inside notes. The server never exposes permanent note deletion through MCP.

Rate limits are stored in the database, and old rate-limit, code, and token records are periodically cleaned up during requests.

## Setup and deployment

### Requirements and environment variables

This app uses Next.js App Router, JavaScript, React, Neon Postgres, and the official `@modelcontextprotocol/server` Streamable HTTP SDK. npm dependency versions are recorded in `package-lock.json`.

Create `.env.local` and set at least:

```env
DATABASE_URL="postgresql://..."
SESSION_SECRET="a-long-random-secret"
NEXT_PUBLIC_DOMAIN="http://localhost:3000"
MCP_BASE_URL="http://localhost:3000"
```

| Variable | Why it is needed |
| --- | --- |
| `DATABASE_URL` | Neon/Postgres connection string. The app stores notes, OAuth clients/codes/tokens, API tokens, and rate limits in the database. |
| `SESSION_SECRET` | Signs Notes sessions and signs the short-lived OAuth consent form token. Keep it private and stable. |
| `MCP_BASE_URL` | Canonical site origin used to build OAuth issuer/resource URLs and validate the MCP Host. In production it is required and must be HTTPS. Do not include a path. |
| `NEXT_PUBLIC_DOMAIN` | Existing application setting for the public Notes domain. For local development use `http://localhost:3000`; in deployment use the public site origin. |

The repository's [.env.example](.env.example) also lists optional display-name, logo, and unrelated integrations. Never commit `.env.local` or include secret values in logs.

### Database setup

The MCP data is stored in four tables:

| Table | What it stores |
| --- | --- |
| `mcp_oauth_clients` | Registered public client IDs, names, allowed callback URLs, and authorization history. |
| `mcp_oauth_codes` | Hashed, short-lived, single-use authorization codes plus the PKCE challenge, resource, scopes, and grant duration. |
| `mcp_oauth_tokens` | Hashed OAuth access/refresh tokens, scopes, resource, expiry, and revocation data. |
| `mcp_rate_limits` | Hashed request-limit keys and per-window counters. |

For a **new database**, apply the complete schema and additive migrations:

```sh
npm run db:init
```

For an **existing Notes database**, apply the migrations before deploying the MCP code:

```sh
npm run db:migrate
```

These scripts read `DATABASE_URL` from `.env.local`. `db:init` applies `schema.sql` and both migration files. `db:migrate` applies `migrations/20261108_add_mcp.sql` and `migrations/20261108_add_mcp_grant_expiry.sql`. The SQL files use additive/idempotent table and column setup. The base schema also contains the current MCP table definitions for newly initialized databases.

Do not manually substitute untrusted input into SQL. Runtime database queries use the parameterized tagged-template API from `@/lib/db`.

### Run locally

```sh
npm install
npm run db:init   # New local database only; use db:migrate for an existing Notes database.
npm run dev
```

The local MCP URL is `http://localhost:3000/api/mcp`. For local OAuth, keep both `NEXT_PUBLIC_DOMAIN` and `MCP_BASE_URL` set to the exact local origin used in the browser. A hosted AI client cannot reach your computer's `localhost`; local URLs are for a local client. For hosted clients, deploy Notes over HTTPS and use its public MCP URL.

For deployment details beyond MCP, see [DEPLOYMENT.md](DEPLOYMENT.md).

## Managing connections and API tokens

Open **Admin → Settings** after signing in.

### MCP Connections

The MCP Connections panel gets its data from `/api/oauth/clients` and shows the server URL plus registered clients. A client changes to **Connected** only after OAuth token issuance. It may be **Pending authorization** after registration or **Expired** after a previously authorized grant expires.

For an active connection, Settings can change the refresh-grant duration to 1 hour, 1 day, 7 days, 30 days, or no expiry. If a shorter duration is selected, active access-token expiry is shortened too when it would otherwise extend beyond that grant. Disconnecting deletes the client record and cascades to its authorization codes and tokens. A disconnected client must authorize again to access notes.

### API Tokens

The API Tokens panel creates a random token, shows it once, lists token names and usage metadata without the raw token, and can revoke tokens. The API token is an alternate MCP authentication method for clients that support custom bearer headers. It is broader than an OAuth read-only grant because it gives both MCP scopes.

## Source code guide

These are the main files involved in the MCP connection. Paths are relative to the repository root.

### MCP endpoint and tools

| File | Responsibility |
| --- | --- |
| `app/api/mcp/route.js` | Defines the MCP server, tools, input schemas, tool outputs, HTTP method handlers, Host/Origin checks, bearer authentication, request-size checks, and MCP rate limiting. |
| `@modelcontextprotocol/server` | Dependency that implements Streamable HTTP and MCP protocol handling. `createMcpHandler` dispatches protocol messages to the per-request `createServer` factory. |
| `lib/db.js` | Creates the Neon SQL tagged-template client exported as `sql`, with a small retry wrapper for transient network failures. |

Functions in `app/api/mcp/route.js`:

| Function | Parameters | What it returns/does |
| --- | --- | --- |
| `output(data)` | Any JSON-serializable value. | MCP tool result with one text content block. Its `text` is `JSON.stringify(data)`. |
| `errorOutput(message)` | Safe error string. | MCP tool result with `isError: true` and one text content block. |
| `decodeNote(row)` | Database note row. | Copies the row and decodes the app's `&apos;` convention in `title` and `body`. |
| `createServer()` | No arguments. | Creates an `McpServer` named `notes-website` / `Notes`, registers the seven tools and their schemas, scope checks, annotations, and handlers, then returns the server. It is supplied to the SDK handler factory. |
| `handleMcpRequest(request)` | A Next.js `Request`. | Returns an HTTP `Response`: validates Host/Origin, checks body size, authenticates bearer token/resource, applies rate limit, and passes the request to the MCP SDK. A rate-limit response or unexpected internal failure is returned as JSON; host, origin, and bearer failures may be returned directly by the SDK validation helpers. |
| `POST(request)`, `GET(request)`, `DELETE(request)` | A Next.js `Request`. | Each delegates to `handleMcpRequest`; the SDK handles the supported Streamable HTTP behavior. |

The route uses Zod schemas: `titleSchema` trims titles and allows 1–255 characters; `bodySchema` allows 1–50,000 characters; `categorySchema` is optional, trimmed, and at most 255 characters. The read/write security metadata and `requireScopes(...)` on each tool let clients and the server identify required permissions. Tool annotations describe whether a tool is read-only, destructive, or idempotent.

### OAuth and authentication helpers

| File | Responsibility |
| --- | --- |
| `lib/mcp/oauth.js` | Shared constants and helpers for canonical origin/resource construction, grant durations, hashing, consent form signatures, limited request bodies, signed Notes session checks, HTML escaping, rate limits, token validation, and safe HTTP headers. |
| `lib/api-token.js` | Creates API tokens, hashes them, looks up valid tokens, updates last-used time, and upgrades legacy plaintext database values to hashes when they are encountered. |
| `lib/session.js` | Creates/deletes the Notes browser session cookie and encrypts/verifies its signed JWT. |
| `lib/auth.js` | Shared authentication helper for the application's normal protected REST APIs. MCP has its own OAuth/API bearer verification path in `lib/mcp/oauth.js`. |

Important exports from `lib/mcp/oauth.js`:

| Function or constant | Parameters | Return value / meaning |
| --- | --- | --- |
| `MCP_SCOPES`, `MCP_PATH` | — | Supported scopes (`notes:read`, `notes:write`) and endpoint path (`/api/mcp`). |
| `MCP_GRANT_DURATION_MS` | — | Map of `1h`, `1d`, `7d`, `30d`, and `never` to a duration in milliseconds or `null`. |
| `isMcpGrantDuration(value)` | Duration string. | Boolean indicating whether it is one of the allowed values. |
| `getMcpGrantExpiresAt(duration, from = Date.now())` | Duration and optional starting timestamp. | A `Date` at the grant expiry, or `null` for `never`; throws for invalid duration. |
| `getMcpOrigin()` | No arguments. | Canonical configured origin string. Outside production, an unset `MCP_BASE_URL` defaults to `http://localhost:3000`. Throws if production configuration is missing or invalid. |
| `getMcpResource()` | No arguments. | Canonical MCP resource URL: `getMcpOrigin() + /api/mcp`. |
| `getProtectedResourceMetadataUrl()` | No arguments. | Canonical protected-resource metadata URL used by the bearer-auth challenge. |
| `digest(value)` | String. | SHA-256 digest encoded as base64url. Used for stored credential hashes and comparisons. |
| `createConsentToken(authorization, sessionToken)` | Validated authorization values and signed Notes session cookie value. | Five-minute HMAC-signed form token bound to the request fields and session. Requires `SESSION_SECRET`. |
| `verifyConsentToken(token, authorization, sessionToken)` | Submitted token, validated authorization values, session cookie value. | Boolean; checks signature, time window, exact request binding, and session binding. |
| `newSecret(prefix)` | Prefix string. | Prefix plus 32 random bytes encoded as base64url. Used for client IDs, codes, and OAuth tokens. |
| `secureHeaders(extra = {})` | Optional extra header object. | Header object with no-store/no-cache, `nosniff`, and no-referrer defaults plus caller-supplied values. |
| `readLimitedText(request, maxBytes)` | Request and byte limit. | Promise of decoded request text; cancels and throws `request_too_large` when too large. |
| `getValidAdminSessionToken()` | No arguments. | Valid signed `session` cookie string, or `null`. |
| `hasValidAdminSession()` | No arguments. | Boolean based on `getValidAdminSessionToken()`. |
| `htmlEscape(value)` | Any value. | String escaped for HTML text/attribute insertion. |
| `rateLimit(key, maxRequests, windowSeconds, request)` | Logical bucket, maximum count, window length in seconds, optional request. | Promise of `{ allowed, retryAfter }`; database-backed counter keyed by a digest of the bucket and source IP. |
| `invalidTokenError()` | No arguments. | MCP SDK `OAuthError` for an invalid bearer token. |
| `verifyMcpAccessToken(token)` | Bearer token string. | Promise of `{ token, clientId, scopes, expiresAt, resource }` for a valid OAuth or API token; otherwise throws an OAuth invalid-token error. |
| `jsonError(error, status, extraHeaders = {})` | Error string, HTTP status, optional headers. | JSON `Response` with safe headers. |

### OAuth route files

| File | Handler functions and responsibility |
| --- | --- |
| `app/api/oauth/register/route.js` | `validRedirectUri(value)` checks callback URL syntax and safe scheme rules. `POST(request)` reads bounded JSON, rate-limits registration, validates metadata and callbacks, stores a new client, and returns client metadata. |
| `app/api/oauth/authorize/route.js` | `getAuthorizationRequest(params)` validates OAuth query/form values against the registered client and returns a normalized authorization object. `toLogin(request, params)` redirects to `/auth` with a `returnTo`. `GET(request)` renders login redirect, consent page, or an escaped error page. `POST(request)` checks the signed admin session and consent token, then denies or stores a hashed code and redirects to the registered callback. `errorPage`, `redirectNoStore`, and `redirectWithFallback` create safe HTML or redirect responses. |
| `app/api/oauth/token/route.js` | `tokenError(error, status)` creates no-store OAuth JSON errors. `sameValue(left, right)` compares strings using a timing-safe byte comparison. `issueTokens(clientId, scope, resource, grantDuration, grantExpiresAt)` creates/stores hashed access and refresh token records and returns the token JSON. `POST(request)` validates and exchanges an authorization code or rotates a refresh token. |
| `app/api/oauth/clients/route.js` | `unauthorized()` returns the session-required response. `GET()` lists client/grant status. `PATCH(request)` updates active grants' expiry. `DELETE(request)` removes the registered client and cascades its credentials. All methods require a valid Notes session; mutations also check same-origin. |

### Discovery route files

Each file exports `GET()` and uses shared helpers from `lib/mcp/oauth.js`:

| File | Returned metadata |
| --- | --- |
| `app/.well-known/oauth-protected-resource/route.js` | Canonical protected-resource metadata. |
| `app/.well-known/oauth-protected-resource/mcp/route.js` | Same protected-resource metadata at the `/mcp` alias. |
| `app/.well-known/oauth-protected-resource/api/mcp/route.js` | Same metadata at the resource-path alias. |
| `app/.well-known/oauth-authorization-server/route.js` | OAuth authorization-server metadata. |
| `app/.well-known/oauth-authorization-server/api/mcp/route.js` | Same authorization-server metadata at the `/api/mcp` alias. |
| `app/.well-known/openid-configuration/route.js` | Same authorization-server metadata for OpenID-style discovery clients. |

The discovery handlers return `{ "error": "server_misconfigured" }` with status 500 if the canonical origin cannot be built.

### Settings and token files

| File | Responsibility |
| --- | --- |
| `app/admin/settings/page.js` | Settings UI; renders the password, API-token, and MCP-connection controls. |
| `app/admin/settings/McpConnections.js` | Loads the client list, shows the MCP URL and connection status, updates grant duration, and disconnects/removes clients through `/api/oauth/clients`. |
| `app/admin/settings/ApiToken.js` | Creates, displays once, copies, lists, and revokes API tokens through `/api/auth/token`. |
| `app/api/auth/token/route.js` | `GET()` lists token metadata after checking the signed session. `POST(request)` validates a name, creates a 256-bit random token, saves only its hash, and returns the raw value once. `DELETE(request)` marks the selected token revoked. All methods require a valid session cookie. |
| `app/api/auth/login/route.js` | `POST(request)` checks the Notes password and, if correct, calls `createSession`; this is the login path used before OAuth consent when necessary. |
| `lib/session.js` | `createSession(password)` creates a seven-day signed, HTTP-only session cookie; `deleteSession()` clears it; `encrypt(payload)` returns a signed JWT; `decrypt(session)` returns the verified payload or no value when invalid/expired. |
| `lib/api-token.js` | `createApiToken()` returns 32 random bytes as 64 hex characters. `hashApiToken(token)` returns a tagged SHA-256 digest. `findApiToken(token)` validates and looks up the hash, updates `last_used`, and returns `{ id, name }` or `null`. `migrateLegacyApiTokens()` hashes any legacy plaintext token rows. |
| `lib/auth.js` | `verifyAuth(request)` checks a valid Notes session and then `X-API-Token`, returning authentication metadata. `requireAuth(request, options)` applies the regular REST API's in-memory rate limit and returns either `{ error: false, auth }` or an error/status/message object. This helper is not the bearer gate for `/api/mcp`. |

### Database and setup files

| File | Responsibility |
| --- | --- |
| `schema.sql` | Full schema for a new Notes database, including the current MCP tables. |
| `migrations/20261108_add_mcp.sql` | Additive setup of MCP clients, authorization codes, OAuth tokens, and rate-limit tables for an existing database. |
| `migrations/20261108_add_mcp_grant_expiry.sql` | Adds grant-duration, optional refresh expiry, and last-authorized tracking to support adjustable and no-expiry grants. |
| `scripts/db.js` | `main()` selects `init` or `migrate` and reads `DATABASE_URL`; `applyFile(database, relativePath)` applies a checked-in SQL file statement by statement; `splitStatements(source)` splits SQL while respecting strings and comments. |
| `package.json` | Defines `npm run dev`, `npm run build`, `npm run start`, `npm run db:init`, and `npm run db:migrate`, and declares the Next.js, Neon, and MCP dependencies. |
| `.env.example` | Example environment-variable names and local values; copy the needed values to a private `.env.local`. |

## Common connection problems

| Symptom | Likely cause / what to check |
| --- | --- |
| OAuth discovery returns `server_misconfigured` | `MCP_BASE_URL` is missing in production, or contains an invalid scheme, path, query, fragment, username, or password. Set the canonical HTTPS origin. |
| OAuth login or redirect points at the wrong domain | `MCP_BASE_URL` does not match the public site origin. Also ensure proxy/deployment configuration presents the expected canonical host. |
| HTTP local connection rejected | HTTP is allowed only for loopback. Set `MCP_BASE_URL` to the exact local hostname and port used by the client, for example `http://localhost:3000`. |
| Authorization says the client or redirect is invalid | Restart connection setup so the client registers its callback URL. OAuth requires an exact match to a redirect URL registered by that client. |
| Consent returns to login repeatedly | The browser must retain the Notes session cookie. Confirm `SESSION_SECRET` is configured consistently and the app is accessed through the same origin. |
| A tool is missing or returns an authorization error | Confirm the client has finished OAuth token issuance, that the consent screen granted the needed scope, and that the tool is enabled in the AI client's MCP settings. |
| Token is invalid or expired | OAuth access tokens last at most an hour; the client should refresh them. Check the grant has not expired or been revoked. For an API token, confirm it is active and send it as `Authorization: Bearer ...` to MCP. |
| MCP works locally but not from a hosted AI client | A hosted client cannot reach your computer's `localhost`; deploy the server to a public HTTPS origin. |
| Database setup fails | Check that `DATABASE_URL` points to the intended Neon/Postgres database and that the database user can create/alter the required tables. The script suppresses SQL and credential details in its error output. |

## Related project documentation

- [Project overview and web app usage](README.md)
- [Deployment guide](DEPLOYMENT.md)
- [REST API overview](API_OVERVIEW.md)
- [REST API reference](API_REFERENCE.md)
- [Security notes](SECURITY.md)
- [Changelog](CHANGES.md)
