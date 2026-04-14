import { ArrowDown, ArrowUp, Landmark, PiggyBank, ShieldCheck, WalletCards } from "lucide-react";

import { formatCurrency, formatPercentFromPercentage } from "../../lib/format";
import type { DcfCalculationResponse } from "../../types/dcf";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";

export function OutputSummary({
  calculation,
  currencySymbol,
}: {
  calculation: DcfCalculationResponse | null;
  currencySymbol: string;
}) {
  if (!calculation) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Output Summary</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Start editing assumptions to see enterprise value, equity value, intrinsic value per share, and buy-under price.
        </CardContent>
      </Card>
    );
  }

  const cards = [
    {
      label: "Enterprise Value",
      value: formatCurrency(calculation.enterprise_value, currencySymbol),
      icon: Landmark,
    },
    {
      label: "Equity Value",
      value: formatCurrency(calculation.equity_value, currencySymbol),
      icon: WalletCards,
    },
    {
      label: "Intrinsic Value / Share",
      value: formatCurrency(calculation.intrinsic_value_per_share, currencySymbol),
      icon: PiggyBank,
    },
    {
      label: "Buy-Under Price",
      value: formatCurrency(calculation.buy_under_price, currencySymbol),
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {cards.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.label}>
            <CardContent className="flex items-center justify-between py-5">
              <div>
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className="mt-2 text-2xl font-semibold">{item.value}</p>
              </div>
              <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                <Icon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        );
      })}

      <Card className="xl:col-span-2">
        <CardContent className="flex flex-col gap-3 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Current price</p>
            <p className="mt-1 text-xl font-semibold">
              {calculation.current_price_per_share !== null
                ? formatCurrency(calculation.current_price_per_share, currencySymbol)
                : "--"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Upside / downside</p>
            <p className="mt-1 flex items-center gap-2 text-xl font-semibold">
              {(calculation.upside_downside_pct ?? 0) >= 0 ? (
                <ArrowUp className="h-4 w-4 text-primary" />
              ) : (
                <ArrowDown className="h-4 w-4 text-accent" />
              )}
              {formatPercentFromPercentage(calculation.upside_downside_pct)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Terminal value contribution</p>
            <p className="mt-1 text-xl font-semibold">
              {formatPercentFromPercentage(calculation.terminal_value_contribution_pct)}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

