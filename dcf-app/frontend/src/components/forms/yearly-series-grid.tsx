import type { UseFormRegister } from "react-hook-form";

import { Input } from "../ui/input";

type Props = {
  years: number;
  namePrefix: string;
  register: UseFormRegister<any>;
  nullable?: boolean;
  step?: number;
};

export function YearlySeriesGrid({ years, namePrefix, register, nullable = false, step = 0.01 }: Props) {
  const parser = nullable
    ? { setValueAs: (value: string) => (value === "" ? null : Number(value)) }
    : { setValueAs: (value: string) => (value === "" ? 0 : Number(value)) };

  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
      {Array.from({ length: years }).map((_, index) => (
        <div key={`${namePrefix}-${index}`} className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Year {index + 1}</p>
          <Input type="number" step={step} {...register(`${namePrefix}.${index}`, parser)} />
        </div>
      ))}
    </div>
  );
}

