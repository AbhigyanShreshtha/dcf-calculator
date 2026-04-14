import { render, screen } from "@testing-library/react";

import { OutputSummary } from "./output-summary";
import type { DcfCalculationResponse } from "../../types/dcf";

const calculation: DcfCalculationResponse = {
  company_name: "TestCo",
  model_name: "TestCo",
  scenario_name: "base",
  model_type: "fcff",
  enterprise_value: 1200,
  equity_value: 1050,
  intrinsic_value_per_share: 21,
  current_price_per_share: 18,
  upside_downside_pct: 16.7,
  buy_under_price: 16.8,
  present_value_of_forecast_cash_flows: 400,
  present_value_of_terminal_value: 800,
  terminal_value: 1400,
  terminal_value_contribution_pct: 66.7,
  terminal_ebitda: 110,
  terminal_cash_flow: 85,
  forecast_rows: [],
  transparency: {
    formulas: [],
    terminal_value_formula: "TV = FCF_(n+1) / (r - g)",
    discount_factors: [],
    enterprise_to_equity_bridge: [],
    notes: [],
  },
};

describe("OutputSummary", () => {
  it("renders the primary value cards", () => {
    render(<OutputSummary calculation={calculation} currencySymbol="$" />);

    expect(screen.getByText("Enterprise Value")).toBeInTheDocument();
    expect(screen.getByText("$1,200.00")).toBeInTheDocument();
    expect(screen.getByText("Intrinsic Value / Share")).toBeInTheDocument();
    expect(screen.getByText("$21.00")).toBeInTheDocument();
  });
});

