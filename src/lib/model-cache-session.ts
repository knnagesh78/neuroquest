"use client";

/** Only model buffers are cached. Clear them on sign-out or an account change. */
export async function syncModelCacheUser(uid: string | null) {
  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker
    .getRegistration()
    .catch(() => undefined);
  const worker = navigator.serviceWorker.controller || registration?.active;
  if (!worker) return;
  await new Promise<void>((resolve) => {
    const channel = new MessageChannel();
    const finish = () => {
      clearTimeout(timer);
      channel.port1.close();
      resolve();
    };
    const timer = setTimeout(finish, 2000);
    channel.port1.onmessage = finish;
    worker.postMessage({ type: "NEUROQUEST_ASSET_SESSION", uid }, [
      channel.port2,
    ]);
  });
}
