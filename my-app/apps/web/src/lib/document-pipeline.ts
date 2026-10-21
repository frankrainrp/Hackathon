
import { uiText } from "./messages.ts";
import type { PipelineStep } from "./types";
export const INITIAL_STEPS: PipelineStep[] = [
  { id: "ocr", get label() { return uiText("ui.documentpipeline.a6be85ca28"); }, status: "pending" },
  { id: "extract", get label() { return uiText("ui.documentpipeline.cdfee34650"); }, status: "pending" },
  { id: "calendar", get label() { return uiText("ui.documentpipeline.67dcfb8901"); }, status: "pending" },
  { id: "persist", get label() { return uiText("ui.documentpipeline.bdacb8f077"); }, status: "pending" },
];
export function getStepDetail(id: PipelineStep["id"]): string {
  return ({ ocr: uiText("ui.documentpipeline.41c5e63ba2"), extract: uiText("ui.documentpipeline.83c0f96406"), calendar: uiText("ui.documentpipeline.cc69ed5804"), persist: uiText("ui.documentpipeline.d5220d52b5") })[id];
}
