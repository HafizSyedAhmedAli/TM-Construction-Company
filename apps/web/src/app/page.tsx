// apps/web/src/app/page.tsx
"use client";

import Image from "next/image";
import { IntakeForm, type IntakeSubmitResult } from "@/components/IntakeForm";
import type { LeadIntakeInput } from "@tmcc/lead-intake";

export default function HomePage() {
  async function handleSubmit(
    data: LeadIntakeInput,
  ): Promise<IntakeSubmitResult> {
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      // Form already validated client-side; a non-OK response here means
      // a server-side issue, not a bad submission — surface no estimate
      // rather than pretending the lead was captured.
      throw new Error("Failed to submit lead");
    }

    const body = await res.json();
    return { estimate: body.estimate };
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-12">
      <Image
        src="/tmcc-logo-full.png"
        alt="TM Construction Company"
        width={520}
        height={119}
        className="h-16 w-auto mb-8"
        priority
      />

      <div className="text-center max-w-lg mb-8">
        <h1 className="text-3xl font-bold text-brand-black mb-2">
          Start Your House Construction Project
        </h1>
        <p className="text-stone-500 text-sm mt-2">
          PEC-registered — Karachi &amp; Nawabshah. Tell us about your project
          and a TM Construction Company representative will contact you shortly.
        </p>
      </div>

      <div className="w-full max-w-md bg-white border-t-4 border-brand border-x border-b border-stone-200 rounded-xl shadow-sm p-8">
        <IntakeForm onSubmit={handleSubmit} />
      </div>

      <p className="text-xs text-stone-400 mt-8 text-center max-w-md">
        Head Office: 404, Oyster Towers, 4th Floor, Clifton Block 2, Karachi ·
        Regional Office: A-7, 1st Floor, Rehman City, Nawabshah
      </p>
    </main>
  );
}
