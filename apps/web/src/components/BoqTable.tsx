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
            <th className="text-right px-3 py-2">Rate (Rs)</th>
            <th className="text-right px-3 py-2">Amount (Rs)</th>
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
        <tfoot className="border-t-2 border-stone-300">
          <tr>
            <td colSpan={3} className="px-3 py-1.5 text-right text-stone-600">
              Subtotal
            </td>
            <td className="px-3 py-1.5 text-right">
              {formatPkr(boq.subtotal)}
            </td>
          </tr>
          <tr>
            <td colSpan={3} className="px-3 py-1.5 text-right text-stone-600">
              Sales tax ({taxPercent(boq)}%)
            </td>
            <td className="px-3 py-1.5 text-right">{formatPkr(boq.tax)}</td>
          </tr>
          <tr className="bg-brand-black text-white">
            <td colSpan={3} className="px-3 py-2 text-right font-semibold">
              Total estimated cost
            </td>
            <td className="px-3 py-2 text-right font-bold">
              {formatPkr(boq.total)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
