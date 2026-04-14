import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { compareScenarios, getModel, listModels } from "../api/dcf";
import { ScenarioComparisonChart } from "../components/charts/scenario-comparison-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { formatCurrency, formatPercentFromPercentage } from "../lib/format";

export function CompareScenariosPage() {
  const modelsQuery = useQuery({
    queryKey: ["models"],
    queryFn: listModels,
  });
  const [selectedModelId, setSelectedModelId] = useState<string>("");

  useEffect(() => {
    if (!selectedModelId && modelsQuery.data?.[0]?.id) {
      setSelectedModelId(modelsQuery.data[0].id);
    }
  }, [modelsQuery.data, selectedModelId]);

  const selectedModelQuery = useQuery({
    queryKey: ["models", selectedModelId],
    queryFn: () => getModel(selectedModelId),
    enabled: Boolean(selectedModelId),
  });

  const compareMutation = useMutation({ mutationFn: compareScenarios });

  useEffect(() => {
    if (selectedModelQuery.data?.scenarios) {
      compareMutation.mutate(selectedModelQuery.data.scenarios);
    }
  }, [selectedModelQuery.data]);

  const results = compareMutation.data;
  const selectedName = useMemo(
    () => modelsQuery.data?.find((model) => model.id === selectedModelId)?.name ?? "",
    [modelsQuery.data, selectedModelId],
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Compare Scenarios</CardTitle>
          <CardDescription>Pull a saved model and inspect bear, base, and bull intrinsic value side by side.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[240px_1fr]">
          <select
            className="flex h-10 rounded-xl border border-input bg-background px-3 py-2 text-sm"
            value={selectedModelId}
            onChange={(event) => setSelectedModelId(event.target.value)}
          >
            {(modelsQuery.data ?? []).map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
          <div className="rounded-2xl bg-muted/60 px-4 py-3">
            <p className="text-sm text-muted-foreground">Selected model</p>
            <p className="mt-1 font-semibold">{selectedName || "Choose a saved model"}</p>
          </div>
        </CardContent>
      </Card>

      {results ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Scenario Comparison Chart</CardTitle>
            </CardHeader>
            <CardContent>
              <ScenarioComparisonChart results={results.results} currencySymbol={results.currency_symbol} />
            </CardContent>
          </Card>
          <div className="grid gap-4 lg:grid-cols-3">
            {results.results.map((item) => (
              <Card key={item.scenario_name}>
                <CardHeader>
                  <CardTitle className="capitalize">{item.scenario_name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <Metric label="Intrinsic / Share" value={formatCurrency(item.intrinsic_value_per_share, results.currency_symbol)} />
                  <Metric label="Equity Value" value={formatCurrency(item.equity_value, results.currency_symbol)} />
                  <Metric label="Upside / Downside" value={formatPercentFromPercentage(item.upside_downside_pct)} />
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            Load a saved model to compare scenarios.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-muted/60 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-2 font-semibold">{value}</p>
    </div>
  );
}

