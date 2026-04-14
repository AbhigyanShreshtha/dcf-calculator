import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Pencil, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";

import { deleteModel, duplicateModel, listModels } from "../api/dcf";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { formatCurrency, formatPercentFromPercentage } from "../lib/format";

export function SavedModelsPage() {
  const queryClient = useQueryClient();
  const modelsQuery = useQuery({
    queryKey: ["models"],
    queryFn: listModels,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteModel,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["models"] });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: duplicateModel,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["models"] });
    },
  });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {(modelsQuery.data ?? []).map((model) => (
        <Card key={model.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{model.name}</CardTitle>
                <CardDescription>{model.description ?? model.company_name}</CardDescription>
              </div>
              <Badge>{model.default_scenario}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Metric label="Intrinsic / Share" value={formatCurrency(model.intrinsic_value_per_share)} />
              <Metric label="Current Price" value={formatCurrency(model.current_price_per_share ?? 0)} />
              <Metric label="Upside / Downside" value={formatPercentFromPercentage(model.upside_downside_pct)} />
              <Metric label="Updated" value={new Date(model.updated_at).toLocaleString()} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" asChild>
                <Link to={`/valuations/${model.id}`}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </Button>
              <Button variant="outline" onClick={() => duplicateMutation.mutate(model.id)}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </Button>
              <Button variant="destructive" onClick={() => deleteMutation.mutate(model.id)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
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

