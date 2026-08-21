"use client";

import type { GradeLevel } from "@/lib/types";

export default function NiveauSelect({
  form,
  name,
  defaultValue,
  levels,
}: {
  form: string;
  name: string;
  defaultValue: number | null;
  levels: GradeLevel[];
}) {
  return (
    <select
      form={form}
      name={name}
      defaultValue={defaultValue ?? ""}
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
      title="Cliquer pour changer le niveau"
      className="print:hidden rounded-lg border border-ardoise/30 bg-blanc px-2 py-1 text-lg font-semibold text-encre"
    >
      <option value="">—</option>
      {levels.map((l) => (
        <option key={l.value} value={l.value}>
          {l.symbol} {l.label}
        </option>
      ))}
    </select>
  );
}
