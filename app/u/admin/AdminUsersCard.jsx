"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function safeString(v) {
  return v == null ? "" : String(v);
}

function rowLabel(p) {
  const name = safeString(p?.display_name).trim();
  const twitch = safeString(p?.twitch_username).trim();
  if (name && twitch) return `${name} (@${twitch})`;
  if (name) return name;
  if (twitch) return `@${twitch}`;
  return safeString(p?.user_id || p?.uuid || "—");
}

function formatDate(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("de-DE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function AdminUsersCard() {
  const [query, setQuery] = useState("");
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const fetchSeq = useRef(0);

  const [editOpen, setEditOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState("");
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteDisplayName, setInviteDisplayName] = useState("");
  const [inviteTwitch, setInviteTwitch] = useState("");
  const [inviteRole, setInviteRole] = useState("streamer");
  const [inviteCollectionHandle, setInviteCollectionHandle] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState("");

  const visibleProfiles = useMemo(() => profiles || [], [profiles]);

  useEffect(() => {
    const seq = ++fetchSeq.current;
    const handle = setTimeout(async () => {
      try {
        setLoading(true);
        const qs = new URLSearchParams();
        if (query.trim()) qs.set("q", query.trim());
        qs.set("limit", "50");
        const res = await fetch(`/api/admin/profiles?${qs.toString()}`, {
          method: "GET",
        });
        if (seq !== fetchSeq.current) return;
        if (!res.ok) {
          toast.error("Konnte User nicht laden.");
          return;
        }
        const json = await res.json();
        setProfiles(json?.profiles || []);
      } catch {
        if (seq !== fetchSeq.current) return;
        toast.error("Konnte User nicht laden.");
      } finally {
        if (seq !== fetchSeq.current) return;
        setLoading(false);
        setHasLoadedOnce(true);
      }
    }, 200);
    return () => clearTimeout(handle);
  }, [query]);

  const openEdit = async (userId) => {
    try {
      setEditOpen(true);
      setEditingUserId(userId);
      setEditing(null);
      const res = await fetch(`/api/admin/profiles/${userId}`, { method: "GET" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.profile) {
        toast.error("Konnte Profil nicht laden.");
        return;
      }
      setEditing(json.profile);
    } catch {
      toast.error("Konnte Profil nicht laden.");
    }
  };

  const save = async () => {
    if (!editingUserId || !editing) return;

    let features = editing.features;
    if (typeof features === "string") {
      try {
        features = features.trim() ? JSON.parse(features) : null;
      } catch {
        toast.error("Features muss gültiges JSON sein.");
        return;
      }
    }

    const updates = {
      display_name: editing.display_name ?? null,
      twitch_username: editing.twitch_username ?? null,
      collection_handle: editing.collection_handle ?? null,
      alertbox_text: editing.alertbox_text ?? null,
      role: editing.role ?? "streamer",
      features,
    };

    try {
      setSaving(true);
      const res = await fetch(`/api/admin/profiles/${editingUserId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.profile) {
        toast.error("Speichern fehlgeschlagen.");
        return;
      }
      toast.success("Profil gespeichert.");
      setEditing(json.profile);
      fetchSeq.current += 1;
      setQuery((q) => q);
    } catch {
      toast.error("Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  };

  const invite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      toast.error("Bitte eine gültige Email angeben.");
      return;
    }
    try {
      setInviteLoading(true);
      setInviteLink("");
      const res = await fetch("/api/admin/profiles/invite", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          profile: {
            display_name: inviteDisplayName.trim() || null,
            twitch_username: inviteTwitch.trim() || null,
            collection_handle: inviteCollectionHandle.trim() || null,
            role: inviteRole,
          },
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.actionLink) {
        toast.error("Invite konnte nicht erstellt werden.");
        return;
      }
      setInviteLink(json.actionLink);
      toast.success("Invite/Magic-Link erstellt.");
    } catch {
      toast.error("Invite konnte nicht erstellt werden.");
    } finally {
      setInviteLoading(false);
    }
  };

  const copy = async (text) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Kopiert.");
    } catch {
      toast.error("Kopieren fehlgeschlagen.");
    }
  };

  return (
    <>
      <Card className="mt-6 p-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm text-muted-foreground">User</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Admin-Ansicht (Invite-only): Profile ansehen & bearbeiten
            </div>
          </div>
          <Button onClick={() => setInviteOpen(true)}>Neuen User einladen</Button>
        </div>

        <div className="flex items-center gap-3">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Suchen nach Name, Twitch oder Collection…"
          />
          <div className="text-xs text-muted-foreground whitespace-nowrap">
            {loading ? "Lade…" : `${visibleProfiles.length} Treffer`}
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-(--radius-md) border border-default">
          <div className="grid grid-cols-[1.6fr_1fr_.8fr_.8fr] gap-3 bg-[color-mix(in_hsl,var(--muted),black_6%)] px-3 py-2 text-[11px] uppercase tracking-wide text-muted-foreground">
            <div>Name</div>
            <div>Collection</div>
            <div>Rolle</div>
            <div>Erstellt</div>
          </div>
          <div className="divide-y divide-border">
            {loading || !hasLoadedOnce ? (
              <div className="px-3 py-10 text-center">
                <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-[#9146ff]" />
                <div className="mt-3 text-sm text-muted-foreground">
                  Lade User…
                </div>
              </div>
            ) : visibleProfiles.length ? (
              visibleProfiles.map((p) => (
                <button
                  key={p.user_id || p.uuid}
                  type="button"
                  onClick={() => openEdit(p.user_id)}
                  className="grid w-full cursor-pointer grid-cols-[1.6fr_1fr_.8fr_.8fr] gap-3 px-3 py-3 text-left text-sm hover:bg-[color-mix(in_hsl,var(--muted),black_8%)]"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{rowLabel(p)}</div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">
                      {safeString(p.user_id)}
                    </div>
                  </div>
                  <div className="truncate text-sm text-muted-foreground">
                    {p.collection_handle || "—"}
                  </div>
                  <div className="text-sm">
                    <span className="rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide bg-[color-mix(in_hsl,var(--muted),black_10%)] text-muted-foreground ring-1 ring-[color-mix(in_hsl,var(--muted-foreground),transparent_70%)]">
                      {p.role || "user"}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatDate(p.created_at)}
                  </div>
                </button>
              ))
            ) : (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                Keine User gefunden.
              </div>
            )}
          </div>
        </div>
      </Card>

      <Dialog open={editOpen} onOpenChange={(v) => {
        setEditOpen(v);
        if (!v) {
          setEditingUserId("");
          setEditing(null);
          setSaving(false);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User bearbeiten</DialogTitle>
            <DialogDescription>
              Klicke auf Speichern, um Änderungen in `profiles` zu übernehmen.
            </DialogDescription>
          </DialogHeader>

          {!editing ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Lade…
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Display Name</div>
                <Input
                  value={safeString(editing.display_name)}
                  onChange={(e) =>
                    setEditing((p) => ({ ...p, display_name: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Twitch Username</div>
                <Input
                  value={safeString(editing.twitch_username)}
                  onChange={(e) =>
                    setEditing((p) => ({ ...p, twitch_username: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Collection Handle</div>
                <Input
                  value={safeString(editing.collection_handle)}
                  onChange={(e) =>
                    setEditing((p) => ({ ...p, collection_handle: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Role</div>
                <select
                  className="flex h-10 w-full cursor-pointer rounded-sm border border-default bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={safeString(editing.role || "streamer")}
                  onChange={(e) =>
                    setEditing((p) => ({ ...p, role: e.target.value }))
                  }
                >
                  <option value="streamer">streamer</option>
                  <option value="admin">admin</option>
                </select>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <div className="text-xs text-muted-foreground">Alertbox Text</div>
                <textarea
                  className="min-h-20 w-full cursor-pointer rounded-sm border border-default bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={safeString(editing.alertbox_text)}
                  onChange={(e) =>
                    setEditing((p) => ({ ...p, alertbox_text: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <div className="text-xs text-muted-foreground">Features (JSON)</div>
                <textarea
                  className="min-h-28 w-full cursor-pointer rounded-sm border border-default bg-background px-3 py-2 font-mono text-xs text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={
                    typeof editing.features === "string"
                      ? editing.features
                      : JSON.stringify(editing.features ?? null, null, 2)
                  }
                  onChange={(e) =>
                    setEditing((p) => ({ ...p, features: e.target.value }))
                  }
                />
              </div>

              <div className="sm:col-span-2 flex items-center justify-between gap-2">
                <div className="text-xs text-muted-foreground">
                  user_id: <span className="font-mono">{editingUserId}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" onClick={() => setEditOpen(false)} disabled={saving}>
                    Schließen
                  </Button>
                  <Button onClick={save} disabled={saving}>
                    {saving ? "Speichere…" : "Speichern"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={inviteOpen} onOpenChange={(v) => {
        setInviteOpen(v);
        if (!v) {
          setInviteEmail("");
          setInviteDisplayName("");
          setInviteTwitch("");
          setInviteRole("streamer");
          setInviteCollectionHandle("");
          setInviteLoading(false);
          setInviteLink("");
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Neuen User einladen</DialogTitle>
            <DialogDescription>
              Erstellt einen Invite/Magic-Link (invite-only).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Email</div>
              <Input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Display Name</div>
                <Input
                  value={inviteDisplayName}
                  onChange={(e) => setInviteDisplayName(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Twitch Username</div>
                <Input value={inviteTwitch} onChange={(e) => setInviteTwitch(e.target.value)} />
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Role</div>
                <select
                  className="flex h-10 w-full cursor-pointer rounded-sm border border-default bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                >
                  <option value="streamer">streamer</option>
                  <option value="admin">admin</option>
                </select>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Collection Handle</div>
                <Input
                  value={inviteCollectionHandle}
                  onChange={(e) => setInviteCollectionHandle(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={invite} disabled={inviteLoading}>
                {inviteLoading ? "Erstelle…" : "Invite erstellen"}
              </Button>
              <Button variant="ghost" onClick={() => setInviteOpen(false)} disabled={inviteLoading}>
                Schließen
              </Button>
            </div>

            {inviteLink ? (
              <div className="space-y-2 rounded-sm border border-default bg-[color-mix(in_hsl,var(--muted),black_4%)] p-3">
                <div className="text-xs text-muted-foreground">
                  Invite/Magic-Link (sensibel)
                </div>
                <div className="flex items-center gap-2">
                  <Input value={inviteLink} readOnly />
                  <Button variant="ghost" onClick={() => copy(inviteLink)}>
                    Kopieren
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

