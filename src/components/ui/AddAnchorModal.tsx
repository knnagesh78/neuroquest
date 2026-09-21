"use client";

import { useState, type CSSProperties } from "react";
import {
  Box,
  Check,
  Circle,
  Diamond,
  MapPin,
  Plus,
  Sparkles,
  Triangle,
  X,
} from "lucide-react";
import type { MemoryAnchor } from "@/lib/types";
import { usePalaceStore } from "@/store/usePalaceStore";
import Dialog from "./Dialog";

const colors = [
  { value: "#9b78ef", label: "Lavender" },
  { value: "#e6af57", label: "Amber" },
  { value: "#78bba3", label: "Mint" },
  { value: "#e58eaa", label: "Rose" },
  { value: "#73a8e3", label: "Sky" },
  { value: "#a2a5bf", label: "Slate" },
];
const shapes: {
  value: MemoryAnchor["shape"];
  label: string;
  icon: typeof Diamond;
}[] = [
  { value: "crystal", label: "Crystal", icon: Diamond },
  { value: "torus", label: "Ring", icon: Circle },
  { value: "cube", label: "Cube", icon: Box },
  { value: "sphere", label: "Sphere", icon: Circle },
  { value: "pyramid", label: "Pyramid", icon: Triangle },
  { value: "knot", label: "Knot", icon: Sparkles },
];

function openPosition(
  anchors: MemoryAnchor[],
  roomId: string,
): [number, number, number] {
  const positions: [number, number, number][] = [
    [0, 0, 3],
    [-3, 0, 3],
    [3, 0, 3],
    [-5, 0, 0],
    [5, 0, 0],
    [0, 0, -4],
    [-3, 0, -4],
    [3, 0, -4],
    [0, 0, 5],
    [-5, 0, 5],
    [5, 0, 5],
  ];
  return (
    positions.find(
      (position) =>
        !anchors.some(
          (anchor) =>
            anchor.roomId === roomId &&
            Math.hypot(
              anchor.position[0] - position[0],
              anchor.position[2] - position[2],
            ) < 1.5,
        ),
    ) ?? [0, 1.5, 0]
  );
}

function AddAnchorForm() {
  const roomId = usePalaceStore((state) => state.activeRoomId);
  const anchors = usePalaceStore((state) => state.anchors);
  const addAnchor = usePalaceStore((state) => state.addAnchor);
  const setAddOpen = usePalaceStore((state) => state.setAddOpen);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [content, setContent] = useState("");
  const [color, setColor] = useState(colors[0].value);
  const [shape, setShape] = useState<MemoryAnchor["shape"]>("crystal");
  const [position, setPosition] = useState(() =>
    openPosition(anchors, roomId).map(String),
  );
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  return (
    <form
      className="add-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (submitting) return;
        if (!title.trim() || !content.trim()) {
          setError("Give your anchor a title and a little study material.");
          return;
        }
        const numbers = position.map(Number);
        if (
          position.some((value) => value.trim() === "") ||
          numbers.some((value) => !Number.isFinite(value)) ||
          Math.abs(numbers[0]) > 6 ||
          Math.abs(numbers[2]) > 6 ||
          numbers[1] < 0 ||
          numbers[1] > 3
        ) {
          setError(
            "Place X and Z between −6 and 6, and height between 0 and 3.",
          );
          return;
        }
        setSubmitting(true);
        try {
          addAnchor({
            roomId,
            title: title.trim(),
            category: category.trim() || "Custom concept",
            content: content.trim(),
            color,
            shape,
            position: numbers as [number, number, number],
          });
          setAddOpen(false);
        } catch (error) {
          setError(
            error instanceof Error
              ? error.message
              : "Could not add this anchor. Please try again.",
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
          onClick={() => setAddOpen(false)}
          aria-label="Close new anchor form"
        >
          <X size={19} />
        </button>
      </div>
      <div className="add-intro">
        <span className="add-eyebrow">GIVE AN IDEA A HOME</span>
        <h2 id="add-anchor-title">A new memory anchor.</h2>
        <p id="add-anchor-description">
          Turn something worth remembering into a place you can return to.
        </p>
      </div>
      <div className="add-scroll">
        <div className="add-field">
          <label htmlFor="add-anchor-name">
            Concept title <span>*</span>
          </label>
          <input
            id="add-anchor-name"
            data-autofocus
            placeholder="e.g. The Feynman technique"
            value={title}
            maxLength={80}
            required
            onChange={(event) => setTitle(event.target.value)}
          />
          <span className="add-counter">{title.length}/80</span>
        </div>
        <div className="add-field">
          <label htmlFor="add-anchor-category">
            Category <span className="add-optional">Optional</span>
          </label>
          <input
            id="add-anchor-category"
            placeholder="e.g. Learning science"
            value={category}
            maxLength={50}
            onChange={(event) => setCategory(event.target.value)}
          />
        </div>
        <div className="add-field">
          <label htmlFor="add-anchor-content">
            Study material <span>*</span>
            <span className="add-field-hint">Markdown supported</span>
          </label>
          <textarea
            id="add-anchor-content"
            placeholder={
              "What should this anchor help you remember?\n\nAdd a definition, an example, or a code snippet."
            }
            value={content}
            maxLength={10000}
            required
            rows={5}
            onChange={(event) => setContent(event.target.value)}
          />
        </div>
        <fieldset className="add-fieldset">
          <legend>Choose your artifact</legend>
          <div className="add-shapes">
            {shapes.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                className={`add-shape ${shape === value ? "add-shape--selected" : ""}`}
                type="button"
                aria-pressed={shape === value}
                onClick={() => setShape(value)}
              >
                <Icon size={22} strokeWidth={1.6} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="add-fieldset">
          <legend>Make it your color</legend>
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
                {color === swatch.value && (
                  <Check size={17} strokeWidth={2.5} />
                )}
              </button>
            ))}
            <span>
              {colors.find((swatch) => swatch.value === color)?.label}
            </span>
          </div>
        </fieldset>
        <div className="add-position">
          <div className="add-position-label">
            <MapPin size={15} />
            <span>A spot in your palace</span>
            <small>Chosen for you. Adjust if you like.</small>
          </div>
          <div className="add-coordinates">
            {["X · left / right", "Y · height", "Z · front / back"].map(
              (label, index) => (
                <div key={label}>
                  <label htmlFor={`add-coordinate-${index}`}>{label}</label>
                  <input
                    id={`add-coordinate-${index}`}
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    min={index === 1 ? 0 : -6}
                    max={index === 1 ? 3 : 6}
                    required
                    value={position[index]}
                    onChange={(event) =>
                      setPosition((current) =>
                        current.map((value, itemIndex) =>
                          itemIndex === index ? event.target.value : value,
                        ),
                      )
                    }
                  />
                </div>
              ),
            )}
          </div>
        </div>
        {error && (
          <p className="add-error" role="alert">
            {error}
          </p>
        )}
      </div>
      <div className="add-footer">
        <span>
          <Sparkles size={14} />
          An idea becomes a place.
        </span>
        <button type="submit" className="drawer-primary" disabled={submitting}>
          <Plus size={17} />
          {submitting ? "Adding…" : "Add to palace"}
        </button>
      </div>
    </form>
  );
}

export default function AddAnchorModal() {
  const isOpen = usePalaceStore((state) => state.isAddOpen);
  const setAddOpen = usePalaceStore((state) => state.setAddOpen);
  return (
    <Dialog
      isOpen={isOpen}
      onClose={() => setAddOpen(false)}
      titleId="add-anchor-title"
      descriptionId="add-anchor-description"
      className="add-panel"
    >
      {isOpen && <AddAnchorForm />}
    </Dialog>
  );
}
