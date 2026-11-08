import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import {
    getMcpOrigin,
    getMcpResource,
    hasValidAdminSession,
    htmlEscape,
    MCP_SCOPES,
    newSecret,
    rateLimit,
    readLimitedText,
    secureHeaders,
    digest,
} from "@/lib/mcp/oauth";

export const runtime = "nodejs";

function errorPage(message, status = 400) {
    return new NextResponse(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>MCP authorization</title><body><main><h1>Can't authorize this connection</h1><p>${htmlEscape(message)}</p></main></body></html>`, {
        status,
        headers: secureHeaders({
            "Content-Type": "text/html; charset=utf-8",
            "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
        }),
    });
}

function redirectNoStore(url, status) {
    return new NextResponse(null, { status, headers: secureHeaders({ Location: url.toString() }) });
}

async function getAuthorizationRequest(params) {
    for (const field of ["client_id", "redirect_uri", "response_type", "code_challenge", "code_challenge_method", "resource", "scope", "state"]) {
        if (params.getAll(field).length > 1) throw new Error("Duplicate authorization parameter.");
    }

    const clientId = params.get("client_id");
    const redirectUri = params.get("redirect_uri");
    const responseType = params.get("response_type");
    const challenge = params.get("code_challenge");
    const challengeMethod = params.get("code_challenge_method");
    const resource = params.get("resource") || getMcpResource();
    const state = params.get("state") || "";
    const requestedScopes = [...new Set((params.get("scope") || "notes:read").split(/\s+/).filter(Boolean))];

    if (!clientId || !redirectUri || responseType !== "code"
        || challengeMethod !== "S256" || !/^[A-Za-z0-9_-]{43}$/.test(challenge)
        || state.length > 512 || resource !== getMcpResource()
        || requestedScopes.length < 1
        || requestedScopes.some((scope) => !MCP_SCOPES.includes(scope))) {
        throw new Error("The authorization request is invalid or asks for unsupported permissions.");
    }

    const clients = await sql`
        SELECT client_id, client_name, redirect_uris
        FROM mcp_oauth_clients WHERE client_id = ${clientId} LIMIT 1
    `;
    if (!clients.length) throw new Error("This MCP client is not registered.");

    const redirectUris = Array.isArray(clients[0].redirect_uris)
        ? clients[0].redirect_uris
        : JSON.parse(clients[0].redirect_uris || "[]");
    if (!redirectUris.includes(redirectUri)) throw new Error("The redirect address is not registered for this client.");

    return {
        clientId,
        clientName: clients[0].client_name,
        redirectUri,
        challenge,
        state,
        resource,
        requestedScopes,
    };
}

function toLogin(request, params = new URL(request.url).searchParams) {
    const target = `/api/oauth/authorize?${params.toString()}`;
    const loginUrl = new URL("/auth", getMcpOrigin());
    loginUrl.searchParams.set("returnTo", target);
    return redirectNoStore(loginUrl, 302);
}

export async function GET(request) {
    try {
        const authorization = await getAuthorizationRequest(new URL(request.url).searchParams);
        if (!await hasValidAdminSession()) return toLogin(request);

        const scopeDescriptions = {
            "notes:read": "view and search notes",
            "notes:write": "create, update, trash, and restore notes",
        };
        const scopeOptions = authorization.requestedScopes
            .map((scope) => `<label><input type="checkbox" name="approved_scope" value="${htmlEscape(scope)}" checked> ${htmlEscape(scope)} — ${scopeDescriptions[scope]}</label>`)
            .join("");
        const hidden = [
            ["client_id", authorization.clientId],
            ["redirect_uri", authorization.redirectUri],
            ["response_type", "code"],
            ["code_challenge", authorization.challenge],
            ["code_challenge_method", "S256"],
            ["scope", authorization.requestedScopes.join(" ")],
            ["state", authorization.state],
            ["resource", authorization.resource],
        ].map(([key, value]) => `<input type="hidden" name="${key}" value="${htmlEscape(value)}">`).join("");

        const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Connect ${htmlEscape(authorization.clientName)}</title>
<style>body{font:16px system-ui,sans-serif;background:#f4f4f5;color:#18181b;margin:0;padding:32px}.card{max-width:520px;margin:8vh auto;background:white;border:1px solid #ddd;border-radius:16px;padding:28px;box-shadow:0 10px 40px #0001}h1{font-size:1.5rem}.scope{display:grid;gap:14px;padding:16px;background:#f4f4f5;border-radius:10px}.actions{display:flex;gap:12px;margin-top:24px}button{border:0;border-radius:8px;padding:11px 18px;font:inherit;cursor:pointer}.allow{background:#18181b;color:white}.deny{background:#e4e4e7}code{word-break:break-all}</style></head>
<body><main class="card"><h1>Connect ${htmlEscape(authorization.clientName)}</h1><p>This client is requesting access to your notes. Choose only the permissions it needs.</p><p>OAuth will send a one-time code to <code>${htmlEscape(authorization.redirectUri)}</code>.</p><form method="post" action="${htmlEscape(`${getMcpOrigin()}/api/oauth/authorize`)}">${hidden}<div class="scope">${scopeOptions}</div><div class="actions"><button class="allow" name="decision" value="approve">Allow access</button><button class="deny" name="decision" value="deny">Cancel</button></div></form><p><small>Access expires automatically. You can revoke this connection in Settings.</small></p></main></body></html>`;

        return new NextResponse(html, {
            headers: secureHeaders({
                "Content-Type": "text/html; charset=utf-8",
                "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
            }),
        });
    } catch {
        return errorPage("The authorization request is invalid, or this client is no longer registered.");
    }
}

export async function POST(request) {
    try {
        const origin = request.headers.get("origin");
        if (!origin || origin !== getMcpOrigin()) return errorPage("This request did not come from the website.", 403);
        const size = Number(request.headers.get("content-length") || 0);
        if (size > 8192) return errorPage("The authorization request is too large.", 413);
        if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/x-www-form-urlencoded")) {
            return errorPage("The authorization form is invalid.");
        }
        const limit = await rateLimit("oauth-authorize", 30, 60, request);
        if (!limit.allowed) return errorPage("Too many authorization attempts. Try again shortly.", 429);
        const body = await readLimitedText(request, 8192);
        const form = new URLSearchParams(body);
        if (!await hasValidAdminSession()) {
            const preserved = new URLSearchParams(form);
            preserved.delete("decision");
            preserved.delete("approved_scope");
            return toLogin(request, preserved);
        }
        const authorization = await getAuthorizationRequest(form);
        const callback = new URL(authorization.redirectUri);
        const issuer = getMcpOrigin();
        const state = authorization.state;

        if (form.get("decision") !== "approve") {
            callback.searchParams.set("error", "access_denied");
            callback.searchParams.set("iss", issuer);
            if (state) callback.searchParams.set("state", state);
            return redirectNoStore(callback, 303);
        }

        const approvedScopes = [...new Set(form.getAll("approved_scope"))];
        if (approvedScopes.some((scope) => !authorization.requestedScopes.includes(scope))) {
            return errorPage("The selected permissions are invalid.");
        }

        if (!approvedScopes.length) {
            callback.searchParams.set("error", "access_denied");
            callback.searchParams.set("iss", issuer);
            if (state) callback.searchParams.set("state", state);
            return redirectNoStore(callback, 303);
        }

        const code = newSecret("mcp_code_");
        await sql`
            INSERT INTO mcp_oauth_codes
                (code_hash, client_id, redirect_uri, code_challenge, scope, resource, expires_at)
            VALUES
                (${digest(code)}, ${authorization.clientId}, ${authorization.redirectUri},
                 ${authorization.challenge}, ${approvedScopes.join(" ")}, ${authorization.resource},
                 ${new Date(Date.now() + 120_000)})
        `;

        callback.searchParams.set("code", code);
        callback.searchParams.set("iss", issuer);
        if (state) callback.searchParams.set("state", state);
        return redirectNoStore(callback, 303);
    } catch (error) {
        if (error?.message !== "request_too_large") console.error("MCP OAuth authorization failed.");
        return errorPage(
            error?.message === "request_too_large" ? "The authorization request is too large." : "The authorization request could not be completed.",
            error?.message === "request_too_large" ? 413 : 400,
        );
    }
}
