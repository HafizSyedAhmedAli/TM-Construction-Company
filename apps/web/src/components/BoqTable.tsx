import type { BOQResult } from "@tmcc/shared-types";
import {
  BOQ_META,
  formatPkr,
  formatQty,
  groupBoq,
  taxPercent,
  unitLabel,
} from "@/lib/boq-format";

const num = new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 });

// Presentational only (no hooks) so it works in server and client components.
export function BoqTable({ boq }: { boq: BOQResult }) {
  const groups = groupBoq(boq);
  return (
    <div className="overflow-x-auto border border-stone-200 rounded-lg bg-white">
      <table className="w-full text-sm">
        <thead className="bg-stone-50 text-stone-500 text-xs uppercase">
          <tr>
            <th className="text-left px-3 py-2">Item</th>
            <th className="text-right px-3 py-2">Quantity</th>
            <th className="min-w-[8.5rem] text-right px-3 py-2">Rate (Rs)</th>
            <th className="min-w-[8.5rem] text-right px-3 py-2">Amount (Rs)</th>
          </tr>
        </thead>
        {groups.map((g) => (
          <tbody key={g.group} className="break-inside-avoid">
            <tr className="bg-stone-100">
              <td
                colSpan={4}
                className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-stone-600"
              >
                {g.group}
              </td>
            </tr>
            {g.items.map((item) => (
              <tr key={item.itemType} className="border-t border-stone-100">
                <td className="px-3 py-1.5">
                  {BOQ_META[item.itemType]?.label ?? item.itemType}
                </td>
                <td className="px-3 py-1.5 text-right whitespace-nowrap">
                  {formatQty(item)}{" "}
                  <span className="text-stone-400">{unitLabel(item.unit)}</span>
                </td>
                <td className="px-3 py-1.5 text-right">
                  {num.format(item.unitRate)}
                </td>
                <td className="px-3 py-1.5 text-right">
                  {num.format(item.subtotal)}
                </td>
              </tr>
            ))}
            <tr className="border-t border-stone-200">
              <td
                colSpan={3}
                className="px-3 py-1.5 text-right text-xs text-stone-500"
              >
                {g.group} subtotal
              </td>
              <td className="px-3 py-1.5 text-right font-medium">
                {num.format(g.subtotal)}
              </td>
            </tr>
          </tbody>
        ))}
        <tfoot className="bg-brand-black text-white [print-color-adjust:exact] [-webkit-print-color-adjust:exact]">
          <tr>
            <td
              colSpan={3}
              className="px-3 pt-3 pb-1 text-right text-sm text-white/80"
            >
              Subtotal
            </td>
            <td className="whitespace-nowrap px-3 pt-3 pb-1 text-right text-sm tabular-nums text-white">
              {formatPkr(boq.subtotal)}
            </td>
          </tr>
          <tr>
            <td
              colSpan={3}
              className="px-3 py-1 text-right text-sm text-white/80"
            >
              Sales tax ({taxPercent(boq)}%)
            </td>
            <td className="whitespace-nowrap px-3 py-1 text-right text-sm tabular-nums text-white">
              {formatPkr(boq.tax)}
            </td>
          </tr>
          <tr className="border-t border-white/15">
            <td
              colSpan={3}
              className="px-3 py-3 text-right text-sm font-semibold text-white"
            >
              Total estimated cost
            </td>
            <td className="whitespace-nowrap px-3 py-3 text-right text-base font-bold tabular-nums text-white">
              {formatPkr(boq.total)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
