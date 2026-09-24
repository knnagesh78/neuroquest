"use client";

import { useState, type CSSProperties } from "react";
import { Check, Plus, Sparkles, X } from "lucide-react";
import type { RoomIcon } from "@/lib/types";
import { usePalaceStore } from "@/store/usePalaceStore";
import Dialog from "./Dialog";
import { ROOM_ICON_OPTIONS } from "./RoomIcon";

const colors = [
  { value: "#a78bfa", label: "Lavender" },
  { value: "#e6af57", label: "Amber" },
  { value: "#78bba3", label: "Mint" },
  { value: "#e58eaa", label: "Rose" },
  { value: "#73a8e3", label: "Sky" },
  { value: "#a2a5bf", label: "Slate" },
];

type Props = { isOpen: boolean; onClose: () => void; onCreated: () => void };

function RoomForm({ onClose, onCreated }: Omit<Props, "isOpen">) {
  const addRoom = usePalaceStore((state) => state.addRoom);
  const [name, setName] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [color, setColor] = useState(colors[0].value);
  const [icon, setIcon] = useState<RoomIcon>("book");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  return (
    <form
      className="add-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (submitting) return;
        if (!name.trim()) {
          setError("Give your new palace a name.");
          return;
        }
        setSubmitting(true);
        try {
          addRoom({
            name: name.trim(),
            subtitle: subtitle.trim(),
            color,
            icon,
          });
          onCreated();
        } catch (error) {
          setError(
            error instanceof Error
              ? error.message
              : "Could not create your palace. Please try again.",
          );
          setSubmitting(false);
        }
      }}
    >
      <div className="add-header">
        <div className="add-header-icon">
          <Plus size={23} />
        </div>
        <button
          type="button"
          className="drawer-icon-button"
          aria-label="Close new palace form"
          onClick={onClose}
        >
          <X size={19} />
        </button>
      </div>
      <div className="add-intro">
        <span className="add-eyebrow">A NEW SUBJECT. A NEW SPACE.</span>
        <h2 id="add-room-title">Create a new palace.</h2>
        <p id="add-room-description">
          Give a subject its own place, then fill it with ideas worth
          remembering.
        </p>
      </div>
      <div className="add-scroll">
        <div className="add-field">
          <label htmlFor="new-room-name">
            Palace name <span>*</span>
          </label>
          <input
            id="new-room-name"
            data-autofocus
            required
            maxLength={48}
            value={name}
            placeholder="e.g. Mathematics, Chemistry, or Spanish"
            onChange={(event) => {
              setName(event.target.value);
              setError("");
            }}
          />
          <span className="add-counter">{name.length}/48</span>
        </div>
        <div className="add-field">
          <label htmlFor="new-room-description">
            Description <span className="add-optional">Optional</span>
          </label>
          <input
            id="new-room-description"
            maxLength={120}
            value={subtitle}
            placeholder="What will you explore here?"
            onChange={(event) => setSubtitle(event.target.value)}
          />
        </div>
        <fieldset className="add-fieldset">
          <legend>Choose a subject icon</legend>
          <div className="add-shapes">
            {ROOM_ICON_OPTIONS.map(({ value, label, Icon }) => (
              <button
                type="button"
                key={value}
                className={`add-shape ${icon === value ? "add-shape--selected" : ""}`}
                aria-pressed={icon === value}
                onClick={() => setIcon(value)}
              >
                <Icon size={22} strokeWidth={1.6} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="add-fieldset">
          <legend>Choose a palace color</legend>
          <div className="add-colors">
            {colors.map((swatch) => (
              <button
                type="button"
                className="add-color"
                key={swatch.value}
                aria-label={`${swatch.label} color`}
                aria-pressed={color === swatch.value}
                style={{ "--swatch-color": swatch.value } as CSSProperties}
                onClick={() => setColor(swatch.value)}
              >
                {color === swatch.value && <Check size={17} />}
              </button>
            ))}
            <span>
              {colors.find((swatch) => swatch.value === color)?.label}
            </span>
          </div>
        </fieldset>
        <p className="new-room-hint">
          <Sparkles size={15} /> This palace starts empty. Add only the memory
          anchors you want to keep here.
        </p>
        {error && (
          <p className="add-error" role="alert">
            {error}
          </p>
        )}
      </div>
      <div className="add-footer">
        <button type="button" className="drawer-secondary" onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className="drawer-primary" disabled={submitting}>
          <Plus size={17} />
          {submitting ? "Creating…" : "Create palace"}
        </button>
      </div>
    </form>
  );
}

export default function AddRoomModal({ isOpen, onClose, onCreated }: Props) {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      titleId="add-room-title"
      descriptionId="add-room-description"
      className="add-panel"
    >
      {isOpen && <RoomForm onClose={onClose} onCreated={onCreated} />}
    </Dialog>
  );
}
