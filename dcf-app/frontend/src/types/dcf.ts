export type ScenarioName = "bear" | "base" | "bull" | "custom";
export type ModelType = "fcff" | "fcfe";
export type RevenueGrowthMode = "constant" | "explicit";
export type MarginMode = "fixed" | "interpolate" | "explicit";
export type SeriesMode = "percent" | "explicit";
export type TerminalValueMethod = "gordon_growth" | "exit_multiple";
export type SensitivityMatrixType = "wacc_growth" | "wacc_exit_multiple";
export type ReverseSolveMode = "revenue_growth" | "operating_margin";

export type RevenueGrowthInput = {
  mode: RevenueGrowthMode;
  constant_rate: number | null;
  rates: number[] | null;
};

export type RevenueLinkedSeriesInput = {
  mode: SeriesMode;
  percent_of_revenue: number | null;
  values: number[] | null;
};

export type NwcInput = {
  mode: SeriesMode;
  percent_of_incremental_revenue: number | null;
  values: number[] | null;
};

export type MarginInput = {
  mode: MarginMode;
  fixed_margin: number | null;
  target_margin: number | null;
  values: number[] | null;
};

export type DcfAssumptions = {
  company_name: string;
  model_name: string;
  scenario_name: ScenarioName;
  model_type: ModelType;
  currency_symbol: string;
  current_revenue: number;
  current_ebit_margin: number;
  tax_rate: number;
  forecast_years: number;
  revenue_growth: RevenueGrowthInput;
  margin_assumptions: MarginInput;
  dna_assumptions: RevenueLinkedSeriesInput;
  capex_assumptions: RevenueLinkedSeriesInput;
  nwc_assumptions: NwcInput;
  stock_based_compensation: RevenueLinkedSeriesInput;
  net_borrowing: number[] | null;
  net_operating_losses: number;
  discount_rate: number;
  mid_year_discounting: boolean;
  terminal_value_method: TerminalValueMethod;
  terminal_growth_rate: number | null;
  terminal_ebitda_multiple: number | null;
  cash: number;
  debt: number;
  preferred_equity: number;
  minority_interest: number;
  diluted_shares_outstanding: number;
  current_market_price_per_share: number | null;
  margin_of_safety: number;
};

export type ForecastRow = {
  year: number;
  revenue: number;
  growth_rate: number;
  ebit_margin: number;
  ebit: number;
  cash_taxes: number;
  nopat: number;
  depreciation_and_amortization: number;
  stock_based_compensation: number;
  capex: number;
  change_in_nwc: number;
  net_borrowing: number;
  fcff: number;
  fcfe: number;
  discount_factor: number;
  pv_fcff: number;
  pv_fcfe: number;
  remaining_nol: number;
};

export type BridgeItem = {
  label: string;
  value: number;
};

export type TransparencyDetails = {
  formulas: string[];
  terminal_value_formula: string;
  discount_factors: number[];
  enterprise_to_equity_bridge: BridgeItem[];
  notes: string[];
};

export type DcfCalculationResponse = {
  company_name: string;
  model_name: string;
  scenario_name: ScenarioName;
  model_type: ModelType;
  enterprise_value: number;
  equity_value: number;
  intrinsic_value_per_share: number;
  current_price_per_share: number | null;
  upside_downside_pct: number | null;
  buy_under_price: number;
  present_value_of_forecast_cash_flows: number;
  present_value_of_terminal_value: number;
  terminal_value: number;
  terminal_value_contribution_pct: number;
  terminal_ebitda: number;
  terminal_cash_flow: number;
  forecast_rows: ForecastRow[];
  transparency: TransparencyDetails;
};

export type SensitivityAxisConfig = {
  values?: number[] | null;
  start?: number | null;
  end?: number | null;
  step?: number | null;
  count?: number;
};

export type SensitivityRequest = {
  assumptions: DcfAssumptions;
  matrix_type: SensitivityMatrixType;
  wacc_axis?: SensitivityAxisConfig;
  terminal_growth_axis?: SensitivityAxisConfig;
  exit_multiple_axis?: SensitivityAxisConfig;
};

export type SensitivityMatrixResponse = {
  matrix_type: SensitivityMatrixType;
  row_values: number[];
  column_values: number[];
  cells: number[][];
  base_row_index: number;
  base_column_index: number;
  currency_symbol: string;
};

export type ScenarioComparisonItem = {
  scenario_name: ScenarioName;
  intrinsic_value_per_share: number;
  enterprise_value: number;
  equity_value: number;
  current_price_per_share: number | null;
  upside_downside_pct: number | null;
};

export type ScenarioCompareResponse = {
  company_name: string;
  model_name: string;
  currency_symbol: string;
  results: ScenarioComparisonItem[];
};

export type ReverseDcfRequest = {
  assumptions: DcfAssumptions;
  solve_for: ReverseSolveMode;
  lower_bound?: number | null;
  upper_bound?: number | null;
  tolerance?: number;
  max_iterations?: number;
};

export type ReverseDcfResponse = {
  solve_for: ReverseSolveMode;
  target_market_price: number;
  implied_value: number;
  justified_price: number;
  iterations: number;
  converged: boolean;
  error: number;
  assumption_label: string;
};

export type TargetReturnRequest = {
  assumptions: DcfAssumptions;
  desired_annualized_return: number;
  holding_period_years?: number | null;
  margin_of_safety?: number;
};

export type TargetReturnResponse = {
  desired_annualized_return: number;
  holding_period_years: number;
  intrinsic_value_per_share: number;
  max_buy_price_today: number;
  buy_under_price_with_margin_of_safety: number;
  implied_annualized_return_at_current_price: number | null;
};

export type SavedModelPayload = {
  name: string;
  description: string | null;
  default_scenario: string;
  scenarios: DcfAssumptions[];
};

export type SavedValuationModel = SavedModelPayload & {
  id: string;
  created_at: string;
  updated_at: string;
};

export type SavedModelSummary = {
  id: string;
  name: string;
  description: string | null;
  default_scenario: string;
  company_name: string;
  scenario_count: number;
  intrinsic_value_per_share: number;
  current_price_per_share: number | null;
  upside_downside_pct: number | null;
  updated_at: string;
};

