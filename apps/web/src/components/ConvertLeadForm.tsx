"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  citiesByProvince,
  CITY_NAMES,
  type Category,
  type EngagementModel,
} from "@tmcc/shared-types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOptGroup,
  NativeSelectOption,
} from "@/components/ui/native-select";

interface ConvertLeadFormProps {
  leadId: string;
  defaultCity: string;
  defaultModel: number;
  defaultCategory: string;
}

const CITY_GROUPS = citiesByProvince();

// SRS §3 steps 3-5: by the time office is looking at this form, they've
// already met the client and finalized the design brief — city/model/
// category default to whatever the client picked on intake (FR-3), but
// office can adjust them here if the meeting changed anything, and can
// record meeting notes (FR-6) before creating the Project (FR-5).
export function ConvertLeadForm({
  leadId,
  defaultCity,
  defaultModel,
  defaultCategory,
}: ConvertLeadFormProps) {
  const router = useRouter();
  const [city, setCity] = useState(defaultCity);
  const [model, setModel] = useState(defaultModel);
  const [category, setCategory] = useState(defaultCategory);
  const [meetingNotes, setMeetingNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          city,
          model,
          category,
          meetingNotes: meetingNotes.trim() || undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok)
        throw new Error(body.error ?? "Could not create the project.");
      router.push(`/office/${body.id}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not create the project.",
      );
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div>
          <Label htmlFor={`city-${leadId}`} className="text-xs">
            City
          </Label>
          <NativeSelect
            id={`city-${leadId}`}
            size="sm"
            className="mt-1 w-full cursor-pointer"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          >
            {CITY_NAMES.map((c) => (
              <NativeSelectOption key={c} value={c}>
                {c}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <div>
          <Label htmlFor={`model-${leadId}`} className="text-xs">
            Model
          </Label>
          <NativeSelect
            id={`model-${leadId}`}
            size="sm"
            className="mt-1 w-full cursor-pointer"
            value={model}
            onChange={(e) =>
              setModel(Number(e.target.value) as EngagementModel)
            }
          >
            <NativeSelectOption value={1}>1</NativeSelectOption>
            <NativeSelectOption value={2}>2</NativeSelectOption>
            <NativeSelectOption value={3}>3</NativeSelectOption>
          </NativeSelect>
        </div>
        <div>
          <Label htmlFor={`category-${leadId}`} className="text-xs">
            Category
          </Label>
          <NativeSelect
            id={`category-${leadId}`}
            size="sm"
            className="mt-1 w-full cursor-pointer"
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
          >
            <NativeSelectOption value="A">A</NativeSelectOption>
            <NativeSelectOption value="B">B</NativeSelectOption>
            <NativeSelectOption value="C">C</NativeSelectOption>
          </NativeSelect>
        </div>
      </div>

      <div>
        <Label htmlFor={`notes-${leadId}`} className="text-xs">
          Meeting notes (optional)
        </Label>
        <textarea
          id={`notes-${leadId}`}
          rows={2}
          className="mt-1 w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          placeholder="Design brief, plot details, anything from the meeting worth keeping on the project…"
          value={meetingNotes}
          onChange={(e) => setMeetingNotes(e.target.value)}
        />
      </div>

      {error && (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}

      <Button
        type="submit"
        disabled={isSubmitting}
        size="sm"
        className="bg-brand hover:bg-brand-dark text-white cursor-pointer disabled:cursor-not-allowed"
      >
        {isSubmitting ? "Creating…" : "Create project"}
      </Button>
    </form>
  );
}
