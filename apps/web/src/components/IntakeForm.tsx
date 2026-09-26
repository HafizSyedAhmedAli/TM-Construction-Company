"use client";

import { useState, type FormEvent } from "react";
import { CITIES, validateLeadIntake, type LeadIntakeInput } from "@tmcc/lead-intake";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

interface IntakeFormProps {
  onSubmit: (data: LeadIntakeInput) => void | Promise<void>;
}

const errorClass = "text-xs text-red-600 mt-1";

export function IntakeForm({ onSubmit }: IntakeFormProps) {
  const [values, setValues] = useState<Partial<LeadIntakeInput>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const result = validateLeadIntake(values);
    setErrors(result.errors as Record<string, string>);
    if (!result.valid) return;

    setIsSubmitting(true);
    try {
      await onSubmit(values as LeadIntakeInput);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" className="mt-1.5" value={values.name ?? ""} onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))} />
        {errors.name && <p className={errorClass} role="alert">{errors.name}</p>}
      </div>

      <div>
        <Label htmlFor="contact">Contact</Label>
        <Input id="contact" className="mt-1.5" value={values.contact ?? ""} onChange={(e) => setValues((v) => ({ ...v, contact: e.target.value }))} />
        {errors.contact && <p className={errorClass} role="alert">{errors.contact}</p>}
      </div>

      <div>
        <Label htmlFor="city">City</Label>
        <NativeSelect id="city" className="mt-1.5 w-full cursor-pointer" value={values.city ?? ""} onChange={(e) => setValues((v) => ({ ...v, city: e.target.value }))}>
          <NativeSelectOption value="">Select a city</NativeSelectOption>
          {CITIES.map((c) => <NativeSelectOption key={c} value={c}>{c}</NativeSelectOption>)}
        </NativeSelect>
        {errors.city && <p className={errorClass} role="alert">{errors.city}</p>}
      </div>

      <div>
        <Label htmlFor="model">Engagement Model</Label>
        <NativeSelect
          id="model"
          className="mt-1.5 w-full cursor-pointer"
          value={values.model ?? ""}
          onChange={(e) => setValues((v) => ({ ...v, model: Number(e.target.value) as 1 | 2 | 3 }))}
        >
          <NativeSelectOption value="">Select a model</NativeSelectOption>
          <NativeSelectOption value={1}>Model 1 — Land &amp; Build, Then Sell</NativeSelectOption>
          <NativeSelectOption value={2}>Model 2 — Construction on Client&apos;s Plot</NativeSelectOption>
          <NativeSelectOption value={3}>Model 3 — Client&apos;s Plot &amp; Client&apos;s Construction Cost</NativeSelectOption>
        </NativeSelect>
        {values.model === 1 && <p className="text-xs text-muted-foreground mt-1.5">TM CC purchases the plot, builds, and offers the finished home for sale.</p>}
        {values.model === 2 && <p className="text-xs text-muted-foreground mt-1.5">You provide the plot — TM CC handles full design and construction on it.</p>}
        {values.model === 3 && <p className="text-xs text-muted-foreground mt-1.5">You provide the plot and budget — TM CC manages design, planning, and execution.</p>}
        {errors.model && <p className={errorClass} role="alert">{errors.model}</p>}
      </div>

      <div>
        <Label htmlFor="category">Material Category</Label>
        <NativeSelect id="category" className="mt-1.5 w-full cursor-pointer" value={values.category ?? ""} onChange={(e) => setValues((v) => ({ ...v, category: e.target.value as "A" | "B" | "C" }))}>
          <NativeSelectOption value="">Select a category</NativeSelectOption>
          <NativeSelectOption value="A">Category A</NativeSelectOption>
          <NativeSelectOption value="B">Category B</NativeSelectOption>
          <NativeSelectOption value="C">Category C</NativeSelectOption>
        </NativeSelect>
        {errors.category && <p className={errorClass} role="alert">{errors.category}</p>}
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-brand hover:bg-brand-dark text-white cursor-pointer disabled:cursor-not-allowed"
      >
        {isSubmitting ? "Submitting…" : "Submit"}
      </Button>
    </form>
  );
}