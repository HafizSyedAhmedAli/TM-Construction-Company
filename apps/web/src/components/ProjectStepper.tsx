import { Check } from "lucide-react";

export function ProjectStepper({
  hasCad,
  hasBoq,
  hasRender,
}: {
  hasCad: boolean;
  hasBoq: boolean;
  hasRender: boolean;
}) {
  const steps = [
    { label: "Project created", done: true },
    { label: "Upload drawing", done: hasCad },
    { label: "Review & price BOQ", done: hasBoq },
    { label: "3D render", done: hasRender },
    { label: "Present to client", done: hasBoq && hasRender },
  ];
  const current = steps.findIndex((s) => !s.done);
  return (
    <ol className="print:hidden flex flex-wrap gap-2">
      {steps.map((s, i) => {
        const state = s.done ? "done" : i === current ? "current" : "todo";
        return (
          <li
            key={s.label}
            className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium ${
              state === "done"
                ? "border-green-200 bg-green-50 text-green-700"
                : state === "current"
                  ? "border-brand bg-brand text-white"
                  : "border-stone-200 bg-white text-stone-400"
            }`}
          >
            {state === "done" ? (
              <Check className="size-3.5" />
            ) : (
              <span>{i + 1}</span>
            )}
            {s.label}
          </li>
        );
      })}
    </ol>
  );
}
