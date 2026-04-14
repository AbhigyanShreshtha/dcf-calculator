import type { DcfAssumptions, SavedModelPayload, ScenarioName } from "../types/dcf";

function filledArray(length: number, value = 0) {
  return Array.from({ length }, () => value);
}

function baseScenario(scenarioName: ScenarioName, growth: number, targetMargin: number): DcfAssumptions {
  const forecastYears = 5;
  return {
    company_name: "Sample Company",
    model_name: "Sample Company",
    scenario_name: scenarioName,
    model_type: "fcff",
    currency_symbol: "$",
    current_revenue: 1000,
    current_ebit_margin: 0.18,
    tax_rate: 0.24,
    forecast_years: forecastYears,
    revenue_growth: {
      mode: "constant",
      constant_rate: growth,
      rates: filledArray(forecastYears, growth),
    },
    margin_assumptions: {
      mode: "interpolate",
      fixed_margin: null,
      target_margin: targetMargin,
      values: filledArray(forecastYears, targetMargin),
    },
    dna_assumptions: {
      mode: "percent",
      percent_of_revenue: 0.03,
      values: filledArray(forecastYears, 30),
    },
    capex_assumptions: {
      mode: "percent",
      percent_of_revenue: 0.04,
      values: filledArray(forecastYears, 40),
    },
    nwc_assumptions: {
      mode: "percent",
      percent_of_incremental_revenue: 0.015,
      values: filledArray(forecastYears, 10),
    },
    stock_based_compensation: {
      mode: "percent",
      percent_of_revenue: 0.01,
      values: filledArray(forecastYears, 5),
    },
    net_borrowing: filledArray(forecastYears, 0),
    net_operating_losses: 0,
    discount_rate: 0.1,
    mid_year_discounting: true,
    terminal_value_method: "gordon_growth",
    terminal_growth_rate: 0.03,
    terminal_ebitda_multiple: 12,
    cash: 120,
    debt: 90,
    preferred_equity: 0,
    minority_interest: 0,
    diluted_shares_outstanding: 50,
    current_market_price_per_share: 24,
    margin_of_safety: 0.2,
  };
}

export function normalizeSeries(values: number[] | null | undefined, years: number, fallback = 0) {
  const next = [...(values ?? [])].slice(0, years);
  while (next.length < years) {
    next.push(fallback);
  }
  return next;
}

export function normalizeScenario(scenario: DcfAssumptions): DcfAssumptions {
  const years = scenario.forecast_years;
  return {
    ...scenario,
    revenue_growth: {
      ...scenario.revenue_growth,
      rates: normalizeSeries(
        scenario.revenue_growth.rates,
        years,
        scenario.revenue_growth.constant_rate ?? 0,
      ),
    },
    margin_assumptions: {
      ...scenario.margin_assumptions,
      values: normalizeSeries(
        scenario.margin_assumptions.values,
        years,
        scenario.margin_assumptions.target_margin ?? scenario.current_ebit_margin,
      ),
    },
    dna_assumptions: {
      ...scenario.dna_assumptions,
      values: normalizeSeries(
        scenario.dna_assumptions.values,
        years,
        scenario.current_revenue * (scenario.dna_assumptions.percent_of_revenue ?? 0),
      ),
    },
    capex_assumptions: {
      ...scenario.capex_assumptions,
      values: normalizeSeries(
        scenario.capex_assumptions.values,
        years,
        scenario.current_revenue * (scenario.capex_assumptions.percent_of_revenue ?? 0),
      ),
    },
    nwc_assumptions: {
      ...scenario.nwc_assumptions,
      values: normalizeSeries(scenario.nwc_assumptions.values, years, 0),
    },
    stock_based_compensation: {
      ...scenario.stock_based_compensation,
      values: normalizeSeries(
        scenario.stock_based_compensation.values,
        years,
        scenario.current_revenue * (scenario.stock_based_compensation.percent_of_revenue ?? 0),
      ),
    },
    net_borrowing: normalizeSeries(scenario.net_borrowing, years, 0),
  };
}

export function createDefaultModel(): SavedModelPayload {
  return {
    name: "New Valuation",
    description: "Editable three-scenario DCF model",
    default_scenario: "base",
    scenarios: [
      normalizeScenario(baseScenario("bear", 0.08, 0.2)),
      normalizeScenario(baseScenario("base", 0.12, 0.24)),
      normalizeScenario(baseScenario("bull", 0.16, 0.28)),
    ],
  };
}

export function normalizeModel(model: SavedModelPayload): SavedModelPayload {
  return {
    ...model,
    description: model.description ?? "",
    scenarios: model.scenarios.map(normalizeScenario),
  };
}
