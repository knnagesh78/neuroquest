import { describe, expect, it, vi } from "vitest";
import { SaveQueue } from "@/lib/save-queue";

describe("cloud save lifecycle", () => {
  it("serializes edits made while a previous save is in flight", async () => {
    let finish!: (revision: number) => void;
    const write = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<number>((resolve) => {
            finish = resolve;
          }),
      )
      .mockResolvedValueOnce(3);
    const notify = vi.fn();
    const queue = new SaveQueue<string>("initial", "initial", 1, write, notify);
    queue.update("first");
    const saving = queue.flush();
    queue.update("second");
    finish(2);
    await saving;
    queue.stop();
    expect(write.mock.calls).toEqual([
      ["initial", "first", 1],
      ["first", "second", 2],
    ]);
    expect(queue.dirty).toBe(false);
    expect(notify).toHaveBeenLastCalledWith("saved");
  });
  it("retains failed edits and retries against the last confirmed revision", async () => {
    const error = new Error("offline");
    const write = vi.fn().mockRejectedValueOnce(error).mockResolvedValueOnce(2);
    const notify = vi.fn();
    const queue = new SaveQueue<string>("initial", "initial", 1, write, notify);
    queue.update("unsaved");
    await expect(queue.flush()).rejects.toThrow("offline");
    expect(queue.dirty).toBe(true);
    expect(notify).toHaveBeenLastCalledWith("error", error);
    queue.update("newer unsaved");
    await queue.flush();
    queue.stop();
    expect(write).toHaveBeenLastCalledWith("initial", "newer unsaved", 1);
    expect(queue.dirty).toBe(false);
  });
  it("does not issue queued writes or status updates after account cleanup", async () => {
    let finish!: (revision: number) => void;
    const write = vi.fn(
      () =>
        new Promise<number>((resolve) => {
          finish = resolve;
        }),
    );
    const notify = vi.fn();
    const queue = new SaveQueue<string>("initial", "initial", 1, write, notify);
    queue.update("first");
    const saving = queue.flush();
    queue.update("second");
    queue.stop();
    const count = notify.mock.calls.length;
    finish(2);
    await saving;
    await queue.flush();
    expect(write).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledTimes(count);
  });
  it("saves a fresh account before considering it synced", async () => {
    const write = vi.fn().mockResolvedValueOnce(1);
    const queue = new SaveQueue<string>("examples", null, 0, write, vi.fn());
    expect(queue.dirty).toBe(true);
    await queue.flush();
    queue.stop();
    expect(write).toHaveBeenCalledWith(null, "examples", 0);
    expect(queue.dirty).toBe(false);
  });
});
