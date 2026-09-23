"use client";
import { createContext, useContext, useState } from "react";
import {
  Cloud,
  Download,
  LoaderCircle,
  LogOut,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";
import { accountError } from "@/lib/account";
import {
  PALACE_STORAGE_KEY,
  replaceWorkspace,
  usePalaceStore,
  validatePersistedState,
  workspaceData,
  type PersistedPalaceState,
} from "@/store/usePalaceStore";
import { useAccountStore } from "@/store/useAccountStore";
import Dialog from "../ui/Dialog";

export type SessionActions = {
  logout: () => Promise<void>;
  retry: () => Promise<void>;
  reload: () => void;
};
export const SessionContext = createContext<SessionActions | null>(null);
const useSession = () => {
  const value = useContext(SessionContext);
  if (!value) throw new Error("Missing account session");
  return value;
};

export function exportWorkspace() {
  const { rooms, anchors } = usePalaceStore.getState();
  downloadNotes({
    application: "NeuroQuest",
    exportedAt: new Date().toISOString(),
    rooms,
    anchors,
  });
}

function downloadNotes(data: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "neuroquest-memory-palaces.json";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function SyncNotice() {
  const error = useAccountStore((s) => s.error);
  const conflict = useAccountStore((s) => s.conflict);
  const session = useSession();
  if (!error) return null;
  return (
    <aside className="sync-notice" role="alert">
      <span>
        {error}{" "}
        {conflict
          ? "Loading the cloud version replaces your unsaved changes."
          : "Unsaved changes stay in this tab. Keep it open or download a backup."}
      </span>
      <button onClick={exportWorkspace}>
        <Download size={15} /> Download notes
      </button>
      <button
        onClick={() =>
          conflict ? session.reload() : void session.retry().catch(() => {})
        }
      >
        <RefreshCw size={15} />
        {conflict ? "Load cloud version" : "Retry save"}
      </button>
    </aside>
  );
}

export function SyncStatus() {
  const status = useAccountStore((s) => s.sync);
  return (
    <span className={`saved-indicator sync-${status}`} role="status">
      <Cloud size={14} />
      {status === "saved"
        ? "Saved to your account"
        : status === "error"
          ? "Changes not saved"
          : "Saving your ideas…"}
    </span>
  );
}

export function AccountButton() {
  const username = useAccountStore((s) => s.username);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [legacy, setLegacy] = useState<PersistedPalaceState | null>(null);
  const session = useSession();
  const show = () => {
    setMessage("");
    try {
      const value = localStorage.getItem(PALACE_STORAGE_KEY);
      setLegacy(value ? validatePersistedState(JSON.parse(value).state) : null);
    } catch {
      setLegacy(null);
    }
    setOpen(true);
  };
  const importLegacy = () => {
    if (!legacy) return;
    try {
      const state = usePalaceStore.getState();
      // Import copies with fresh IDs, never silently replace cloud content.
      const rooms = [...state.rooms];
      const mapping = new Map<string, string>();
      for (const room of legacy.rooms) {
        const existing = rooms.find(
          (r) => r.name.toLowerCase() === room.name.toLowerCase(),
        );
        const id = existing?.id ?? `room-${crypto.randomUUID()}`;
        mapping.set(room.id, id);
        if (!existing) rooms.push({ ...room, id });
      }
      const anchors = [
        ...state.anchors,
        ...legacy.anchors.map((a) => ({
          ...a,
          id: crypto.randomUUID(),
          roomId: mapping.get(a.roomId)!,
        })),
      ];
      if (rooms.length > 50 || anchors.length > 300)
        throw new Error(
          "There is not enough space to import all notes. Download the old notes as a backup instead.",
        );
      replaceWorkspace({ ...workspaceData(state), rooms, anchors });
      setLegacy(null);
      setMessage(
        "A copy of the device notes was added to this account. Your original device backup is unchanged.",
      );
    } catch (error) {
      setMessage(accountError(error));
    }
  };
  return (
    <>
      <button
        className="user-avatar"
        aria-label={`Account: ${username}`}
        onClick={show}
      >
        {username.slice(0, 2).toUpperCase() || "NQ"}
      </button>
      <Dialog
        isOpen={open}
        onClose={() => {
          if (!busy) setOpen(false);
        }}
        titleId="account-title"
        className="account-dialog"
      >
        <button
          className="account-close icon-button"
          aria-label="Close account"
          onClick={() => setOpen(false)}
          disabled={busy}
        >
          <X size={20} />
        </button>
        <span className="auth-brand-icon">
          <ShieldCheck size={28} />
        </span>
        <h2 id="account-title">Your own corner of curiosity.</h2>
        <p>
          Signed in as <strong>@{username}</strong>
        </p>
        <p>
          Your palaces, notes and recall progress are saved privately to this
          account. Sign in with the same username on another device to open
          them.
        </p>
        <div className="account-dialog-actions">
          <button className="secondary-button" onClick={exportWorkspace}>
            <Download size={16} /> Download my notes
          </button>
          <button
            className="secondary-button"
            onClick={() => {
              setOpen(false);
              setTimeout(
                () => window.dispatchEvent(new Event("neuroquest:install")),
                220,
              );
            }}
          >
            <Download size={16} /> Install NeuroQuest
          </button>
        </div>
        {legacy && (
          <div className="legacy-import">
            <h3>Notes from before accounts?</h3>
            <p>
              This browser has an older device workspace. Only import it if
              these are your notes. Copies will be added to @{username}.
            </p>
            <button className="secondary-button" onClick={importLegacy}>
              Import my device notes
            </button>
            <button
              className="text-button"
              onClick={() => downloadNotes(legacy)}
            >
              Download old notes
            </button>
          </div>
        )}
        {message && (
          <p role="status" className="account-error">
            {message}
          </p>
        )}
        <button
          className="primary-button auth-submit"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setMessage("");
            try {
              await session.logout();
            } catch (error) {
              setMessage(accountError(error));
              setBusy(false);
            }
          }}
        >
          {busy ? (
            <LoaderCircle className="spin" size={17} />
          ) : (
            <LogOut size={17} />
          )}{" "}
          {busy ? "Saving before sign-out…" : "Save & sign out"}
        </button>
        <small className="account-footnote">
          For your privacy, closing this tab ends the login session.
        </small>
      </Dialog>
    </>
  );
}
