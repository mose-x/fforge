// Shared types for the Wails backend bridge.
//
// Wails generates model classes for structs that appear in bound method
// signatures (EngineStatus, MediaInfo, RunRequest) under
// `wailsjs/go/models.ts` as `main.<Name>`. ProgressEvent is only ever
// emitted as an event payload, so Wails doesn't generate a model for it —
// we declare it here to match the Go struct in app.go.

import type { main } from "../wailsjs/go/models";

export type EngineStatus = main.EngineStatus;
export type MediaInfo = main.MediaInfo;
export type RunRequest = main.RunRequest;

export type ProgressStatus = "running" | "done" | "error";

export interface ProgressEvent {
  percent: number;
  timeSec: number;
  speed: string;
  frame: number;
  status: ProgressStatus;
  message: string;
  outputPath: string;
}
