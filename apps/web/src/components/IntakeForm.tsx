"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import {
  Building2,
  FileText,
  Headset,
  Home,
  MapPin,
  Phone,
  Send,
  User,
  Users,
} from "lucide-react";
import {
  CITIES,
  validateLeadIntake,
  type LeadIntakeInput,
} from "@tmcc/lead-intake";
import type { BOQResult } from "@tmcc/shared-types";
import { estimateRange } from "@/lib/boq-format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";

export interface IntakeSubmitResult {
  estimate: BOQResult | null;
}

interface IntakeFormProps {
  onSubmit: (data: LeadIntakeInput) => Promise<IntakeSubmitResult>;
}

const errorClass = "text-xs text-red-600 mt-1";

const MODELS = [
  {
    value: 1,
    short: "Land & Build, Then Sell",
    title: "Land & Build, Then Sell",
    text: "TM CC purchases the plot, designs and constructs the house, and offers the finished home for sale.",
    Icon: Home,
  },
  {
    value: 2,
    short: "Construction on Client's Plot",
    title: "Construction on Client's Plot",
    text: "The client provides the plot, and TM CC handles the full design and construction of the house.",
    Icon: FileText,
  },
  {
    value: 3,
    short: "Client's Plot & Construction Cost",
    title: "Client's Plot & Construction Cost",
    text: "The plot and construction budget are provided by the client; TM CC manages the design and execution.",
    Icon: Users,
  },
] as const;

const CATEGORIES = [
  { value: "A", label: "Category A" },
  { value: "B", label: "Category B" },
  { value: "C", label: "Category C" },
] as const;

const card = "rounded-xl border p-4 text-left transition-colors cursor-pointer";
const cardOn = "border-brand bg-red-50/40 ring-1 ring-brand";
const cardOff = "border-stone-200 bg-white hover:border-stone-300";

function Radio({ on }: { on: boolean }) {
  return (
    <span
      className={`size-4 rounded-full border-2 grid place-items-center ${
        on ? "border-brand" : "border-stone-300"
      }`}
    >
      {on && <span className="size-2 rounded-full bg-brand" />}
    </span>
  );
}

function IconInput({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="relative mt-1.5">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 z-10">
        {icon}
      </span>
      {children}
    </div>
  );
}

export function IntakeForm({ onSubmit }: IntakeFormProps) {
  const [values, setValues] = useState<Partial<LeadIntakeInput>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<IntakeSubmitResult | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const validation = validateLeadIntake(values);
    setErrors(validation.errors as Record<string, string>);
    if (!validation.valid) return;

    setIsSubmitting(true);
    try {
      const submitResult = await onSubmit(values as LeadIntakeInput);
      setResult(submitResult);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="max-w-xl mx-auto bg-white border border-stone-200 rounded-2xl shadow-sm p-8">
        <p className="text-stone-700">
          Thanks — we&apos;ve received your details and will be in touch
          shortly.
        </p>

        {result.estimate ? (
          <div className="mt-5 border-t border-stone-200 pt-5">
            <p className="text-sm text-stone-500 mb-1">
              Rough starting range for your area and category
            </p>
            <p className="text-2xl font-bold text-brand-black">
              {estimateRange(result.estimate.total)}
            </p>
            <p className="text-xs text-stone-400 mt-2">
              A ballpark for a typical house of this size — not a quote. Your
              exact BOQ will follow once we have reviewed your plot and
              drawings.
            </p>
          </div>
        ) : (
          <p className="text-xs text-stone-400 mt-4">
            We don&apos;t have pricing set up for your area yet — a
            representative will follow up with a custom quote.
          </p>
        )}
      </div>
    );
  }

  const selectedModel = MODELS.find((m) => m.value === values.model);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_290px] items-start">
      <form
        onSubmit={handleSubmit}
        noValidate
        className="bg-white border border-stone-200 rounded-2xl shadow-sm p-6 sm:p-8 space-y-8"
      >
        {/* Stepper (visual) */}
        <ol className="flex items-center gap-3 text-sm">
          {["Project Details", "Requirements", "Contact"].map((s, i) => (
            <li
              key={s}
              className="flex items-center gap-3 flex-1 last:flex-none"
            >
              <span
                className={`size-8 shrink-0 rounded-full grid place-items-center text-white text-sm font-semibold ${
                  i === 0 ? "bg-brand" : "bg-stone-400"
                }`}
              >
                {i + 1}
              </span>
              <span
                className={`hidden sm:inline whitespace-nowrap font-medium ${
                  i === 0 ? "text-brand" : "text-stone-500"
                }`}
              >
                {s}
              </span>
              {i < 2 && <span className="h-px flex-1 bg-stone-200" />}
            </li>
          ))}
        </ol>

        <hr className="border-stone-100" />

        <section className="space-y-5">
          <h2 className="text-lg font-bold text-brand-black">
            1. Tell us about your project
          </h2>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="name">
                Full Name <span className="text-brand">*</span>
              </Label>
              <IconInput icon={<User className="size-4" />}>
                <Input
                  id="name"
                  className="pl-9 h-10"
                  placeholder="Enter your full name"
                  value={values.name ?? ""}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, name: e.target.value }))
                  }
                />
              </IconInput>
              {errors.name && (
                <p className={errorClass} role="alert">
                  {errors.name}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="contact">
                Contact <span className="text-brand">*</span>
              </Label>
              <IconInput icon={<Phone className="size-4" />}>
                <Input
                  id="contact"
                  className="pl-9 h-10"
                  placeholder="03XX-XXXXXXX (Phone / WhatsApp)"
                  value={values.contact ?? ""}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, contact: e.target.value }))
                  }
                />
              </IconInput>
              {errors.contact && (
                <p className={errorClass} role="alert">
                  {errors.contact}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="city">
                City <span className="text-brand">*</span>
              </Label>
              <IconInput icon={<MapPin className="size-4" />}>
                <NativeSelect
                  id="city"
                  className="w-full cursor-pointer [&_select]:h-10 [&_select]:pl-9"
                  value={values.city ?? ""}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, city: e.target.value }))
                  }
                >
                  <NativeSelectOption value="">
                    Select a city
                  </NativeSelectOption>
                  {CITIES.map((c) => (
                    <NativeSelectOption key={c} value={c}>
                      {c}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </IconInput>
              {errors.city && (
                <p className={errorClass} role="alert">
                  {errors.city}
                </p>
              )}
            </div>
          </div>

          {/* Engagement model: cards drive a hidden native select
              (kept for accessibility/tests). */}
          <div>
            <p className="text-sm font-medium">
              Engagement Model <span className="text-brand">*</span>
            </p>
            <Label htmlFor="model" className="sr-only">
              Engagement Model
            </Label>
            <NativeSelect
              id="model"
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              value={values.model ?? ""}
              onChange={(e) =>
                setValues((v) => ({
                  ...v,
                  model: Number(e.target.value) as 1 | 2 | 3,
                }))
              }
            >
              <NativeSelectOption value="">Select a model</NativeSelectOption>
              {MODELS.map((m) => (
                <NativeSelectOption key={m.value} value={m.value}>
                  Model {m.value} — {m.short}
                </NativeSelectOption>
              ))}
            </NativeSelect>

            <div
              role="radiogroup"
              aria-label="Choose how we work together"
              className="mt-2 grid gap-3 sm:grid-cols-3"
            >
              {MODELS.map(({ value, title, text, Icon }) => {
                const on = values.model === value;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() =>
                      setValues((v) => ({ ...v, model: value as 1 | 2 | 3 }))
                    }
                    className={`${card} ${on ? cardOn : cardOff}`}
                  >
                    <div className="flex items-start justify-between">
                      <Icon className="size-6 text-brand-black" />
                      <Radio on={on} />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-brand-black">
                      {title}
                    </p>
                    <p className="mt-1 text-xs text-stone-500 leading-relaxed">
                      {text}
                    </p>
                  </button>
                );
              })}
            </div>
            {errors.model && (
              <p className={errorClass} role="alert">
                {errors.model}
              </p>
            )}
          </div>
        </section>

        <hr className="border-stone-100" />

        <section className="space-y-4">
          <h2 className="text-lg font-bold text-brand-black">
            2. House Requirements
          </h2>
          <div>
            <p className="text-sm font-medium">
              Material Category <span className="text-brand">*</span>
            </p>
            <Label htmlFor="category" className="sr-only">
              Material Category
            </Label>
            <NativeSelect
              id="category"
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              value={values.category ?? ""}
              onChange={(e) =>
                setValues((v) => ({
                  ...v,
                  category: e.target.value as "A" | "B" | "C",
                }))
              }
            >
              <NativeSelectOption value="">
                Select a category
              </NativeSelectOption>
              {CATEGORIES.map((c) => (
                <NativeSelectOption key={c.value} value={c.value}>
                  {c.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>

            <div
              role="radiogroup"
              aria-label="Choose a finish tier"
              className="mt-2 grid gap-3 sm:grid-cols-3"
            >
              {CATEGORIES.map((c) => {
                const on = values.category === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() =>
                      setValues((v) => ({ ...v, category: c.value }))
                    }
                    className={`${card} flex items-center justify-between py-3 ${
                      on ? cardOn : cardOff
                    }`}
                  >
                    <span className="text-sm font-medium text-brand-black">
                      {c.label}
                    </span>
                    <Radio on={on} />
                  </button>
                );
              })}
            </div>
            {errors.category && (
              <p className={errorClass} role="alert">
                {errors.category}
              </p>
            )}
          </div>
        </section>

        <hr className="border-stone-100" />

        <section className="space-y-4">
          <h2 className="text-lg font-bold text-brand-black">
            3. Confirm &amp; Send
          </h2>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-11 text-sm font-semibold bg-brand hover:bg-brand-dark text-white cursor-pointer disabled:cursor-not-allowed"
          >
            <Send className="size-4" />
            {isSubmitting ? "Submitting…" : "Submit Project Request →"}
          </Button>
        </section>
      </form>

      {/* Live summary */}
      <aside className="bg-white border border-stone-200 rounded-2xl shadow-sm p-5 space-y-3 lg:sticky lg:top-6">
        <div className="flex items-center gap-3 pb-3 border-b border-stone-100">
          <span className="size-9 rounded-lg bg-stone-100 grid place-items-center">
            <FileText className="size-4 text-brand-black" />
          </span>
          <h3 className="font-semibold text-brand-black">Your Project</h3>
        </div>

        <SummaryRow
          icon={<Building2 className="size-4" />}
          label="Engagement Model"
        >
          {selectedModel?.short ?? "Not selected"}
        </SummaryRow>
        <SummaryRow icon={<MapPin className="size-4" />} label="City">
          {values.city || "Not selected"}
        </SummaryRow>
        <SummaryRow
          icon={<Home className="size-4" />}
          label="Material Category"
        >
          {values.category ? `Category ${values.category}` : "Not selected"}
        </SummaryRow>

        <div className="flex items-center gap-3 rounded-lg bg-red-50 px-3 py-3 text-sm text-brand">
          <Headset className="size-5 shrink-0" />
          Our representative will contact you shortly.
        </div>
      </aside>
    </div>
  );
}

function SummaryRow({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-stone-100 px-3 py-2.5">
      <span className="size-8 rounded-full bg-stone-100 grid place-items-center text-brand-black shrink-0">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[11px] text-stone-500">{label}</p>
        <p className="text-xs font-medium text-brand-black truncate">
          {children}
        </p>
      </div>
    </div>
  );
}
