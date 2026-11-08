import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import {
    getMcpOrigin,
    getMcpResource,
    getValidAdminSessionToken,
    getMcpGrantExpiresAt,
    htmlEscape,
    isMcpGrantDuration,
    MCP_SCOPES,
    createConsentToken,
    newSecret,
    rateLimit,
    readLimitedText,
    secureHeaders,
    digest,
    verifyConsentToken,
} from "@/lib/mcp/oauth";

export const runtime = "nodejs";

const authorizationStyles = `
    :root{color-scheme:light dark;--background:0 0% 100%;--foreground:0 0% 3.9%;--card:0 0% 100%;--muted:0 0% 96.1%;--muted-foreground:0 0% 45.1%;--border:0 0% 89.8%;--primary:0 0% 9%;--primary-foreground:0 0% 98%;--ring:0 0% 3.9%;--success:158 64% 37%}
    @media(prefers-color-scheme:dark){:root{--background:0 0% 3.9%;--foreground:0 0% 98%;--card:0 0% 3.9%;--muted:0 0% 14.9%;--muted-foreground:0 0% 63.9%;--border:0 0% 14.9%;--primary:0 0% 98%;--primary-foreground:0 0% 9%;--ring:0 0% 83.1%;--success:158 60% 52%}}
    *{box-sizing:border-box}
    body{margin:0;min-height:100vh;background:hsl(var(--background));color:hsl(var(--foreground));font:15px/1.55 ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}
    .page{min-height:100vh;display:flex;flex-direction:column;padding:0 24px;background:radial-gradient(ellipse at 50% -25%,hsl(var(--muted)) 0,transparent 58%),hsl(var(--background))}
    .topbar{width:100%;max-width:1040px;height:76px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid hsl(var(--border))}
    .brand{display:flex;align-items:center;gap:11px;color:hsl(var(--foreground));font-weight:700;font-size:18px;letter-spacing:-.035em;text-decoration:none}
    .brand-mark{width:34px;height:34px;display:grid;place-items:center;border-radius:10px;background:hsl(var(--primary));color:hsl(var(--primary-foreground));box-shadow:0 2px 8px #0002}
    .brand-mark svg{width:19px;height:19px}
    .secure-label{display:inline-flex;align-items:center;gap:7px;padding:7px 11px;border:1px solid hsl(var(--border));border-radius:999px;background:hsl(var(--card)/.75);color:hsl(var(--muted-foreground));font-size:12px;font-weight:600}
    .secure-label svg{width:14px;height:14px;color:hsl(var(--success))}
    main{width:100%;max-width:560px;margin:auto;padding:48px 0 56px}
    .card{overflow:hidden;border:1px solid hsl(var(--border));border-radius:20px;background:hsl(var(--card));box-shadow:0 20px 65px #00000012}
    .card-head{padding:32px 34px 25px;border-bottom:1px solid hsl(var(--border))}
    .connection-mark{display:flex;align-items:center;margin-bottom:25px}
    .app-mark,.notes-mark{width:42px;height:42px;display:grid;place-items:center;border:1px solid hsl(var(--border));border-radius:13px;background:hsl(var(--muted));color:hsl(var(--foreground))}
    .app-mark{font-size:12px;font-weight:800;letter-spacing:.04em}
    .notes-mark{background:hsl(var(--primary));color:hsl(var(--primary-foreground));border-color:transparent}
    .notes-mark svg{width:21px;height:21px}
    .connector{width:48px;height:1px;margin:0 10px;background:hsl(var(--border));position:relative}
    .connector:after{content:"";position:absolute;right:0;top:-3px;width:6px;height:6px;border-top:1px solid hsl(var(--muted-foreground));border-right:1px solid hsl(var(--muted-foreground));transform:rotate(45deg)}
    .eyebrow{margin:0 0 8px;color:hsl(var(--muted-foreground));font-size:11px;font-weight:750;letter-spacing:.12em;text-transform:uppercase}
    h1{margin:0;font-size:clamp(25px,5vw,31px);line-height:1.18;letter-spacing:-.045em;font-weight:730}
    .intro{margin:12px 0 0;color:hsl(var(--muted-foreground));font-size:14px;max-width:440px}
    .client-name{color:hsl(var(--foreground));font-weight:650}
    .card-body{padding:25px 34px 30px}
    .section-title{display:flex;align-items:center;justify-content:space-between;margin:0 0 12px;font-size:12px;font-weight:700;letter-spacing:.04em}
    .section-hint{color:hsl(var(--muted-foreground));font-size:11px;font-weight:500;letter-spacing:0}
    .permissions{display:grid;gap:9px}
    .permission{display:flex;align-items:flex-start;gap:12px;padding:14px;border:1px solid hsl(var(--border));border-radius:12px;background:hsl(var(--card));cursor:pointer;transition:border-color .15s,background-color .15s,transform .15s}
    .permission:hover{border-color:hsl(var(--muted-foreground)/.55);background:hsl(var(--muted)/.48);transform:translateY(-1px)}
    .permission:focus-within{outline:2px solid hsl(var(--ring));outline-offset:2px}
    .permission input{width:17px;height:17px;margin:2px 0 0;flex:none;accent-color:hsl(var(--primary));cursor:pointer}
    .permission-copy{min-width:0;flex:1}
    .permission-title{display:block;font-weight:650;font-size:13px}
    .permission-description{display:block;margin-top:3px;color:hsl(var(--muted-foreground));font-size:12px;line-height:1.45}
    .scope-tag{flex:none;margin-top:1px;padding:3px 7px;border:1px solid hsl(var(--border));border-radius:6px;color:hsl(var(--muted-foreground));font:10px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace}
    .duration-section{min-width:0;margin:21px 0 0;padding:0;border:0}
    .duration-legend{width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 11px;font-size:12px;font-weight:700;letter-spacing:.04em}
    .duration-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
    .duration-option{display:flex;align-items:flex-start;gap:9px;min-width:0;padding:10px 11px;border:1px solid hsl(var(--border));border-radius:10px;background:hsl(var(--card));cursor:pointer;transition:border-color .15s,background-color .15s}
    .duration-option:hover{border-color:hsl(var(--muted-foreground)/.55);background:hsl(var(--muted)/.48)}
    .duration-option:focus-within{outline:2px solid hsl(var(--ring));outline-offset:2px}
    .duration-option input{width:15px;height:15px;margin:2px 0 0;flex:none;accent-color:hsl(var(--primary));cursor:pointer}
    .duration-copy{min-width:0;display:block}
    .duration-name{display:block;font-size:12px;font-weight:650}
    .duration-detail{display:block;margin-top:2px;color:hsl(var(--muted-foreground));font-size:10px;line-height:1.4}
    .duration-recommended{margin-left:4px;color:hsl(var(--muted-foreground));font-size:9px;font-weight:600;letter-spacing:0}
    .duration-note{margin:9px 0 0;color:hsl(var(--muted-foreground));font-size:11px;line-height:1.5}
    .redirect-box{display:flex;align-items:flex-start;gap:11px;margin-top:18px;padding:13px 14px;border-radius:11px;background:hsl(var(--muted)/.65)}
    .redirect-box svg{width:16px;height:16px;flex:none;margin-top:2px;color:hsl(var(--muted-foreground))}
    .redirect-title{margin:0;font-size:11px;font-weight:700}
    .redirect-uri{display:block;margin-top:3px;color:hsl(var(--muted-foreground));font:11px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;overflow-wrap:anywhere}
    .actions{display:flex;flex-direction:row-reverse;gap:10px;margin-top:23px}
    .button{min-height:42px;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:0 17px;border:1px solid transparent;border-radius:9px;font:650 13px ui-sans-serif,system-ui,sans-serif;cursor:pointer;text-decoration:none;transition:transform .15s,background-color .15s,border-color .15s,box-shadow .15s}
    .button svg{width:16px;height:16px}
    .button:focus-visible{outline:2px solid hsl(var(--ring));outline-offset:3px}
    .button:hover{transform:translateY(-1px)}
    .button-primary{background:hsl(var(--primary));color:hsl(var(--primary-foreground));box-shadow:0 3px 10px #0002}
    .button-primary:hover{filter:brightness(.92)}
    .button-secondary{border-color:hsl(var(--border));background:hsl(var(--card));color:hsl(var(--foreground))}
    .button-secondary:hover{background:hsl(var(--muted))}
    .footnote{margin:17px 0 0;color:hsl(var(--muted-foreground));font-size:11px;text-align:center}
    .footer{width:100%;max-width:1040px;margin:0 auto;padding:0 0 22px;color:hsl(var(--muted-foreground));font-size:11px;text-align:center}
    .error-card{padding:34px}
    .error-mark{width:42px;height:42px;display:grid;place-items:center;margin-bottom:22px;border:1px solid hsl(var(--border));border-radius:13px;background:hsl(var(--muted));font-size:19px}
    .error-message{margin:17px 0 22px;padding:13px 15px;border:1px solid hsl(var(--border));border-radius:10px;background:hsl(var(--muted)/.65);color:hsl(var(--muted-foreground));font-size:13px}
    @media(max-width:560px){.page{padding:0 16px}.topbar{height:66px}.secure-label{font-size:11px;padding:6px 9px}main{padding:26px 0 34px}.card{border-radius:16px}.card-head{padding:25px 22px 21px}.card-body{padding:21px 22px 24px}.scope-tag{display:none}.duration-grid{grid-template-columns:1fr}.duration-legend{align-items:flex-start;flex-direction:column;gap:3px}.actions{flex-direction:column}.button{width:100%}.error-card{padding:26px 22px}}
    @media(prefers-reduced-motion:reduce){*,*:before,*:after{scroll-behavior:auto!important;transition:none!important}}
`;

function errorPage(message, status = 400) {
    return new NextResponse(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="color-scheme" content="light dark"><title>MCP authorization · Notes</title><style>${authorizationStyles}</style></head><body><div class="page"><header class="topbar"><a class="brand" href="/"><span class="brand-mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M7 4.75h7l4 4v10.5H7a2 2 0 0 1-2-2v-10.5a2 2 0 0 1 2-2Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M14 5v4h4M8.5 13h7M8.5 16h5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>Notes</a><span class="secure-label"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 10V7a5 5 0 0 1 10 0v3m-11 0h12v10H6V10Z" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>Secure connection</span></header><main><section class="card error-card"><div class="error-mark" aria-hidden="true">!</div><p class="eyebrow">Authorization</p><h1>Can’t authorize this connection</h1><p class="intro">The connection could not be completed. Return to your AI client and start the connection again.</p><p class="error-message">${htmlEscape(message)}</p><a class="button button-secondary" href="/">Back to Notes</a></section></main><footer class="footer">Your notes stay protected by your account permissions.</footer></div></body></html>`, {
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
    const state = params.get("state") || "";
    const resource = params.get("resource") || getMcpResource();
    const canonicalResource = getMcpResource();
    const allowedResources = new Set([canonicalResource, getMcpOrigin()]);

    if (!allowedResources.has(resource)) throw new Error("bad resource");
    const requestedScopes = [...new Set((params.get("scope") || "notes:read").split(/\s+/).filter(Boolean))];

    if (!clientId || !redirectUri || responseType !== "code"
        || challengeMethod !== "S256" || !/^[A-Za-z0-9_-]{43}$/.test(challenge)
        || state.length > 2048 || requestedScopes.length < 1
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
        resource: canonicalResource,
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
        const sessionToken = await getValidAdminSessionToken();
        if (!sessionToken) return toLogin(request);
        const consentToken = createConsentToken(authorization, sessionToken);

        const scopeDescriptions = {
            "notes:read": "View and search notes. Note titles and short excerpts may be shared with this AI client.",
            "notes:write": "Create, edit, move notes to trash, and restore notes when you ask.",
        };
        const scopeTitles = {
            "notes:read": "Read your notes",
            "notes:write": "Make changes to your notes",
        };
        const durationOptions = [
            { value: "1h", title: "1 hour", detail: "A short connection" },
            { value: "1d", title: "1 day", detail: "Access for one day" },
            { value: "7d", title: "7 days", detail: "Access for one week" },
            { value: "30d", title: "30 days", detail: "Recommended", recommended: true },
            { value: "never", title: "No expiry", detail: "Until you disconnect it" },
        ];
        const scopeOptions = authorization.requestedScopes
            .map((scope) => `<label class="permission"><input type="checkbox" name="approved_scope" value="${htmlEscape(scope)}" checked><span class="permission-copy"><span class="permission-title">${htmlEscape(scopeTitles[scope])}</span><span class="permission-description">${htmlEscape(scopeDescriptions[scope])}</span></span><span class="scope-tag">${htmlEscape(scope)}</span></label>`)
            .join("");
        const durationInputs = durationOptions
            .map((option) => `<label class="duration-option"><input type="radio" name="grant_duration" value="${option.value}"${option.value === "30d" ? " checked" : ""}><span class="duration-copy"><span class="duration-name">${htmlEscape(option.title)}${option.recommended ? '<span class="duration-recommended">Recommended</span>' : ""}</span><span class="duration-detail">${htmlEscape(option.detail)}</span></span></label>`)
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
            ["consent_token", consentToken],
        ].map(([key, value]) => `<input type="hidden" name="${key}" value="${htmlEscape(value)}">`).join("");

        const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="color-scheme" content="light dark"><title>Connect ${htmlEscape(authorization.clientName)} · Notes</title><style>${authorizationStyles}</style></head>
<body><div class="page"><header class="topbar"><a class="brand" href="/"><span class="brand-mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M7 4.75h7l4 4v10.5H7a2 2 0 0 1-2-2v-10.5a2 2 0 0 1 2-2Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M14 5v4h4M8.5 13h7M8.5 16h5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>Notes</a><span class="secure-label"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 10V7a5 5 0 0 1 10 0v3m-11 0h12v10H6V10Z" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>Secure OAuth</span></header>
<main><section class="card" aria-labelledby="consent-title"><div class="card-head"><div class="connection-mark" aria-hidden="true"><span class="app-mark">AI</span><span class="connector"></span><span class="notes-mark"><svg viewBox="0 0 24 24" fill="none"><path d="M7 4.75h7l4 4v10.5H7a2 2 0 0 1-2-2v-10.5a2 2 0 0 1 2-2Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M14 5v4h4M8.5 13h7M8.5 16h5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span></div><p class="eyebrow">Permission review</p><h1 id="consent-title">Connect ${htmlEscape(authorization.clientName)} to Notes</h1><p class="intro"><span class="client-name">${htmlEscape(authorization.clientName)}</span> wants to connect to your notes. Choose the permissions you want to grant.</p></div>
<div class="card-body"><p class="section-title">Access requested <span class="section-hint">You can change this selection</span></p><form method="post" action="${htmlEscape(`${getMcpOrigin()}/api/oauth/authorize`)}">${hidden}<div class="permissions" role="group" aria-label="Choose Notes permissions">${scopeOptions}</div><fieldset class="duration-section"><legend class="duration-legend">Connection duration <span class="section-hint">Access tokens rotate hourly</span></legend><div class="duration-grid">${durationInputs}</div><p class="duration-note">No expiry keeps this client authorized until you revoke it in Settings. You can change this duration later.</p></fieldset><div class="redirect-box"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 10V7a5 5 0 0 1 10 0v3m-11 0h12v10H6V10Z" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg><div><p class="redirect-title">Secure one-time redirect</p><code class="redirect-uri">${htmlEscape(authorization.redirectUri)}</code></div></div><div class="actions"><button class="button button-primary" type="submit" name="decision" value="approve">Allow selected access <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button><button class="button button-secondary" type="submit" name="decision" value="deny">Cancel</button></div></form><p class="footnote">Only the permissions selected above will be granted. You can revoke this connection later in Admin Settings.</p></div></section></main><footer class="footer">Notes · Your authorization can be revoked at any time.</footer></div></body></html>`;

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
        const sameOrigin = origin === getMcpOrigin();
        const size = Number(request.headers.get("content-length") || 0);
        if (size > 8192) return errorPage("The authorization request is too large.", 413);
        if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/x-www-form-urlencoded")) {
            return errorPage("The authorization form is invalid.");
        }
        const limit = await rateLimit("oauth-authorize", 30, 60, request);
        if (!limit.allowed) return errorPage("Too many authorization attempts. Try again shortly.", 429);
        const body = await readLimitedText(request, 8192);
        const form = new URLSearchParams(body);
        if (form.getAll("consent_token").length !== 1) {
            return errorPage("This authorization form is invalid. Restart the connection.", 403);
        }
        const sessionToken = await getValidAdminSessionToken();
        if (!sessionToken) {
            const preserved = new URLSearchParams(form);
            preserved.delete("decision");
            preserved.delete("approved_scope");
            preserved.delete("consent_token");
            return toLogin(request, preserved);
        }
        const authorization = await getAuthorizationRequest(form);
        const validConsent = verifyConsentToken(form.get("consent_token"), authorization, sessionToken);
        if (!validConsent) {
            return errorPage(
                sameOrigin ? "This authorization form expired. Restart the connection." : "This request did not come from the website.",
                403,
            );
        }
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
        const grantDurations = form.getAll("grant_duration");
        if (grantDurations.length !== 1 || !isMcpGrantDuration(grantDurations[0])) {
            return errorPage("Choose one valid connection duration.");
        }
        const grantExpiresAt = getMcpGrantExpiresAt(grantDurations[0]);

        if (!approvedScopes.length) {
            callback.searchParams.set("error", "access_denied");
            callback.searchParams.set("iss", issuer);
            if (state) callback.searchParams.set("state", state);
            return redirectNoStore(callback, 303);
        }

        const code = newSecret("mcp_code_");
        await sql`
            INSERT INTO mcp_oauth_codes
                (code_hash, client_id, redirect_uri, code_challenge, scope, resource,
                 grant_duration, grant_expires_at, expires_at)
            VALUES
                (${digest(code)}, ${authorization.clientId}, ${authorization.redirectUri},
                 ${authorization.challenge}, ${approvedScopes.join(" ")}, ${authorization.resource},
                 ${grantDurations[0]}, ${grantExpiresAt}, ${new Date(Date.now() + 120_000)})
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
