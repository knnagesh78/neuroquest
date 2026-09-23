import { create } from "zustand";

type AccountState = {
  username: string;
  sync: "loading" | "saving" | "saved" | "error";
  error: string;
  conflict: boolean;
};

export const useAccountStore = create<AccountState>(() => ({
  username: "",
  sync: "loading",
  error: "",
  conflict: false,
}));
