"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { Key, Copy, Trash2, Plus } from "lucide-react";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function ApiToken() {
    const [tokens, setTokens] = useState([]);
    const [newToken, setNewToken] = useState("");
    const [tokenName, setTokenName] = useState("");
    const [loading, setLoading] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);

    const fetchTokens = async () => {
        try {
            const response = await fetch("/api/auth/token");
            const data = await response.json();

            if (data.success) {
                setTokens(data.tokens);
            }
        } catch (error) {
            console.error("Error fetching tokens:", error);
        }
    };

    useEffect(() => {
        fetchTokens();
    }, []);

    const generateToken = async () => {
        if (!tokenName || tokenName.trim().length < 3) {
            toast({
                title: "Invalid name",
                description: "Token name must be at least 3 characters",
                variant: "destructive"
            });
            return;
        }

        setLoading(true);
        try {
            const response = await fetch("/api/auth/token", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: tokenName })
            });
            const data = await response.json();

            if (data.success) {
                setNewToken(data.token);
                // Don't clear tokenName here - let it clear when dialog closes
                fetchTokens();
                toast({
                    title: "API Token Generated",
                    description: "Copy the token now. You won't be able to see it again!"
                });
            } else {
                toast({
                    title: "Error",
                    description: data.message,
                    variant: "destructive"
                });
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to generate token",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const deleteToken = async (tokenId) => {
        try {
            const response = await fetch(`/api/auth/token?id=${tokenId}`, {
                method: "DELETE"
            });
            const data = await response.json();

            if (data.success) {
                fetchTokens();
                toast({
                    title: "Token Revoked",
                    description: "The token has been revoked and can no longer be used"
                });
            } else {
                toast({
                    title: "Error",
                    description: data.message,
                    variant: "destructive"
                });
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to revoke token",
                variant: "destructive"
            });
        }
    };

    const copyToken = (token) => {
        navigator.clipboard.writeText(token);
        toast({
            title: "Copied!",
            description: "Token copied to clipboard"
        });
    };

    return (
        <div className="bg-card border rounded-xl p-8 shadow-lg max-w-2xl w-full">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Key className="h-6 w-6" />
                    </div>
                    <p className="font-bold text-2xl">API Tokens</p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={(open) => {
                    setDialogOpen(open);
                    // Reset form when dialog closes
                    if (!open) {
                        setNewToken("");
                        setTokenName("");
                    }
                }}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            New Token
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Generate New API Token</DialogTitle>
                            <DialogDescription>
                                Create a new token to access the API. You can use it in Postman or other API clients.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex flex-col gap-4 py-4">
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="tokenName">Token Name</Label>
                                <Input
                                    id="tokenName"
                                    placeholder="e.g., Postman, Mobile App"
                                    value={tokenName}
                                    onChange={(e) => setTokenName(e.target.value)}
                                />
                            </div>
                            {newToken && (
                                <div className="flex flex-col gap-2">
                                    <Label>Your Token (copy now!)</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={newToken}
                                            readOnly
                                            className="font-mono text-xs"
                                        />
                                        <Button variant="outline" size="icon" onClick={() => copyToken(newToken)}>
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        ⚠️ Save this token now. You won't be able to see it again!
                                    </p>
                                </div>
                            )}
                        </div>
                        <DialogFooter>
                            {!newToken ? (
                                <Button onClick={generateToken} disabled={loading}>
                                    {loading ? "Generating..." : "Generate Token"}
                                </Button>
                            ) : (
                                <DialogClose asChild>
                                    <Button onClick={() => { setNewToken(""); setDialogOpen(false); }}>
                                        Done
                                    </Button>
                                </DialogClose>
                            )}
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="flex flex-col gap-4">
                <div className="bg-muted/50 p-4 rounded-lg">
                    <p className="text-sm font-medium mb-2">How to use:</p>
                    <code className="text-xs bg-background px-3 py-2 rounded block">
                        X-API-Token: your_token_here
                    </code>
                    <p className="text-xs text-muted-foreground mt-2">
                        Add this header to your API requests in Postman or other clients.
                    </p>
                </div>

                <div className="space-y-2">
                    <p className="text-sm font-medium">Your Tokens:</p>
                    {tokens.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">
                            No tokens yet. Create one to get started!
                        </p>
                    ) : (
                        tokens.map((token) => (
                            <div
                                key={token.id}
                                className={`flex flex-col gap-3 p-4 border rounded-lg ${token.revoked ? "opacity-50 bg-muted" : "bg-background"}`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <p className="font-medium">{token.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            Created: {token.created_at}
                                            {token.last_used && ` • Last used: ${token.last_used}`}
                                            {token.revoked && " • REVOKED"}
                                        </p>
                                    </div>
                                    {!token.revoked && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => deleteToken(token.id)}
                                        >
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    )}
                                </div>
                                {!token.revoked && (
                                    <p className="text-xs text-muted-foreground">
                                        Token stored as a hash. Its value was shown only when it was created.
                                    </p>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
