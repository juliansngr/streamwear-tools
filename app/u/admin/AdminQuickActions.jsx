"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserRound } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function userLabel(u) {
  const name = (u?.display_name || "").trim();
  const twitch = (u?.twitch_username || "").trim();
  if (name && twitch) return `${name} (@${twitch})`;
  if (name) return name;
  if (twitch) return `@${twitch}`;
  return u?.user_id || "Unbekannt";
}

export function AdminQuickActions() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [loadingLink, setLoadingLink] = useState(false);
  const [actionLink, setActionLink] = useState("");
  const fetchSeq = useRef(0);

  const selectedUser = useMemo(() => {
    return (users || []).find((u) => u.user_id === selectedUserId) || null;
  }, [users, selectedUserId]);

  useEffect(() => {
    if (!open) return;

    const q = query.trim();
    if (q.length < 2) {
      fetchSeq.current += 1;
      setUsers([]);
      setLoadingUsers(false);
      return;
    }

    const seq = ++fetchSeq.current;
    const handle = setTimeout(async () => {
      try {
        setLoadingUsers(true);
        const qs = new URLSearchParams();
        qs.set("q", q);
        qs.set("limit", "50");
        const res = await fetch(`/api/admin/users?${qs.toString()}`, {
          method: "GET",
        });
        if (seq !== fetchSeq.current) return;
        if (!res.ok) {
          toast.error("Konnte User-Liste nicht laden.");
          return;
        }
        const json = await res.json();
        setUsers(json?.users || []);
      } catch {
        if (seq !== fetchSeq.current) return;
        toast.error("Konnte User-Liste nicht laden.");
      } finally {
        if (seq !== fetchSeq.current) return;
        setLoadingUsers(false);
      }
    }, 200);

    return () => clearTimeout(handle);
  }, [open, query]);

  const generate = async () => {
    if (!selectedUserId) return;
    try {
      setLoadingLink(true);
      setActionLink("");
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: selectedUserId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error("Magic-Link konnte nicht generiert werden.");
        return;
      }
      if (!json?.actionLink) {
        toast.error("Magic-Link fehlt in der Antwort.");
        return;
      }
      setActionLink(json.actionLink);
      toast.success("Magic-Link generiert.");
    } catch {
      toast.error("Magic-Link konnte nicht generiert werden.");
    } finally {
      setLoadingLink(false);
    }
  };

  const copy = async () => {
    if (!actionLink) return;
    try {
      await navigator.clipboard.writeText(actionLink);
      toast.success("Link kopiert.");
    } catch {
      toast.error("Kopieren fehlgeschlagen.");
    }
  };

  return (
    <div className="space-y-3">
      <div className="text-xs font-medium text-muted-foreground">Quick-Actions</div>

      <Dialog open={open} onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          fetchSeq.current += 1;
          setQuery("");
          setUsers([]);
          setSelectedUserId("");
          setActionLink("");
          setLoadingLink(false);
        }
      }}>
        <DialogTrigger asChild>
          <button
            type="button"
            className="group grid w-full cursor-pointer place-items-center rounded-(--radius-md) border border-default bg-[color-mix(in_hsl,var(--muted),black_4%)] p-4 text-left transition-colors hover:bg-[color-mix(in_hsl,var(--muted),black_8%)] hover:ring-1 hover:ring-[#9146ff]/30"
          >
            <div className="flex w-full items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-sm bg-[#9146ff]/15 text-[#c6a3ff] ring-1 ring-[#9146ff]/30">
                <UserRound className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">
                  Login als User
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  Magic-Link generieren und als User einloggen
                </div>
              </div>
              <span className="rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide bg-[color-mix(in_hsl,var(--muted),black_10%)] text-muted-foreground ring-1 ring-[color-mix(in_hsl,var(--muted-foreground),transparent_70%)]">
                Admin
              </span>
            </div>
          </button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Login als User</DialogTitle>
            <DialogDescription>
              Wähle einen User aus und generiere einen Supabase Magic-Link.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">User</div>
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Suchen nach Name, Twitch oder User-ID…"
              />
              <div className="mt-2 max-h-56 overflow-auto rounded-sm border border-default bg-[color-mix(in_hsl,var(--muted),black_4%)] p-1">
                {loadingUsers ? (
                  <div className="px-3 py-2 text-xs text-muted-foreground">
                    Lade…
                  </div>
                ) : users?.length ? (
                  users.map((u) => {
                    const active = u.user_id === selectedUserId;
                    return (
                      <button
                        key={u.user_id}
                        type="button"
                        onClick={() => setSelectedUserId(u.user_id)}
                        className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-sm px-3 py-2 text-left text-sm hover:bg-muted ${
                          active ? "bg-(--muted)/60 ring-1 ring-[#9146ff]/30" : ""
                        }`}
                      >
                        <span className="min-w-0 flex-1 truncate">
                          {userLabel(u)}
                        </span>
                        {u.role ? (
                          <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide bg-[color-mix(in_hsl,var(--muted),black_10%)] text-muted-foreground ring-1 ring-[color-mix(in_hsl,var(--muted-foreground),transparent_70%)]">
                            {u.role}
                          </span>
                        ) : null}
                      </button>
                    );
                  })
                ) : (
                  <div className="px-3 py-2 text-xs text-muted-foreground">
                    {query.trim().length < 2
                      ? "Tippe mindestens 2 Zeichen zum Suchen."
                      : "Keine Treffer."}
                  </div>
                )}
              </div>
              {selectedUser ? (
                <div className="text-xs text-muted-foreground">
                  Ausgewählt:{" "}
                  <span className="font-medium text-foreground">
                    {userLabel(selectedUser)}
                  </span>
                </div>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={generate}
                disabled={!selectedUserId || loadingLink}
              >
                {loadingLink ? "Generiere…" : "Magic-Link generieren"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={loadingLink}
              >
                Schließen
              </Button>
            </div>

            {actionLink ? (
              <div className="space-y-2 rounded-sm border border-default bg-[color-mix(in_hsl,var(--muted),black_4%)] p-3">
                <div className="text-xs text-muted-foreground">
                  Link (einmalig / sensibel)
                </div>
                <div className="flex items-center gap-2">
                  <Input value={actionLink} readOnly />
                  <Button variant="ghost" onClick={copy}>
                    Kopieren
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground">
                  Öffne den Link am besten in einem privaten Fenster, wenn du
                  dein Admin-Login behalten willst.
                </div>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

