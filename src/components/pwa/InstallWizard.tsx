"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  Box,
  Check,
  MonitorSmartphone,
  Share,
  Smartphone,
  X,
} from "lucide-react";
import Dialog from "../ui/Dialog";

interface InstallEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallWizard() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [installed, setInstalled] = useState(false);
  const [available, setAvailable] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop">(
    "desktop",
  );
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef<InstallEvent | null>(null);
  useEffect(() => {
    const displayMode = window.matchMedia("(display-mode: standalone)");
    const updateInstalled = () =>
      setInstalled(
        displayMode.matches ||
          (navigator as Navigator & { standalone?: boolean }).standalone ===
            true,
      );
    const onPrompt = (event: Event) => {
      event.preventDefault();
      pending.current = event as InstallEvent;
      setAvailable(true);
    };
    const onInstalled = () => {
      setInstalled(true);
      pending.current = null;
      setAvailable(false);
      setBusy(false);
    };
    const show = () => {
      updateInstalled();
      setStep(0);
      setMessage("");
      setOpen(true);
      setPlatform(
        /iPad|iPhone|iPod/.test(navigator.userAgent) ||
          (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
          ? "ios"
          : /Android/.test(navigator.userAgent)
            ? "android"
            : "desktop",
      );
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener("neuroquest:install", show);
    displayMode.addEventListener("change", updateInstalled);
    if (
      "serviceWorker" in navigator &&
      window.isSecureContext &&
      process.env.NODE_ENV === "production"
    ) {
      void navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => {
          /* Installation instructions remain available when workers are restricted. */
        });
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("neuroquest:install", show);
      displayMode.removeEventListener("change", updateInstalled);
    };
  }, []);
  const install = async () => {
    const prompt = pending.current;
    if (!prompt) return;
    setBusy(true);
    setMessage("");
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      setMessage(
        choice.outcome === "accepted"
          ? "Installation requested. Your browser will let you know when it’s ready."
          : "No problem. You can install later from your browser menu.",
      );
    } catch {
      setMessage(
        "Use your browser’s installation menu to finish adding NeuroQuest.",
      );
    } finally {
      pending.current = null;
      setAvailable(false);
      setBusy(false);
    }
  };
  return (
    <Dialog
      isOpen={open}
      onClose={() => {
        if (!busy) setOpen(false);
      }}
      titleId="install-title"
      className="install-dialog"
    >
      <button
        className="account-close icon-button"
        aria-label="Close installation guide"
        onClick={() => setOpen(false)}
        disabled={busy}
      >
        <X size={20} />
      </button>
      <div className="install-art" aria-hidden="true">
        <span>
          <Box size={50} strokeWidth={1.5} />
        </span>
        <i>
          <Check size={18} />
        </i>
      </div>
      <span className="auth-eyebrow">YOUR PALACE, ONE TAP AWAY</span>
      <h2 id="install-title">
        {installed
          ? "You’re right at home."
          : step === 0
            ? "A little space on your device."
            : "Let’s make it yours."}
      </h2>
      {installed ? (
        <>
          <p>
            NeuroQuest is running as an installed app. Your account and cloud
            notes work here, too.
          </p>
          <button
            className="primary-button auth-submit"
            onClick={() => setOpen(false)}
          >
            Back to my ideas <ArrowRight size={17} />
          </button>
        </>
      ) : (
        <>
          <div
            className="install-progress"
            aria-label={`Installation guide, step ${step + 1} of 2`}
          >
            <span className="active" />
            <span className={step === 1 ? "active" : ""} />
          </div>
          {step === 0 ? (
            <>
              <p>
                Add NeuroQuest to your home screen or desktop, with its own icon
                and a focused app window.
              </p>
              <ul className="install-benefits">
                <li>
                  <MonitorSmartphone size={20} />
                  <span>
                    <strong>Feels at home, anywhere</strong>Open it from your
                    phone, tablet or computer.
                  </span>
                </li>
                <li>
                  <ArrowDownToLine size={20} />
                  <span>
                    <strong>No app store required</strong>Your browser handles
                    the installation.
                  </span>
                </li>
              </ul>
              <p className="install-note">
                An internet connection is needed to sign in and load or save
                cloud notes. Installation does not increase your account’s
                storage limit.
              </p>
              <button
                className="primary-button auth-submit"
                onClick={() => setStep(1)}
              >
                Continue <ArrowRight size={17} />
              </button>
            </>
          ) : (
            <>
              {available ? (
                <>
                  <p>
                    Your browser is ready. Select install, then confirm in the
                    browser’s dialog.
                  </p>
                  <button
                    className="primary-button auth-submit"
                    disabled={busy}
                    onClick={() => void install()}
                  >
                    <ArrowDownToLine size={17} />{" "}
                    {busy ? "Waiting for your browser…" : "Install NeuroQuest"}
                  </button>
                </>
              ) : (
                <>
                  <p>
                    {platform === "ios"
                      ? "Open this website in Safari, then follow these steps:"
                      : platform === "android"
                        ? "Open this website in Chrome or Edge on your phone:"
                        : "Open this website in Chrome, Edge, or a browser that supports web apps:"}
                  </p>
                  <ol className="install-steps">
                    {platform === "ios" ? (
                      <>
                        <li>
                          <Share size={18} />
                          <span>
                            Tap the <strong>Share</strong> button in Safari.
                          </span>
                        </li>
                        <li>
                          <Smartphone size={18} />
                          <span>
                            Select <strong>Add to Home Screen</strong>. Turn on{" "}
                            <strong>Open as Web App</strong> if shown.
                          </span>
                        </li>
                        <li>
                          <Check size={18} />
                          <span>
                            Tap <strong>Add</strong> and open NeuroQuest from
                            its new icon.
                          </span>
                        </li>
                      </>
                    ) : (
                      <>
                        <li>
                          <MonitorSmartphone size={18} />
                          <span>
                            Open the browser menu <strong>⋮</strong> or{" "}
                            <strong>…</strong>.
                          </span>
                        </li>
                        <li>
                          <ArrowDownToLine size={18} />
                          <span>
                            Choose <strong>Install NeuroQuest</strong>,{" "}
                            <strong>Install this site as an app</strong>, or{" "}
                            <strong>Add to Home screen</strong>.
                          </span>
                        </li>
                        <li>
                          <Check size={18} />
                          <span>
                            Confirm, then launch it from your app list or home
                            screen.
                          </span>
                        </li>
                      </>
                    )}
                  </ol>
                  <p className="install-note">
                    If no installation option appears, use the published HTTPS
                    website in your regular browser. Embedded previews and some
                    browsers do not support installation.
                  </p>
                </>
              )}
              {message && (
                <p role="status" className="install-note">
                  {message}
                </p>
              )}
              <div className="account-inline">
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={() => setStep(0)}
                >
                  Back
                </button>
                <button
                  className="secondary-button"
                  disabled={busy}
                  onClick={() => setOpen(false)}
                >
                  Done
                </button>
              </div>
            </>
          )}
        </>
      )}
    </Dialog>
  );
}
