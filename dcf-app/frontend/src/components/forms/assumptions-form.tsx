import { useEffect } from "react";
import { Controller, useWatch, type UseFormReturn } from "react-hook-form";

import { normalizeSeries } from "../../lib/default-model";
import { cn } from "../../lib/utils";
import type { ModelEditorValues } from "../../features/valuation/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Slider } from "../ui/slider";
import { Switch } from "../ui/switch";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
import { Textarea } from "../ui/textarea";
import { FieldLabel } from "./field-label";
import { YearlySeriesGrid } from "./yearly-series-grid";

type Props = {
  form: UseFormReturn<ModelEditorValues>;
  activeScenarioIndex: number;
  onScenarioChange: (index: number) => void;
};

const selectClassName =
  "flex h-10 w-full rounded-xl border border-input bg-background/90 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

export function AssumptionsForm({ form, activeScenarioIndex, onScenarioChange }: Props) {
  const { register, control, setValue, getValues } = form;
  const scenarios = useWatch({ control, name: "scenarios" }) ?? getValues("scenarios") ?? [];
  const scenario = scenarios[activeScenarioIndex];
  const years = scenario?.forecast_years ?? 5;
  const scenarioPrefix = `scenarios.${activeScenarioIndex}` as const;

  useEffect(() => {
    const currentRevenue = scenario?.current_revenue ?? 0;
    const currentMargin = scenario?.current_ebit_margin ?? 0;
    const sync = (path: string, fallback: number) => {
      const currentValues = getValues(path as never) as number[] | null | undefined;
      const nextValues = normalizeSeries(currentValues, years, fallback);
      if (JSON.stringify(currentValues) !== JSON.stringify(nextValues)) {
        setValue(path as never, nextValues as never, { shouldDirty: true });
      }
    };

    sync(`${scenarioPrefix}.revenue_growth.rates`, scenario?.revenue_growth.constant_rate ?? 0);
    sync(`${scenarioPrefix}.margin_assumptions.values`, scenario?.margin_assumptions.target_margin ?? currentMargin);
    sync(`${scenarioPrefix}.dna_assumptions.values`, currentRevenue * (scenario?.dna_assumptions.percent_of_revenue ?? 0));
    sync(`${scenarioPrefix}.capex_assumptions.values`, currentRevenue * (scenario?.capex_assumptions.percent_of_revenue ?? 0));
    sync(`${scenarioPrefix}.nwc_assumptions.values`, 0);
    sync(
      `${scenarioPrefix}.stock_based_compensation.values`,
      currentRevenue * (scenario?.stock_based_compensation.percent_of_revenue ?? 0),
    );
    sync(`${scenarioPrefix}.net_borrowing`, 0);
  }, [
    activeScenarioIndex,
    getValues,
    scenario?.capex_assumptions.percent_of_revenue,
    scenario?.current_ebit_margin,
    scenario?.current_revenue,
    scenario?.dna_assumptions.percent_of_revenue,
    scenario?.margin_assumptions.target_margin,
    scenario?.revenue_growth.constant_rate,
    scenario?.stock_based_compensation.percent_of_revenue,
    scenarioPrefix,
    setValue,
    years,
  ]);

  const numberField = { setValueAs: (value: string) => (value === "" ? 0 : Number(value)) };
  const nullableNumberField = { setValueAs: (value: string) => (value === "" ? null : Number(value)) };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Model Setup</CardTitle>
          <CardDescription>Define the saved model shell and choose which scenario acts as the default case.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <FieldLabel label="Saved model name" tooltip="This is the name shown on the dashboard and saved models page." />
            <Input {...register("name")} />
          </div>
          <div>
            <FieldLabel label="Default scenario" tooltip="This scenario is used for summary cards and saved model previews." />
            <select className={selectClassName} {...register("default_scenario")}>
              {scenarios.map((item) => (
                <option key={item.scenario_name} value={item.scenario_name}>
                  {item.scenario_name}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <FieldLabel label="Description" tooltip="Optional notes for what this valuation is trying to capture." />
            <Textarea {...register("description")} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scenarios</CardTitle>
          <CardDescription>Edit bear, base, and bull assumptions side by side through the same structured model.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={String(activeScenarioIndex)} onValueChange={(value) => onScenarioChange(Number(value))}>
            <TabsList>
              {scenarios.map((item, index) => (
                <TabsTrigger key={item.scenario_name} value={String(index)} className="capitalize">
                  {item.scenario_name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      <SectionCard title="General" description="Core company metadata, valuation mode, and share count.">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <FieldLabel label="Company name" />
            <Input {...register(`${scenarioPrefix}.company_name`)} />
          </div>
          <div>
            <FieldLabel label="Scenario model name" tooltip="Useful when saving variations under one model wrapper." />
            <Input {...register(`${scenarioPrefix}.model_name`)} />
          </div>
          <div>
            <FieldLabel label="Model type" tooltip="FCFF values the firm first. FCFE values equity cash flows directly." />
            <select className={selectClassName} {...register(`${scenarioPrefix}.model_type`)}>
              <option value="fcff">FCFF</option>
              <option value="fcfe">FCFE</option>
            </select>
          </div>
          <div>
            <FieldLabel label="Currency symbol" />
            <Input {...register(`${scenarioPrefix}.currency_symbol`)} />
          </div>
          <div>
            <FieldLabel label="Forecast years" />
            <Input type="number" step="1" {...register(`${scenarioPrefix}.forecast_years`, numberField)} />
          </div>
          <div>
            <FieldLabel label="Diluted shares outstanding" />
            <Input type="number" step="0.01" {...register(`${scenarioPrefix}.diluted_shares_outstanding`, numberField)} />
          </div>
          <div>
            <FieldLabel label="Current market price / share" />
            <Input type="number" step="0.01" {...register(`${scenarioPrefix}.current_market_price_per_share`, nullableNumberField)} />
          </div>
          <div>
            <FieldLabel label="Current revenue" />
            <Input type="number" step="0.01" {...register(`${scenarioPrefix}.current_revenue`, numberField)} />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Revenue Assumptions" description="Choose a single revenue growth rate or enter a year-by-year path.">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <FieldLabel label="Current EBIT margin" />
            <Input type="number" step="0.001" {...register(`${scenarioPrefix}.current_ebit_margin`, numberField)} />
          </div>
          <div>
            <FieldLabel label="Revenue growth mode" />
            <select className={selectClassName} {...register(`${scenarioPrefix}.revenue_growth.mode`)}>
              <option value="constant">Constant</option>
              <option value="explicit">Explicit yearly rates</option>
            </select>
          </div>
          {scenario?.revenue_growth.mode === "constant" ? (
            <div className="md:col-span-2">
              <FieldLabel label="Constant annual growth rate" />
              <Input type="number" step="0.001" {...register(`${scenarioPrefix}.revenue_growth.constant_rate`, nullableNumberField)} />
            </div>
          ) : (
            <div className="md:col-span-2">
              <FieldLabel label="Explicit yearly revenue growth rates" />
              <YearlySeriesGrid years={years} namePrefix={`${scenarioPrefix}.revenue_growth.rates`} register={register} nullable />
            </div>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Margin Assumptions" description="Keep margins fixed, interpolate to a target, or type them explicitly.">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <FieldLabel label="Margin mode" />
            <select className={selectClassName} {...register(`${scenarioPrefix}.margin_assumptions.mode`)}>
              <option value="fixed">Fixed</option>
              <option value="interpolate">Interpolate to target</option>
              <option value="explicit">Explicit yearly margins</option>
            </select>
          </div>
          {scenario?.margin_assumptions.mode === "fixed" ? (
            <div>
              <FieldLabel label="Fixed EBIT margin" />
              <Input type="number" step="0.001" {...register(`${scenarioPrefix}.margin_assumptions.fixed_margin`, nullableNumberField)} />
            </div>
          ) : null}
          {scenario?.margin_assumptions.mode === "interpolate" ? (
            <div>
              <FieldLabel label="Target EBIT margin" />
              <Input type="number" step="0.001" {...register(`${scenarioPrefix}.margin_assumptions.target_margin`, nullableNumberField)} />
            </div>
          ) : null}
          {scenario?.margin_assumptions.mode === "explicit" ? (
            <div className="md:col-span-2">
              <FieldLabel label="Explicit yearly EBIT margins" />
              <YearlySeriesGrid years={years} namePrefix={`${scenarioPrefix}.margin_assumptions.values`} register={register} nullable />
            </div>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard title="Reinvestment Assumptions" description="Control D&A, capex, working capital, SBC, and net borrowing transparently.">
        <SeriesSection
          title="D&A"
          mode={scenario?.dna_assumptions.mode}
          modeName={`${scenarioPrefix}.dna_assumptions.mode`}
          percentName={`${scenarioPrefix}.dna_assumptions.percent_of_revenue`}
          valuesName={`${scenarioPrefix}.dna_assumptions.values`}
          register={register}
          years={years}
          numberField={nullableNumberField}
        />
        <SeriesSection
          title="Capex"
          mode={scenario?.capex_assumptions.mode}
          modeName={`${scenarioPrefix}.capex_assumptions.mode`}
          percentName={`${scenarioPrefix}.capex_assumptions.percent_of_revenue`}
          valuesName={`${scenarioPrefix}.capex_assumptions.values`}
          register={register}
          years={years}
          numberField={nullableNumberField}
        />
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <FieldLabel label="Change in NWC mode" tooltip="Percent mode uses working capital as a percent of incremental revenue." />
            <select className={selectClassName} {...register(`${scenarioPrefix}.nwc_assumptions.mode`)}>
              <option value="percent">% of incremental revenue</option>
              <option value="explicit">Explicit yearly values</option>
            </select>
          </div>
          {scenario?.nwc_assumptions.mode === "percent" ? (
            <div>
              <FieldLabel label="Change in NWC % of incremental revenue" />
              <Input type="number" step="0.001" {...register(`${scenarioPrefix}.nwc_assumptions.percent_of_incremental_revenue`, nullableNumberField)} />
            </div>
          ) : (
            <div className="md:col-span-2">
              <FieldLabel label="Explicit yearly change in NWC" tooltip="Negative values represent a release of working capital." />
              <YearlySeriesGrid years={years} namePrefix={`${scenarioPrefix}.nwc_assumptions.values`} register={register} nullable />
            </div>
          )}
          <div>
            <FieldLabel label="SBC mode" />
            <select className={selectClassName} {...register(`${scenarioPrefix}.stock_based_compensation.mode`)}>
              <option value="percent">% of revenue</option>
              <option value="explicit">Explicit yearly values</option>
            </select>
          </div>
          {scenario?.stock_based_compensation.mode === "percent" ? (
            <div>
              <FieldLabel label="SBC % of revenue" />
              <Input type="number" step="0.001" {...register(`${scenarioPrefix}.stock_based_compensation.percent_of_revenue`, nullableNumberField)} />
            </div>
          ) : (
            <div className="md:col-span-2">
              <FieldLabel label="Explicit yearly SBC" />
              <YearlySeriesGrid years={years} namePrefix={`${scenarioPrefix}.stock_based_compensation.values`} register={register} nullable />
            </div>
          )}
          <div className="md:col-span-2">
            <FieldLabel label="Explicit yearly net borrowing" tooltip="Used by FCFE to capture debt issuance or repayment." />
            <YearlySeriesGrid years={years} namePrefix={`${scenarioPrefix}.net_borrowing`} register={register} nullable />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Discount Rate & Terminal Value" description="Choose WACC, mid-year convention, and terminal value method.">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <FieldLabel label="Tax rate" />
            <Input type="number" step="0.001" {...register(`${scenarioPrefix}.tax_rate`, numberField)} />
          </div>
          <div>
            <FieldLabel label="Discount rate / WACC" />
            <Input type="number" step="0.001" {...register(`${scenarioPrefix}.discount_rate`, numberField)} />
          </div>
          <div>
            <FieldLabel label="Terminal value method" />
            <select className={selectClassName} {...register(`${scenarioPrefix}.terminal_value_method`)}>
              <option value="gordon_growth">Gordon Growth</option>
              <option value="exit_multiple">Exit EBITDA Multiple</option>
            </select>
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-border/70 px-4 py-3">
            <div>
              <p className="text-sm font-medium">Mid-year discounting</p>
              <p className="text-xs text-muted-foreground">Discount each cash flow at year - 0.5 instead of year-end.</p>
            </div>
            <Controller
              control={control}
              name={`${scenarioPrefix}.mid_year_discounting`}
              render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
            />
          </div>
          {scenario?.terminal_value_method === "gordon_growth" ? (
            <div className="md:col-span-2">
              <FieldLabel label="Terminal growth rate" />
              <Input type="number" step="0.001" {...register(`${scenarioPrefix}.terminal_growth_rate`, nullableNumberField)} />
            </div>
          ) : (
            <div className="md:col-span-2">
              <FieldLabel label="Terminal EBITDA multiple" />
              <Input type="number" step="0.1" {...register(`${scenarioPrefix}.terminal_ebitda_multiple`, nullableNumberField)} />
            </div>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Capital Structure" description="Bridge enterprise value to equity value and incorporate carryforwards.">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <FieldLabel label="Cash" />
            <Input type="number" step="0.01" {...register(`${scenarioPrefix}.cash`, numberField)} />
          </div>
          <div>
            <FieldLabel label="Debt" />
            <Input type="number" step="0.01" {...register(`${scenarioPrefix}.debt`, numberField)} />
          </div>
          <div>
            <FieldLabel label="Preferred equity" />
            <Input type="number" step="0.01" {...register(`${scenarioPrefix}.preferred_equity`, numberField)} />
          </div>
          <div>
            <FieldLabel label="Minority interest" />
            <Input type="number" step="0.01" {...register(`${scenarioPrefix}.minority_interest`, numberField)} />
          </div>
          <div className="md:col-span-2">
            <FieldLabel label="Net operating losses" tooltip="Starting NOL balance used to shield future EBIT from cash taxes." />
            <Input type="number" step="0.01" {...register(`${scenarioPrefix}.net_operating_losses`, numberField)} />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Margin of Safety" description="Set the buy-under discount shown in the output summary.">
        <Controller
          control={control}
          name={`${scenarioPrefix}.margin_of_safety`}
          render={({ field }) => (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Margin of safety</span>
                <span className="rounded-full bg-secondary px-3 py-1 font-semibold">{Math.round(field.value * 100)}%</span>
              </div>
              <Slider
                value={[field.value]}
                onValueChange={(values) => field.onChange(values[0])}
                min={0}
                max={0.5}
                step={0.01}
              />
              <p className="text-sm text-muted-foreground">
                Buy-under price will be shown at a {Math.round(field.value * 100)}% discount to intrinsic value.
              </p>
            </div>
          )}
        />
      </SectionCard>
    </div>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function SeriesSection({
  title,
  mode,
  modeName,
  percentName,
  valuesName,
  register,
  years,
  numberField,
}: {
  title: string;
  mode: string | undefined;
  modeName: string;
  percentName: string;
  valuesName: string;
  register: UseFormReturn<ModelEditorValues>["register"];
  years: number;
  numberField: { setValueAs: (value: string) => number | null };
}) {
  return (
    <div className={cn("mt-5 grid gap-4 md:grid-cols-2", title === "D&A" && "mt-0")}>
      <div>
        <FieldLabel label={`${title} mode`} />
        <select className={selectClassName} {...register(modeName as never)}>
          <option value="percent">% of revenue</option>
          <option value="explicit">Explicit yearly values</option>
        </select>
      </div>
      {mode === "percent" ? (
        <div>
          <FieldLabel label={`${title} % of revenue`} />
          <Input type="number" step="0.001" {...register(percentName as never, numberField)} />
        </div>
      ) : (
        <div className="md:col-span-2">
          <FieldLabel label={`Explicit yearly ${title}`} />
          <YearlySeriesGrid years={years} namePrefix={valuesName} register={register} nullable />
        </div>
      )}
    </div>
  );
}
