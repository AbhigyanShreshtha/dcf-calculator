import { apiFetch } from "./client";
import type {
  DcfAssumptions,
  DcfCalculationResponse,
  ReverseDcfRequest,
  ReverseDcfResponse,
  SavedModelPayload,
  SavedModelSummary,
  SavedValuationModel,
  ScenarioCompareResponse,
  SensitivityMatrixResponse,
  SensitivityRequest,
  TargetReturnRequest,
  TargetReturnResponse,
} from "../types/dcf";

export function calculateDcf(assumptions: DcfAssumptions) {
  return apiFetch<DcfCalculationResponse>("/dcf/calculate", {
    method: "POST",
    body: JSON.stringify(assumptions),
  });
}

export function calculateSensitivity(payload: SensitivityRequest) {
  return apiFetch<SensitivityMatrixResponse>("/dcf/sensitivity", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function compareScenarios(scenarios: DcfAssumptions[]) {
  return apiFetch<ScenarioCompareResponse>("/dcf/scenario/compare", {
    method: "POST",
    body: JSON.stringify({ scenarios }),
  });
}

export function reverseDcf(payload: ReverseDcfRequest) {
  return apiFetch<ReverseDcfResponse>("/dcf/reverse", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function targetReturn(payload: TargetReturnRequest) {
  return apiFetch<TargetReturnResponse>("/dcf/target-return", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function listModels() {
  return apiFetch<SavedModelSummary[]>("/models");
}

export function getModel(id: string) {
  return apiFetch<SavedValuationModel>(`/models/${id}`);
}

export function createModel(payload: SavedModelPayload) {
  return apiFetch<SavedValuationModel>("/models", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateModel(id: string, payload: SavedModelPayload) {
  return apiFetch<SavedValuationModel>(`/models/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteModel(id: string) {
  return apiFetch<void>(`/models/${id}`, {
    method: "DELETE",
  });
}

export function duplicateModel(id: string) {
  return apiFetch<SavedValuationModel>(`/models/${id}/duplicate`, {
    method: "POST",
  });
}

