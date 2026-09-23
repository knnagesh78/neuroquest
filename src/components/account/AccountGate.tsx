"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import {
  ArrowRight,
  Box,
  Download,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { getFirebase } from "@/lib/firebase";
import { accountError, usernameEmail } from "@/lib/account";
import {
  loadWorkspace,
  saveWorkspace,
  WorkspaceConflict,
} from "@/lib/workspace-cloud";
import { SaveQueue } from "@/lib/save-queue";
import {
  clearWorkspace,
  replaceWorkspace,
  usePalaceStore,
  workspaceData,
  type PersistedPalaceState,
} from "@/store/usePalaceStore";
import { useAccountStore } from "@/store/useAccountStore";
import NeuroQuest from "../NeuroQuest";
import {
  SessionContext,
  SyncNotice,
  type SessionActions,
} from "./AccountControls";

function StatusPage({ children }: { children: ReactNode }) {
  return (
    <main className="account-status">
      <span className="auth-brand-icon">
        <Box size={32} />
      </span>
      {children}
    </main>
  );
}

export default function AccountGate() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [error, setError] = useState("");
  useEffect(() => {
    let disposed = false;
    let unsubscribe = () => {};
    const { auth, ready } = getFirebase();
    void ready
      .then(() => {
        if (disposed) return;
        unsubscribe = onAuthStateChanged(
          auth,
          (next) => {
            clearWorkspace();
            useAccountStore.setState({
              username: next?.email?.split("@")[0] ?? "",
              sync: "loading",
              error: "",
              conflict: false,
            });
            setUser(next);
          },
          (failure) => setError(accountError(failure)),
        );
      })
      .catch((failure) => {
        if (!disposed) setError(accountError(failure));
      });
    return () => {
      disposed = true;
      unsubscribe();
    };
  }, []);
  if (error)
    return (
      <StatusPage>
        <h1>Let’s reconnect</h1>
        <p role="alert">{error}</p>
        <button className="primary-button" onClick={() => location.reload()}>
          Try again
        </button>
      </StatusPage>
    );
  if (user === undefined)
    return (
      <StatusPage>
        <LoaderCircle className="spin" />
        <p>Opening your space…</p>
      </StatusPage>
    );
  if (!user) return <LoginScreen />;
  return <WorkspaceSession key={user.uid} user={user} />;
}

function LoginScreen() {
  const [create, setCreate] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setError("");
    try {
      const email = usernameEmail(username);
      if (create && password.length < 8)
        throw new Error("Choose a password with at least 8 characters.");
      setBusy(true);
      const { auth, ready } = getFirebase();
      await ready;
      if (create) await createUserWithEmailAndPassword(auth, email, password);
      else await signInWithEmailAndPassword(auth, email, password);
      setPassword("");
    } catch (failure) {
      setError(accountError(failure));
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="auth-page">
      <section className="auth-story" aria-label="About NeuroQuest">
        <Link className="auth-logo" href="/">
          <span className="auth-brand-icon">
            <Box size={27} />
          </span>
          NeuroQuest<span className="auth-beta">YOUR MEMORY, MAPPED</span>
        </Link>
        <div className="auth-story-body">
          <span className="auth-eyebrow">A PLACE FOR EVERYTHING YOU KNOW</span>
          <h1>
            Big ideas. <br />
            Unforgettable <br />
            <em>places.</em>
          </h1>
          <p>
            Turn your study notes into a world you can explore. Build a palace,
            place an idea, and make it stick.
          </p>
          <div className="auth-world" aria-hidden="true">
            <div className="auth-grid" />
            <div className="auth-orbit orbit-one" />
            <div className="auth-orbit orbit-two" />
            <div className="auth-crystal">
              <Box size={86} strokeWidth={1} />
            </div>
            <span className="auth-world-label label-one">01 · EXPLORE</span>
            <span className="auth-world-label label-two">02 · REMEMBER</span>
            <i className="auth-star star-one">✦</i>
            <i className="auth-star star-two">✧</i>
          </div>
        </div>
        <span className="auth-story-footer">
          <ShieldCheck size={17} /> Your knowledge. Your own private space.
        </span>
      </section>
      <section className="auth-entry">
        <div className="auth-form-card">
          <span className="auth-eyebrow">YOUR NEXT CHAPTER STARTS HERE</span>
          <h2>
            {create ? "Make room for your ideas." : "Welcome to your palace."}
          </h2>
          <p>
            {create
              ? "Create your personal learning space in a moment."
              : "Sign in to pick up right where you left off."}
          </p>
          <div className="auth-tabs" role="group" aria-label="Account action">
            <button
              type="button"
              aria-pressed={!create}
              disabled={busy}
              onClick={() => {
                setCreate(false);
                setError("");
              }}
            >
              Sign in
            </button>
            <button
              type="button"
              aria-pressed={create}
              disabled={busy}
              onClick={() => {
                setCreate(true);
                setError("");
              }}
            >
              Create account
            </button>
          </div>
          <form onSubmit={submit} aria-busy={busy}>
            <label htmlFor="username">Username</label>
            <input
              id="username"
              name="username"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              maxLength={24}
              pattern="[A-Za-z0-9][A-Za-z0-9_]{2,23}"
              placeholder="e.g. curious_mind"
              disabled={busy}
              aria-describedby="username-hint"
            />
            <small id="username-hint">
              3–24 letters, numbers or underscores. Not case-sensitive.
            </small>
            <label htmlFor="password">Password</label>
            <div className="password-field">
              <input
                id="password"
                name="password"
                type={visible ? "text" : "password"}
                autoComplete={create ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={create ? 8 : 1}
                maxLength={128}
                placeholder={
                  create ? "At least 8 characters" : "Enter your password"
                }
                disabled={busy}
              />
              <button
                type="button"
                aria-label={visible ? "Hide password" : "Show password"}
                aria-pressed={visible}
                onClick={() => setVisible(!visible)}
              >
                {visible ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {error && (
              <p className="account-error" role="alert">
                {error}
              </p>
            )}
            <button
              className="primary-button auth-submit"
              disabled={busy}
              type="submit"
            >
              {busy ? (
                <>
                  <LoaderCircle className="spin" size={19} /> Connecting…
                </>
              ) : (
                <>
                  {create ? "Create my account" : "Enter my palace"}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
          <p className="auth-privacy">
            <LockKeyhole size={15} />{" "}
            {create
              ? "Keep your password safe. Username-only accounts cannot receive password-reset emails."
              : "Your palaces and progress belong to your account. You’ll be signed out when you close this tab."}
          </p>
          <div className="auth-install">
            <span>Give your ideas a home on your device.</span>
            <button
              onClick={() =>
                window.dispatchEvent(new Event("neuroquest:install"))
              }
            >
              <Download size={16} /> Install NeuroQuest
            </button>
          </div>
        </div>
        <span className="auth-entry-footer">
          Built for curious minds. Designed to help ideas stay.
        </span>
      </section>
    </main>
  );
}

function WorkspaceSession({ user }: { user: User }) {
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const queue = useRef<SaveQueue<PersistedPalaceState> | null>(null);
  useEffect(() => {
    let disposed = false;
    let unsubscribe = () => {};
    let saver: SaveQueue<PersistedPalaceState> | null = null;
    clearWorkspace();
    const { db, auth } = getFirebase();
    const timeout = setTimeout(() => {
      if (!disposed)
        setLoadError(
          "The cloud is taking longer than expected. Check your connection and retry.",
        );
    }, 20000);
    void loadWorkspace(db, user.uid)
      .then((workspace) => {
        if (disposed || auth.currentUser?.uid !== user.uid) return;
        clearTimeout(timeout);
        replaceWorkspace(workspace.data);
        saver = new SaveQueue(
          workspace.data,
          workspace.exists ? workspace.data : null,
          workspace.revision,
          (before, after, revision) => {
            if (auth.currentUser?.uid !== user.uid)
              throw new Error("Your session has ended. Sign in again.");
            return saveWorkspace(db, user.uid, before, after, revision);
          },
          (sync, error) => {
            if (!disposed)
              useAccountStore.setState({
                sync,
                error: error ? accountError(error) : "",
                conflict: error instanceof WorkspaceConflict,
              });
          },
        );
        queue.current = saver;
        useAccountStore.setState({ sync: "saved", error: "", conflict: false });
        unsubscribe = usePalaceStore.subscribe((state, previous) => {
          const data = workspaceData(state);
          if (JSON.stringify(data) !== JSON.stringify(workspaceData(previous)))
            saver?.update(data);
        });
        setLoadError("");
        setLoaded(true);
        if (!workspace.exists) void saver.flush().catch(() => {});
      })
      .catch((error) => {
        if (!disposed) {
          clearTimeout(timeout);
          setLoadError(accountError(error));
        }
      });
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (saver?.dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    const online = () => {
      if (!useAccountStore.getState().conflict)
        void saver?.flush().catch(() => {});
    };
    const visibility = () => {
      if (
        document.visibilityState === "hidden" &&
        !useAccountStore.getState().conflict
      )
        void saver?.flush().catch(() => {});
    };
    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener("online", online);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      disposed = true;
      clearTimeout(timeout);
      unsubscribe();
      saver?.stop();
      queue.current = null;
      clearWorkspace();
      window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener("online", online);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [user.uid, attempt]);
  const reload = () => {
    setLoaded(false);
    setLoadError("");
    setAttempt((value) => value + 1);
  };
  const actions: SessionActions = {
    retry: async () => {
      await queue.current?.flush();
    },
    reload,
    logout: async () => {
      await queue.current?.flush();
      await signOut(getFirebase().auth);
    },
  };
  if (!loaded)
    return (
      <StatusPage>
        <h1>{loadError ? "Your palace is waiting" : "Finding your ideas…"}</h1>
        <p role={loadError ? "alert" : "status"}>
          {loadError || "Loading your private cloud workspace."}
        </p>
        {loadError ? (
          <div className="account-inline">
            <button className="primary-button" onClick={reload}>
              <RefreshCw size={16} /> Retry
            </button>
            <button
              className="secondary-button"
              onClick={() =>
                void signOut(getFirebase().auth).catch((error) =>
                  setLoadError(accountError(error)),
                )
              }
            >
              Sign out
            </button>
          </div>
        ) : (
          <LoaderCircle className="spin" />
        )}
      </StatusPage>
    );
  return (
    <SessionContext.Provider value={actions}>
      <SyncNotice />
      <NeuroQuest />
    </SessionContext.Provider>
  );
}
