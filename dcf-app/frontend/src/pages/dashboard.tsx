import { useQuery } from "@tanstack/react-query";
import { ArrowRight, FolderHeart, PlusCircle } from "lucide-react";
import { Link } from "react-router-dom";

import { listModels } from "../api/dcf";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { formatCurrency, formatPercentFromPercentage } from "../lib/format";

export function DashboardPage() {
  const modelsQuery = useQuery({
    queryKey: ["models"],
    queryFn: listModels,
  });

  return (
    <div className="space-y-6">
      <Card className="bg-hero-grid">
        <CardHeader>
          <Badge>Investor Workflow</Badge>
          <CardTitle className="text-3xl">Build, test, and save DCF models without touching Excel</CardTitle>
          <CardDescription className="max-w-3xl text-base">
            Model FCFF or FCFE, run sensitivity tables, compare bear/base/bull scenarios, solve reverse DCF, and calculate max buy prices from target returns.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/valuations/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              Start New Valuation
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/models">
              Browse Saved Models
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {(modelsQuery.data ?? []).slice(0, 3).map((model) => (
          <Card key={model.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{model.name}</CardTitle>
                <Badge>{model.default_scenario}</Badge>
              </div>
              <CardDescription>{model.description ?? model.company_name}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Metric label="Intrinsic / Share" value={formatCurrency(model.intrinsic_value_per_share)} />
                <Metric label="Upside / Downside" value={formatPercentFromPercentage(model.upside_downside_pct)} />
              </div>
              <Button variant="secondary" className="w-full" asChild>
                <Link to={`/valuations/${model.id}`}>Open Model</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
        {modelsQuery.data?.length === 0 ? (
          <Card className="lg:col-span-3">
            <CardContent className="flex min-h-[220px] flex-col items-center justify-center text-center">
              <FolderHeart className="mb-3 h-6 w-6 text-primary" />
              <p className="text-lg font-semibold">No saved models yet</p>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Create your first valuation to start storing scenario sets, comparing output, and exporting your work.
              </p>
            </CardContent>
          </Card>
        ) : null}
      </div>
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

