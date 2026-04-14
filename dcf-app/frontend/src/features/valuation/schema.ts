import { z } from "zod";

const revenueGrowthSchema = z.object({
  mode: z.enum(["constant", "explicit"]),
  constant_rate: z.number().nullable(),
  rates: z.array(z.number()).nullable(),
});

const marginSchema = z.object({
  mode: z.enum(["fixed", "interpolate", "explicit"]),
  fixed_margin: z.number().nullable(),
  target_margin: z.number().nullable(),
  values: z.array(z.number()).nullable(),
});

const seriesSchema = z.object({
  mode: z.enum(["percent", "explicit"]),
  percent_of_revenue: z.number().nullable(),
  values: z.array(z.number()).nullable(),
});

const nwcSchema = z.object({
  mode: z.enum(["percent", "explicit"]),
  percent_of_incremental_revenue: z.number().nullable(),
  values: z.array(z.number()).nullable(),
});

const scenarioSchema = z.object({
  company_name: z.string().min(1, "Company name is required"),
  model_name: z.string().min(1, "Scenario model name is required"),
  scenario_name: z.enum(["bear", "base", "bull", "custom"]),
  model_type: z.enum(["fcff", "fcfe"]),
  currency_symbol: z.string().min(1).max(4),
  current_revenue: z.number().nonnegative(),
  current_ebit_margin: z.number().min(-1).max(1),
  tax_rate: z.number().min(0).max(1),
  forecast_years: z.number().int().min(3).max(15),
  revenue_growth: revenueGrowthSchema,
  margin_assumptions: marginSchema,
  dna_assumptions: seriesSchema,
  capex_assumptions: seriesSchema,
  nwc_assumptions: nwcSchema,
  stock_based_compensation: seriesSchema,
  net_borrowing: z.array(z.number()).nullable(),
  net_operating_losses: z.number().nonnegative(),
  discount_rate: z.number().min(-0.999).max(0.99),
  mid_year_discounting: z.boolean(),
  terminal_value_method: z.enum(["gordon_growth", "exit_multiple"]),
  terminal_growth_rate: z.number().nullable(),
  terminal_ebitda_multiple: z.number().nullable(),
  cash: z.number().nonnegative(),
  debt: z.number().nonnegative(),
  preferred_equity: z.number().nonnegative(),
  minority_interest: z.number().nonnegative(),
  diluted_shares_outstanding: z.number().positive(),
  current_market_price_per_share: z.number().nullable(),
  margin_of_safety: z.number().min(0).max(0.5),
});

export const modelEditorSchema = z.object({
  name: z.string().min(1, "Model name is required"),
  description: z.string().nullable(),
  default_scenario: z.string().min(1),
  scenarios: z.array(scenarioSchema).min(1),
});

export type ModelEditorValues = z.infer<typeof modelEditorSchema>;

