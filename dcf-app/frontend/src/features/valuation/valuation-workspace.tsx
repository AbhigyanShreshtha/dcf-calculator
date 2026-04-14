import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, RefreshCw, Save, Sparkles, Copy } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { useNavigate } from "react-router-dom";

import {
  calculateDcf,
  calculateSensitivity,
  compareScenarios,
  createModel,
  duplicateModel,
  reverseDcf,
  targetReturn,
  updateModel,
} from "../../api/dcf";
import { CashFlowChart } from "../../components/charts/cash-flow-chart";
import { PvBreakdownChart } from "../../components/charts/pv-breakdown-chart";
import { RevenueChart } from "../../components/charts/revenue-chart";
import { ScenarioComparisonChart } from "../../components/charts/scenario-comparison-chart";
import { AssumptionsForm } from "../../components/forms/assumptions-form";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { createDefaultModel, normalizeModel } from "../../lib/default-model";
import { exportCalculationAsCsv, exportCalculationAsJson } from "../../lib/export";
import { useDebouncedValue } from "../../hooks/use-debounced-value";
import type {
  ReverseSolveMode,
  SavedModelPayload,
  SavedValuationModel,
  SensitivityMatrixType,
} from "../../types/dcf";
import { ForecastTable } from "./forecast-table";
import { HowCalculated } from "./how-calculated";
import { OutputSummary } from "./output-summary";
import { ReverseDcfPanel } from "./reverse-dcf-panel";
import { SensitivityHeatmap } from "./sensitivity-heatmap";
import { TargetReturnPanel } from "./target-return-panel";
import { modelEditorSchema, type ModelEditorValues } from "./schema";

type Props = {
  mode: "create" | "edit";
  initialModel?: SavedValuationModel | SavedModelPayload;
  modelId?: string;
};

type SensitivityControlState = {
  waccStart: string;
  waccEnd: string;
  waccStep: string;
  terminalGrowthStart: string;
  terminalGrowthEnd: string;
  terminalGrowthStep: string;
  exitMultipleStart: string;
  exitMultipleEnd: string;
  exitMultipleStep: string;
};

const defaultSensitivityControls: SensitivityControlState = {
  waccStart: "",
  waccEnd: "",
  waccStep: "",
  terminalGrowthStart: "",
  terminalGrowthEnd: "",
  terminalGrowthStep: "",
  exitMultipleStart: "",
  exitMultipleEnd: "",
  exitMultipleStep: "",
};

export function ValuationWorkspace({ mode, initialModel, modelId }: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const normalizedInitialModel = useMemo(
    () => normalizeModel(initialModel ?? createDefaultModel()),
    [initialModel],
  );
  const form = useForm<ModelEditorValues>({
    resolver: zodResolver(modelEditorSchema),
    defaultValues: normalizedInitialModel,
  });

  const [activeScenarioIndex, setActiveScenarioIndex] = useState(1);
  const [matrixType, setMatrixType] = useState<SensitivityMatrixType>("wacc_growth");
  const [sensitivityControls, setSensitivityControls] = useState(defaultSensitivityControls);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);

  const scenarios = useWatch({ control: form.control, name: "scenarios" }) ?? normalizedInitialModel.scenarios;
  const activeScenario = scenarios[activeScenarioIndex] ?? scenarios[0];
  const debouncedScenario = useDebouncedValue(activeScenario, 700);
  const debouncedScenarios = useDebouncedValue(scenarios, 900);

  const calculationMutation = useMutation({ mutationFn: calculateDcf });
  const sensitivityMutation = useMutation({ mutationFn: calculateSensitivity });
  const compareMutation = useMutation({ mutationFn: compareScenarios });
  const reverseMutation = useMutation({ mutationFn: reverseDcf });
  const targetReturnMutation = useMutation({ mutationFn: targetReturn });
  const saveMutation = useMutation({
    mutationFn: async (payload: SavedModelPayload) =>
      mode === "edit" && modelId ? updateModel(modelId, payload) : createModel(payload),
    onSuccess: async (model) => {
      await queryClient.invalidateQueries({ queryKey: ["models"] });
      navigate(`/valuations/${model.id}`);
    },
  });
  const duplicateMutation = useMutation({
    mutationFn: async () => {
      if (!modelId) {
        throw new Error("Save the model before duplicating it.");
      }
      return duplicateModel(modelId);
    },
    onSuccess: async (model) => {
      await queryClient.invalidateQueries({ queryKey: ["models"] });
      navigate(`/valuations/${model.id}`);
    },
  });

  useEffect(() => {
    form.reset(normalizedInitialModel);
    const defaultIndex = normalizedInitialModel.scenarios.findIndex(
      (scenario) => scenario.scenario_name === normalizedInitialModel.default_scenario,
    );
    setActiveScenarioIndex(defaultIndex >= 0 ? defaultIndex : 0);
  }, [form, normalizedInitialModel]);

  useEffect(() => {
    if (!debouncedScenario) {
      return;
    }

    void runAnalysis(debouncedScenario, debouncedScenarios);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedScenario, debouncedScenarios, matrixType, sensitivityControls]);

  async function runAnalysis(currentScenario = debouncedScenario, scenarioSet = debouncedScenarios) {
    try {
      setWorkspaceError(null);
      await Promise.all([
        calculationMutation.mutateAsync(currentScenario),
        sensitivityMutation.mutateAsync({
          assumptions: currentScenario,
          matrix_type: matrixType,
          wacc_axis: buildAxisConfig(
            sensitivityControls.waccStart,
            sensitivityControls.waccEnd,
            sensitivityControls.waccStep,
          ),
          terminal_growth_axis: buildAxisConfig(
            sensitivityControls.terminalGrowthStart,
            sensitivityControls.terminalGrowthEnd,
            sensitivityControls.terminalGrowthStep,
          ),
          exit_multiple_axis: buildAxisConfig(
            sensitivityControls.exitMultipleStart,
            sensitivityControls.exitMultipleEnd,
            sensitivityControls.exitMultipleStep,
          ),
        }),
      ]);
      if (scenarioSet.length >= 2) {
        await compareMutation.mutateAsync(scenarioSet);
      }
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : "Analysis failed.");
    }
  }

  function currentPayload(): SavedModelPayload {
    return normalizeModel(form.getValues());
  }

  async function handleSave() {
    const valid = await form.trigger();
    if (!valid) {
      setWorkspaceError("Please resolve validation errors before saving.");
      return;
    }
    setWorkspaceError(null);
    await saveMutation.mutateAsync(currentPayload());
  }

  async function handleDuplicate() {
    try {
      setWorkspaceError(null);
      await duplicateMutation.mutateAsync();
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : "Unable to duplicate model.");
    }
  }

  async function handleReverseSolve(solveFor: ReverseSolveMode, lowerBound?: number | null, upperBound?: number | null) {
    try {
      setWorkspaceError(null);
      await reverseMutation.mutateAsync({
        assumptions: activeScenario,
        solve_for: solveFor,
        lower_bound: lowerBound ?? undefined,
        upper_bound: upperBound ?? undefined,
      });
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : "Reverse DCF failed.");
    }
  }

  async function handleTargetReturn(desiredAnnualizedReturn: number, holdingPeriodYears: number | null) {
    try {
      setWorkspaceError(null);
      await targetReturnMutation.mutateAsync({
        assumptions: activeScenario,
        desired_annualized_return: desiredAnnualizedReturn,
        holding_period_years: holdingPeriodYears,
        margin_of_safety: activeScenario.margin_of_safety,
      });
    } catch (error) {
      setWorkspaceError(error instanceof Error ? error.message : "Target return analysis failed.");
    }
  }

  const currencySymbol = activeScenario?.currency_symbol ?? "$";
  const calculation = calculationMutation.data ?? null;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(360px,430px)_1fr]">
      <div className="space-y-4">
        <Card className="bg-hero-grid">
          <CardHeader>
            <CardTitle>{mode === "edit" ? "Edit Valuation Model" : "New Valuation Model"}</CardTitle>
            <CardDescription>
              Work through assumptions on the left and keep the output pane on the right updated with auto-calculate plus manual control.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button onClick={() => void runAnalysis(activeScenario, scenarios)} disabled={calculationMutation.isPending}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Recalculate
            </Button>
            <Button variant="secondary" onClick={() => void handleSave()} disabled={saveMutation.isPending}>
              <Save className="mr-2 h-4 w-4" />
              Save Model
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                form.reset(normalizedInitialModel);
                setWorkspaceError(null);
              }}
            >
              Reset Assumptions
            </Button>
            <Button variant="outline" onClick={() => exportCalculationAsCsv(currentPayload(), calculation, currencySymbol)}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={() => exportCalculationAsJson(currentPayload(), calculation)}>
              <Download className="mr-2 h-4 w-4" />
              Export JSON
            </Button>
            {mode === "edit" ? (
              <Button variant="outline" onClick={() => void handleDuplicate()} disabled={duplicateMutation.isPending}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </Button>
            ) : null}
          </CardContent>
        </Card>

        {workspaceError ? (
          <Card className="border-accent/50 bg-accent/5">
            <CardContent className="py-4 text-sm text-accent">{workspaceError}</CardContent>
          </Card>
        ) : null}

        <AssumptionsForm
          form={form}
          activeScenarioIndex={activeScenarioIndex}
          onScenarioChange={setActiveScenarioIndex}
        />
      </div>

      <div className="space-y-4">
        <OutputSummary calculation={calculation} currencySymbol={currencySymbol} />

        <div className="grid gap-4 2xl:grid-cols-2">
          <ChartCard
            title="Revenue Projection"
            description="Top-line path implied by the current scenario."
            content={
              calculation ? (
                <RevenueChart rows={calculation.forecast_rows} currencySymbol={currencySymbol} />
              ) : (
                <Placeholder />
              )
            }
          />
          <ChartCard
            title="FCFF / FCFE Projection"
            description="Annual unlevered and levered free cash flow views."
            content={
              calculation ? (
                <CashFlowChart rows={calculation.forecast_rows} currencySymbol={currencySymbol} />
              ) : (
                <Placeholder />
              )
            }
          />
          <ChartCard
            title="Present Value Breakdown"
            description="How much of value comes from explicit forecast versus terminal value."
            content={
              calculation ? (
                <PvBreakdownChart
                  forecastPv={calculation.present_value_of_forecast_cash_flows}
                  terminalPv={calculation.present_value_of_terminal_value}
                  currencySymbol={currencySymbol}
                />
              ) : (
                <Placeholder />
              )
            }
          />
          <ChartCard
            title="Bear / Base / Bull Comparison"
            description="Scenario outputs from the saved scenario set."
            content={
              compareMutation.data ? (
                <ScenarioComparisonChart
                  results={compareMutation.data.results}
                  currencySymbol={compareMutation.data.currency_symbol}
                />
              ) : (
                <Placeholder />
              )
            }
          />
        </div>

        <ForecastTable rows={calculation?.forecast_rows ?? []} currencySymbol={currencySymbol} />

        <Card>
          <CardHeader>
            <CardTitle>Sensitivity Controls</CardTitle>
            <CardDescription>
              Configure 5x5 style ranges for WACC vs terminal growth or WACC vs exit multiple.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={matrixType === "wacc_growth" ? "default" : "outline"}
                onClick={() => setMatrixType("wacc_growth")}
              >
                WACC vs Terminal Growth
              </Button>
              <Button
                variant={matrixType === "wacc_exit_multiple" ? "default" : "outline"}
                onClick={() => setMatrixType("wacc_exit_multiple")}
              >
                WACC vs Exit Multiple
              </Button>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <Input
                placeholder="WACC start"
                value={sensitivityControls.waccStart}
                onChange={(event) =>
                  setSensitivityControls((current) => ({ ...current, waccStart: event.target.value }))
                }
              />
              <Input
                placeholder="WACC end"
                value={sensitivityControls.waccEnd}
                onChange={(event) =>
                  setSensitivityControls((current) => ({ ...current, waccEnd: event.target.value }))
                }
              />
              <Input
                placeholder="WACC step"
                value={sensitivityControls.waccStep}
                onChange={(event) =>
                  setSensitivityControls((current) => ({ ...current, waccStep: event.target.value }))
                }
              />
              {matrixType === "wacc_growth" ? (
                <>
                  <Input
                    placeholder="Terminal growth start"
                    value={sensitivityControls.terminalGrowthStart}
                    onChange={(event) =>
                      setSensitivityControls((current) => ({
                        ...current,
                        terminalGrowthStart: event.target.value,
                      }))
                    }
                  />
                  <Input
                    placeholder="Terminal growth end"
                    value={sensitivityControls.terminalGrowthEnd}
                    onChange={(event) =>
                      setSensitivityControls((current) => ({
                        ...current,
                        terminalGrowthEnd: event.target.value,
                      }))
                    }
                  />
                  <Input
                    placeholder="Terminal growth step"
                    value={sensitivityControls.terminalGrowthStep}
                    onChange={(event) =>
                      setSensitivityControls((current) => ({
                        ...current,
                        terminalGrowthStep: event.target.value,
                      }))
                    }
                  />
                </>
              ) : (
                <>
                  <Input
                    placeholder="Exit multiple start"
                    value={sensitivityControls.exitMultipleStart}
                    onChange={(event) =>
                      setSensitivityControls((current) => ({
                        ...current,
                        exitMultipleStart: event.target.value,
                      }))
                    }
                  />
                  <Input
                    placeholder="Exit multiple end"
                    value={sensitivityControls.exitMultipleEnd}
                    onChange={(event) =>
                      setSensitivityControls((current) => ({
                        ...current,
                        exitMultipleEnd: event.target.value,
                      }))
                    }
                  />
                  <Input
                    placeholder="Exit multiple step"
                    value={sensitivityControls.exitMultipleStep}
                    onChange={(event) =>
                      setSensitivityControls((current) => ({
                        ...current,
                        exitMultipleStep: event.target.value,
                      }))
                    }
                  />
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <SensitivityHeatmap matrix={sensitivityMutation.data ?? null} />

        <div className="grid gap-4 2xl:grid-cols-2">
          <ReverseDcfPanel
            result={reverseMutation.data ?? null}
            onSolve={handleReverseSolve}
            loading={reverseMutation.isPending}
            currencySymbol={currencySymbol}
          />
          <TargetReturnPanel
            result={targetReturnMutation.data ?? null}
            onRun={handleTargetReturn}
            loading={targetReturnMutation.isPending}
            currencySymbol={currencySymbol}
          />
        </div>

        <HowCalculated calculation={calculation} currencySymbol={currencySymbol} />
      </div>
    </div>
  );
}

function buildAxisConfig(start: string, end: string, step: string) {
  if (!start || !end || !step) {
    return undefined;
  }
  return {
    start: Number(start),
    end: Number(end),
    step: Number(step),
  };
}

function ChartCard({
  title,
  description,
  content,
}: {
  title: string;
  description: string;
  content: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}

function Placeholder() {
  return (
    <div className="flex h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/40 text-center text-sm text-muted-foreground">
      <Sparkles className="mb-3 h-5 w-5 text-primary" />
      Run a calculation to populate this visualization.
    </div>
  );
}

