/** Serial, debounced saves. A failed write stays dirty and can be retried without losing edits. */
export class SaveQueue<T> {
  private current: T;
  private saved: T | null;
  private revision: number;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private running: Promise<void> | undefined;
  private stopped = false;
  private failure: unknown = null;

  constructor(
    data: T,
    saved: T | null,
    revision: number,
    private write: (
      before: T | null,
      after: T,
      revision: number,
    ) => Promise<number>,
    private notify: (
      status: "saving" | "saved" | "error",
      error?: unknown,
    ) => void,
  ) {
    this.current = data;
    this.saved = saved;
    this.revision = revision;
  }

  get dirty() {
    return JSON.stringify(this.current) !== JSON.stringify(this.saved);
  }

  update(data: T) {
    if (this.stopped) return;
    this.current = data;
    if (!this.dirty) return;
    if (!this.failure) this.notify("saving");
    clearTimeout(this.timer);
    if (!this.failure)
      this.timer = setTimeout(() => {
        void this.flush().catch(() => {});
      }, 650);
  }

  async flush(): Promise<void> {
    clearTimeout(this.timer);
    if (this.stopped) return;
    if (this.running) {
      await this.running;
      return this.flush();
    }
    this.failure = null;
    if (!this.dirty) {
      this.notify("saved");
      return;
    }
    this.notify("saving");
    this.running = (async () => {
      try {
        while (this.dirty && !this.stopped) {
          const snapshot = this.current;
          const revision = await this.write(
            this.saved,
            snapshot,
            this.revision,
          );
          this.saved = snapshot;
          this.revision = revision;
        }
        if (!this.stopped) this.notify("saved");
      } catch (error) {
        this.failure = error;
        if (!this.stopped) this.notify("error", error);
        throw error;
      }
    })();
    try {
      await this.running;
    } finally {
      this.running = undefined;
    }
  }

  stop() {
    this.stopped = true;
    clearTimeout(this.timer);
  }
}
