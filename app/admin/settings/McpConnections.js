"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Link2, Unplug } from "lucide-react";

export default function McpConnections() {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchClients = useCallback(async () => {
        try {
            const response = await fetch("/api/oauth/clients", { cache: "no-store" });
            const data = await response.json();
            if (response.ok && data.success) setClients(data.clients);
        } catch {
            toast({ title: "Could not load MCP connections", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchClients();
    }, [fetchClients]);

    const revokeClient = async (clientId, clientName) => {
        if (!window.confirm(`Disconnect ${clientName}? It will need to be authorized again to access notes.`)) return;

        try {
            const response = await fetch(`/api/oauth/clients?id=${encodeURIComponent(clientId)}`, { method: "DELETE" });
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.message || "Could not revoke connection.");
            setClients((current) => current.filter((client) => client.client_id !== clientId));
            toast({ title: "MCP connection revoked" });
        } catch (error) {
            toast({ title: "Could not revoke connection", description: error.message, variant: "destructive" });
        }
    };

    return (
        <section className="bg-card border rounded-xl p-8 shadow-lg max-w-2xl w-full">
            <div className="flex items-center gap-3 mb-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Link2 className="h-6 w-6" />
                </div>
                <h2 className="font-bold text-2xl">MCP Connections</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
                Connected AI clients use OAuth. Revoke a client here to immediately remove its access and tokens.
            </p>
            {loading ? (
                <p className="text-sm text-muted-foreground">Loading connections…</p>
            ) : clients.length === 0 ? (
                <p className="text-sm text-muted-foreground">No AI clients have connected yet.</p>
            ) : (
                <div className="space-y-3">
                    {clients.map((client) => (
                        <div key={client.client_id} className="flex items-center justify-between gap-4 border rounded-lg p-4">
                            <div className="min-w-0">
                                <p className="font-medium truncate">{client.client_name}</p>
                                <p className="text-xs text-muted-foreground">
                                    Connected {new Date(client.created_at).toLocaleDateString()}
                                </p>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => revokeClient(client.client_id, client.client_name)}>
                                <Unplug className="h-4 w-4 mr-2" /> Revoke
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}
