import { invoke } from "@tauri-apps/api/core";
import { demoRequest } from "./demo";
import type { Request } from "./types";

export const desktop = "__TAURI_INTERNALS__" in window;
export function request<T>(request: Request): Promise<T> {
  return desktop ? invoke<T>("dispatch", { request }) : demoRequest<T>(request);
}
export async function cancel(): Promise<void> {
  if (desktop) await invoke("cancel");
}
