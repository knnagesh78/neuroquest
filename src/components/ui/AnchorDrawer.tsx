"use client";

import { useState, type CSSProperties } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Eye,
  MapPin,
  Pencil,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import type { MemoryAnchor } from "@/lib/types";
import { usePalaceStore } from "@/store/usePalaceStore";
import Dialog from "./Dialog";

type Rating = "easy" | "hard" | "failed";

function AnchorMaterial({ content }: { content: string }) {
  return (
    <div className="drawer-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ children, href, title }) => (
            <a
              href={href}
              title={title}
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function AnchorDetails({
  anchor,
  mode,
  reviewedIds,
  onReview,
}: {
  anchor: MemoryAnchor;
  mode: string;
  reviewedIds: Set<string>;
  onReview: (id: string, rating: Rating) => void;
}) {
  const selectAnchor = usePalaceStore((state) => state.selectAnchor);
  const setMode = usePalaceStore((state) => state.setMode);
  const updateAnchor = usePalaceStore((state) => state.updateAnchor);
  const deleteAnchor = usePalaceStore((state) => state.deleteAnchor);
  const anchors = usePalaceStore((state) => state.anchors);
  const [revealed, setRevealed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editTitle, setEditTitle] = useState(anchor.title);
  const [editContent, setEditContent] = useState(anchor.content);
  const [editError, setEditError] = useState("");
  const lastRating = usePalaceStore((state) => state.sessionRatings[anchor.id]);
  const recall = mode === "recall";
  const rated = reviewedIds.has(anchor.id);
  const visible = !recall || revealed || rated;
  const roomAnchors = anchors.filter((item) => item.roomId === anchor.roomId);
  const nextAnchor = roomAnchors.find(
    (item) => item.id !== anchor.id && !reviewedIds.has(item.id),
  );

  function rate(rating: Rating) {
    if (rated || usePalaceStore.getState().sessionRatings[anchor.id]) return;
    onReview(anchor.id, rating);
  }

  return (
    <>
      <div className="drawer-topline">
        <span className="drawer-eyebrow">
          <span className="drawer-eyebrow-dot" />
          {recall ? "RECALL CHALLENGE" : "MEMORY ANCHOR"}
        </span>
        <button
          className="drawer-icon-button"
          onClick={() => selectAnchor(null)}
          aria-label="Close anchor details"
        >
          <X size={19} />
        </button>
      </div>

      <div className="drawer-scroll">
        <div
          className="drawer-artifact"
          style={{ "--anchor-color": anchor.color } as CSSProperties}
          aria-hidden="true"
        >
          <div
            className={`drawer-artifact-symbol drawer-artifact-symbol--${anchor.shape}`}
          />
          <span className="drawer-artifact-orbit" />
        </div>

        {visible ? (
          <>
            <div className="drawer-category">{anchor.category}</div>
            <h2 id="anchor-drawer-title" className="drawer-title">
              {anchor.title}
            </h2>
            <div className="drawer-meta">
              <span>
                <MapPin size={13} />
                {anchor.position
                  .map((coordinate) => coordinate.toFixed(1))
                  .join(" / ")}
              </span>
              <span className={`drawer-status drawer-status--${anchor.status}`}>
                <span />
                {anchor.status === "mastered"
                  ? "Mastered"
                  : anchor.status === "learning"
                    ? "Learning"
                    : "New memory"}
              </span>
            </div>
          </>
        ) : (
          <>
            <div className="drawer-category">
              A little pause. A stronger memory.
            </div>
            <h2 id="anchor-drawer-title" className="drawer-title">
              What concept is anchored here?
            </h2>
            <p className="drawer-description">
              Picture this artifact in your palace. Take a moment to recall the
              idea, then check your memory.
            </p>
          </>
        )}

        {recall && !visible ? (
          <div className="drawer-recall-prompt">
            <span className="drawer-mystery" aria-hidden="true">
              ?
            </span>
            <p>Bring the idea to mind before you reveal it.</p>
            <button
              className="drawer-primary"
              onClick={() => setRevealed(true)}
            >
              <Eye size={17} /> Reveal concept
            </button>
            <span className="drawer-recall-hint">
              No timer. Give your memory some room.
            </span>
          </div>
        ) : editing ? (
          <form
            className="drawer-editor"
            onSubmit={(event) => {
              event.preventDefault();
              if (!editTitle.trim() || !editContent.trim()) {
                setEditError("Add a title and study material before saving.");
                return;
              }
              try {
                updateAnchor(anchor.id, {
                  title: editTitle.trim(),
                  content: editContent.trim(),
                });
                setEditing(false);
                setEditError("");
              } catch (error) {
                setEditError(
                  error instanceof Error
                    ? error.message
                    : "Could not save your changes. Please try again.",
                );
              }
            }}
          >
            <label htmlFor="anchor-edit-title">Concept title</label>
            <input
              id="anchor-edit-title"
              value={editTitle}
              maxLength={80}
              required
              onChange={(event) => setEditTitle(event.target.value)}
            />
            <label htmlFor="anchor-edit-content">
              Study material <span>Markdown supported</span>
            </label>
            <textarea
              id="anchor-edit-content"
              value={editContent}
              maxLength={10000}
              required
              rows={12}
              onChange={(event) => setEditContent(event.target.value)}
            />
            {editError && (
              <p className="drawer-error" role="alert">
                {editError}
              </p>
            )}
            <div className="drawer-edit-actions">
              <button
                type="button"
                className="drawer-secondary"
                onClick={() => {
                  setEditing(false);
                  setEditTitle(anchor.title);
                  setEditContent(anchor.content);
                }}
              >
                Cancel
              </button>
              <button type="submit" className="drawer-primary">
                <Check size={16} />
                Save changes
              </button>
            </div>
          </form>
        ) : (
          <div className="drawer-material">
            <div className="drawer-section-heading">
              <BookOpen size={14} />
              <span>THE IDEA</span>
              {!recall && (
                <button
                  className="drawer-text-button"
                  onClick={() => setEditing(true)}
                >
                  <Pencil size={12} />
                  Edit
                </button>
              )}
            </div>
            <AnchorMaterial content={anchor.content} />
          </div>
        )}

        {!recall && !editing && (
          <div className="drawer-memory-tip">
            <Sparkles size={17} />
            <div>
              <strong>Make it memorable</strong>
              <p>
                Imagine this idea living inside the artifact. The more vivid the
                connection, the easier it is to recall.
              </p>
            </div>
          </div>
        )}

        {recall && visible && !rated && (
          <div className="drawer-rating-section">
            <h3>How did that feel?</h3>
            <p>Your honest answer helps track your progress.</p>
            <div className="drawer-ratings">
              <button
                className="drawer-rating drawer-rating--failed"
                onClick={() => rate("failed")}
              >
                <span>↻</span>
                <strong>Failed</strong>
                <small>Try again soon</small>
              </button>
              <button
                className="drawer-rating drawer-rating--hard"
                onClick={() => rate("hard")}
              >
                <span>~</span>
                <strong>Hard</strong>
                <small>Needed a hint</small>
              </button>
              <button
                className="drawer-rating drawer-rating--easy"
                onClick={() => rate("easy")}
              >
                <Check size={21} />
                <strong>Easy</strong>
                <small>Got it right</small>
              </button>
            </div>
          </div>
        )}

        {recall && rated && (
          <div className="drawer-review-saved" role="status">
            <CheckCircle2 size={21} />
            <div>
              <strong>
                {nextAnchor ? "Progress saved" : "Room complete. Nicely done."}
              </strong>
              <p>
                {nextAnchor
                  ? `${lastRating === "easy" ? "One more idea, a little more familiar." : "Every recall is another connection."} Ready for the next?`
                  : `You revisited all ${roomAnchors.length} ${roomAnchors.length === 1 ? "anchor" : "anchors"} in this room.`}
              </p>
            </div>
          </div>
        )}

        {!recall && confirmDelete && (
          <div className="drawer-delete-confirm" role="alert">
            <strong>Remove this memory anchor?</strong>
            <p>This deletes its notes and review history.</p>
            <div>
              <button
                className="drawer-secondary"
                onClick={() => setConfirmDelete(false)}
              >
                Keep anchor
              </button>
              <button
                className="drawer-delete-button"
                onClick={() => deleteAnchor(anchor.id)}
              >
                Remove anchor
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="drawer-footer">
        {recall ? (
          rated ? (
            <button
              className="drawer-primary drawer-primary--wide"
              onClick={() => {
                if (nextAnchor) selectAnchor(nextAnchor.id);
                else {
                  setMode("explore");
                  selectAnchor(null);
                }
              }}
            >
              {nextAnchor ? "Next anchor" : "Back to your palace"}
              <ArrowRight size={17} />
            </button>
          ) : (
            <p className="drawer-footer-note">
              <span className="drawer-eyebrow-dot" />
              {
                roomAnchors.filter((item) => reviewedIds.has(item.id)).length
              } of {roomAnchors.length} anchors recalled
            </p>
          )
        ) : (
          <>
            <button
              className="drawer-icon-button drawer-remove"
              aria-label="Remove anchor"
              onClick={() => setConfirmDelete((value) => !value)}
            >
              <Trash2 size={17} />
            </button>
            <button
              className="drawer-primary"
              onClick={() => {
                setMode("recall");
                selectAnchor(anchor.id);
              }}
            >
              <Sparkles size={16} />
              Practice this anchor
              <ChevronRight size={17} />
            </button>
          </>
        )}
      </div>
    </>
  );
}

export default function AnchorDrawer() {
  const selectedId = usePalaceStore((state) => state.selectedAnchorId);
  const anchor = usePalaceStore((state) =>
    state.anchors.find((item) => item.id === state.selectedAnchorId),
  );
  const mode = usePalaceStore((state) => state.mode);
  const selectAnchor = usePalaceStore((state) => state.selectAnchor);
  const rateAnchor = usePalaceStore((state) => state.rateAnchor);
  const sessionRatings = usePalaceStore((state) => state.sessionRatings);
  const reviewedIds = new Set(Object.keys(sessionRatings));

  return (
    <Dialog
      isOpen={Boolean(selectedId && anchor)}
      onClose={() => selectAnchor(null)}
      titleId="anchor-drawer-title"
      variant="drawer"
      className="drawer-panel"
    >
      {anchor && (
        <AnchorDetails
          key={`${anchor.id}-${mode}`}
          anchor={anchor}
          mode={mode}
          reviewedIds={reviewedIds}
          onReview={(id, rating) => {
            if (reviewedIds.has(id)) return;
            rateAnchor(id, rating);
          }}
        />
      )}
    </Dialog>
  );
}
