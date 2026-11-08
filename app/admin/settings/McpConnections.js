"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { BadgeCheck, Check, Clock3, Copy, Link2, Unplug } from "lucide-react";

const durationOptions = [
    { value: "1h", label: "1 hour" },
    { value: "1d", label: "1 day" },
    { value: "7d", label: "7 days" },
    { value: "30d", label: "30 days" },
    { value: "never", label: "No expiry" },
];

function formatDate(value) {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
}

export default function McpConnections() {
    const [clients, setClients] = useState([]);
    const [serverUrl, setServerUrl] = useState("");
    const [durations, setDurations] = useState({});
    const [loading, setLoading] = useState(true);
    const [savingClient, setSavingClient] = useState("");
    const [copied, setCopied] = useState(false);

    const fetchClients = useCallback(async () => {
        try {
            const response = await fetch("/api/oauth/clients", { cache: "no-store" });
            const data = await response.json();
            if (response.ok && data.success) {
                setClients(data.clients);
                setServerUrl(data.server_url || "");
                setDurations((current) => {
                    const next = { ...current };
                    for (const client of data.clients) {
                        if (!next[client.client_id]) next[client.client_id] = client.grant_duration || "30d";
                    }
                    return next;
                });
            } else if (response.status === 401) {
                toast({ title: "Log in again to view MCP connections", variant: "destructive" });
            }
        } catch {
            toast({ title: "Could not load MCP connections", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchClients();
    }, [fetchClients]);

    const copyServerUrl = async () => {
        try {
            await navigator.clipboard.writeText(serverUrl);
            setCopied(true);
            toast({ title: "MCP server URL copied" });
            window.setTimeout(() => setCopied(false), 1800);
        } catch {
            toast({ title: "Could not copy the MCP server URL", variant: "destructive" });
        }
    };

    const saveDuration = async (client) => {
        const duration = durations[client.client_id] || client.grant_duration || "30d";
        if (duration === "never" && !window.confirm("This connection will stay authorized until you revoke it. Continue?")) return;

        setSavingClient(client.client_id);
        try {
            const response = await fetch(`/api/oauth/clients?id=${encodeURIComponent(client.client_id)}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ duration }),
            });
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.message || "Could not update connection expiry.");
            toast({ title: "Connection expiry updated" });
            await fetchClients();
        } catch (error) {
            toast({ title: "Could not update expiry", description: error.message, variant: "destructive" });
        } finally {
            setSavingClient("");
        }
    };

    const revokeClient = async (client) => {
        const label = Number(client.active_grants) > 0 ? "Disconnect" : "Remove";
        if (!window.confirm(`${label} ${client.client_name}? It will need to be authorized again to access notes.`)) return;

        try {
            const response = await fetch(`/api/oauth/clients?id=${encodeURIComponent(client.client_id)}`, { method: "DELETE" });
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.message || "Could not revoke connection.");
            setClients((current) => current.filter((item) => item.client_id !== client.client_id));
            toast({ title: Number(client.active_grants) > 0 ? "MCP connection revoked" : "Pending client removed" });
        } catch (error) {
            toast({ title: "Could not remove this client", description: error.message, variant: "destructive" });
        }
    };

    return (
        <section className="bg-card border rounded-xl p-8 shadow-lg max-w-2xl w-full">
            <div className="flex items-center gap-3 mb-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Link2 className="h-6 w-6" />
                </div>
                <div>
                    <h2 className="font-bold text-2xl">MCP Connections</h2>
                    <p className="text-sm text-muted-foreground">See which AI clients have actually completed authorization.</p>
                </div>
            </div>

            <div className="bg-muted/50 border rounded-lg p-4 my-5">
                <p className="text-sm font-medium mb-2">MCP server URL</p>
                <div className="flex items-center gap-2">
                    <code className="min-w-0 flex-1 break-all text-xs">{serverUrl || "Loading…"}</code>
                    <Button type="button" variant="outline" size="icon" onClick={copyServerUrl} disabled={!serverUrl} aria-label="Copy MCP server URL">
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Add this URL to your MCP client. Use OAuth or a bearer API token from the API Tokens section, depending on the client, then enable the Notes tools in its settings.</p>
            </div>

            <div className="flex items-start gap-2 text-xs text-muted-foreground mb-5">
                <Clock3 className="h-4 w-4 flex-none mt-0.5" />
                <p>Access tokens last up to one hour. The duration below controls how long ChatGPT can refresh access. You can revoke any connection here.</p>
            </div>

            {loading ? (
                <p className="text-sm text-muted-foreground">Loading connections…</p>
            ) : clients.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No AI clients have registered yet.</p>
            ) : (
                <div className="space-y-3">
                    {clients.map((client) => {
                        const active = Number(client.active_grants) > 0;
                        const expired = !active && Boolean(client.last_authorized_at);
                        const status = active ? "Connected" : expired ? "Expired" : "Pending authorization";
                        const duration = client.grant_duration || "30d";
                        const expiresText = active
                            ? duration === "never"
                                ? "No expiry — stays authorized until revoked"
                                : client.refresh_expires_at
                                    ? `Refresh access ends ${formatDate(client.refresh_expires_at)}`
                                    : "Refresh access expiry unavailable"
                            : expired
                                ? `Last authorized ${formatDate(client.last_authorized_at)}`
                                : "Not authorized yet";

                        return (
                            <div key={client.client_id} className="border rounded-lg p-4 space-y-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0">
                                        <p className="font-medium truncate">{client.client_name}</p>
                                        <span className={`inline-flex items-center gap-1.5 mt-1 rounded-full px-2 py-0.5 text-xs font-medium ${active ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : expired ? "bg-amber-500/10 text-amber-700 dark:text-amber-300" : "bg-muted text-muted-foreground"}`}>
                                            {active && <BadgeCheck className="h-3.5 w-3.5" />}
                                            {status}
                                        </span>
                                        <p className="text-xs text-muted-foreground mt-2">{expiresText}</p>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => revokeClient(client)}>
                                        <Unplug className="h-4 w-4 mr-2" />{active ? "Disconnect" : "Remove"}
                                    </Button>
                                </div>

                                {active ? (
                                    <div className="flex flex-col sm:flex-row sm:items-end gap-2 border-t pt-3">
                                        <label className="flex-1 text-xs font-medium">
                                            Connection expiry
                                            <select
                                                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                                                value={durations[client.client_id] || duration}
                                                onChange={(event) => setDurations((current) => ({ ...current, [client.client_id]: event.target.value }))}
                                            >
                                                {durationOptions.map((option) => <option key={option.value} value={option.value}>{option.label}{option.value === "30d" ? " — recommended" : ""}</option>)}
                                            </select>
                                        </label>
                                        <Button type="button" variant="outline" size="sm" disabled={savingClient === client.client_id} onClick={() => saveDuration(client)}>
                                            {savingClient === client.client_id ? "Saving…" : "Save expiry"}
                                        </Button>
                                    </div>
                                ) : (
                                    <p className="border-t pt-3 text-xs text-muted-foreground">
                                        {expired
                                            ? "This authorization expired. Reconnect it in ChatGPT to grant access again."
                                            : "ChatGPT registered this client, but no OAuth token has been issued yet. Finish installing Notes in ChatGPT; this status changes to Connected after authorization completes."}
                                    </p>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
