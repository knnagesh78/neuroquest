"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import {
  getAppNavigation,
  readWorkspaceRoute,
  type WorkspacePage,
} from "@/lib/navigation";
import { usePalaceStore } from "@/store/usePalaceStore";

const subscribe = (listener: () => void) =>
  getAppNavigation().subscribe(listener);
const snapshot = () => getAppNavigation().snapshot();
const serverSnapshot = () => "/";

export function useWorkspaceNavigation() {
  const href = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const route = useMemo(() => readWorkspaceRoute(href), [href]);
  useEffect(() => {
    const state = usePalaceStore.getState();
    const validRoom = state.rooms.some((room) => room.id === route.roomId);
    if (validRoom && route.roomId !== state.activeRoomId)
      state.setRoom(route.roomId!);
    else if (!validRoom && route.roomId !== (state.activeRoomId || null)) {
      getAppNavigation().navigate(route.page, state.activeRoomId || null, true);
    }
  }, [route]);
  const navigateTo = useCallback((page: WorkspacePage) => {
    getAppNavigation().navigate(
      page,
      usePalaceStore.getState().activeRoomId || null,
    );
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);
  return { page: route.page, navigateTo };
}

/** Phone Back dismisses the current drawer, dialog or menu before leaving a screen. */
export function useBackDismiss(open: boolean, onClose: () => void) {
  const id = useId();
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    if (!open) return;
    return getAppNavigation().registerPanel(id, () => closeRef.current());
  }, [open, id]);
}
