import type { DcfCalculationResponse, SavedModelPayload } from "../types/dcf";

function downloadFile(filename: string, mimeType: string, content: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function exportCalculationAsJson(model: SavedModelPayload, calculation: DcfCalculationResponse | null) {
  downloadFile(
    `${model.name.replace(/\s+/g, "-").toLowerCase()}.json`,
    "application/json",
    JSON.stringify({ model, calculation }, null, 2),
  );
}

export function exportCalculationAsCsv(
  model: SavedModelPayload,
  calculation: DcfCalculationResponse | null,
  currencySymbol: string,
) {
  if (!calculation) {
    return;
  }

  const summaryRows = [
    ["Metric", "Value"],
    ["Enterprise Value", `${currencySymbol}${calculation.enterprise_value}`],
    ["Equity Value", `${currencySymbol}${calculation.equity_value}`],
    ["Intrinsic Value / Share", `${currencySymbol}${calculation.intrinsic_value_per_share}`],
    ["Buy Under Price", `${currencySymbol}${calculation.buy_under_price}`],
  ];

  const forecastHeader = [
    "Year",
    "Revenue",
    "Growth Rate",
    "EBIT Margin",
    "EBIT",
    "NOPAT",
    "D&A",
    "Capex",
    "Change in NWC",
    "FCFF",
    "FCFE",
    "Discount Factor",
  ];

  const forecastRows = calculation.forecast_rows.map((row) => [
    row.year,
    row.revenue,
    row.growth_rate,
    row.ebit_margin,
    row.ebit,
    row.nopat,
    row.depreciation_and_amortization,
    row.capex,
    row.change_in_nwc,
    row.fcff,
    row.fcfe,
    row.discount_factor,
  ]);

  const csv = [...summaryRows, [], forecastHeader, ...forecastRows]
    .map((line) => line.join(","))
    .join("\n");

  downloadFile(`${model.name.replace(/\s+/g, "-").toLowerCase()}.csv`, "text/csv", csv);
}

