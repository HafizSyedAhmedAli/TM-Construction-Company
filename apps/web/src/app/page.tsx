// apps/web/src/app/page.tsx
"use client";

import Image from "next/image";
import { MapPin, Phone, ShieldCheck, Mail, Globe } from "lucide-react";
import { IntakeForm, type IntakeSubmitResult } from "@/components/IntakeForm";
import type { LeadIntakeInput } from "@tmcc/lead-intake";

const NAV = ["Home", "About", "Our Services", "Gallery", "Contact"];

export default function HomePage() {
  async function handleSubmit(
    data: LeadIntakeInput,
  ): Promise<IntakeSubmitResult> {
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) throw new Error("Failed to submit lead");

    const body = await res.json();
    return { estimate: body.estimate };
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="relative z-10 bg-white/90 backdrop-blur border-b border-stone-100">
        <div className="max-w-6xl mx-auto px-4 h-[72px] flex items-center justify-between">
          <Image
            src="/tmcc-logo-full.png"
            alt="TM Construction Company"
            width={520}
            height={119}
            className="h-11 w-auto"
            priority
          />
          {/* <nav className="hidden md:flex items-center gap-8 text-sm text-stone-700">
            {NAV.map((n) => (
              <a
                key={n}
                href="#"
                className="hover:text-brand transition-colors"
              >
                {n}
              </a>
            ))}
          </nav> */}
          <a
            href="tel:03003212117"
            className="flex items-center gap-2 text-sm font-semibold text-brand-black"
          >
            <Phone className="size-4 text-brand" />
            0300-3212117
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-stone-50 to-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/demo.jpg"
          alt=""
          aria-hidden
          className="hidden lg:block absolute right-0 top-0 h-[420px] w-[45%] object-cover opacity-90 [mask-image:linear-gradient(to_right,transparent,black_45%)]"
        />
        <div className="relative max-w-6xl mx-auto px-4 pt-10 pb-8">
          <div className="flex items-center gap-3 text-xs font-semibold tracking-wide uppercase mb-4">
            <span className="h-0.5 w-8 bg-brand" />
            <span className="text-brand-black">
              House Construction <span className="text-brand">Division</span>
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-brand-black tracking-tight">
            Let&apos;s Build Your <span className="text-brand">Home</span>
          </h1>
          <p className="mt-4 max-w-md text-stone-500">
            Tell us about your project and our team will contact you to discuss
            the next steps.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-stone-600">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="size-4" /> PEC Registered
            </span>
            <span className="h-4 w-px bg-stone-300" />
            <span className="flex items-center gap-1.5">
              <MapPin className="size-4" /> Karachi &amp; Nawabshah
            </span>
          </div>
        </div>
      </section>

      {/* Form + summary */}
      <main className="flex-1 -mt-2 pb-16">
        <div className="max-w-6xl mx-auto px-4">
          <IntakeForm onSubmit={handleSubmit} />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#1c1a19] text-stone-300">
        <div className="max-w-6xl mx-auto px-4 py-10 grid gap-8 md:grid-cols-[1.2fr_1.4fr_1.4fr_1fr_1fr_1.2fr] text-xs">
          <div className="bg-white rounded-md p-2 w-fit h-fit">
            <Image
              src="/tmcc-logo-full.png"
              alt="TM Construction Company"
              width={520}
              height={119}
              className="h-9 w-auto"
            />
          </div>
          <FooterItem icon={<MapPin className="size-4" />} title="Head Office">
            404, Oyster Towers, 4th Floor, Clifton Block 2, Karachi
          </FooterItem>
          <FooterItem
            icon={<MapPin className="size-4" />}
            title="Regional Office"
          >
            A-7, 1st Floor, Rehman City, Nawabshah
          </FooterItem>
          <FooterItem icon={<Phone className="size-4" />} title="Mobile">
            0300-3212117
          </FooterItem>
          <FooterItem icon={<Mail className="size-4" />} title="Email">
            tmcc@gmail.com
          </FooterItem>
          <FooterItem icon={<Globe className="size-4" />} title="Website">
            tmconstruction.com.pk
          </FooterItem>
        </div>
        <div className="border-t border-white/10">
          <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between text-[11px] text-stone-400">
            <span>
              TM Construction Company —{" "}
              <span className="text-white">House Construction Division</span>
            </span>
            <span className="text-white">We Serve Your Interests</span>
          </div>
        </div>
        <div className="h-1 flex">
          <span className="w-24 bg-brand" />
          <span className="w-24 bg-brand-gold" />
        </div>
      </footer>
    </div>
  );
}

function FooterItem({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <span className="text-white mt-0.5">{icon}</span>
      <div>
        <p className="font-semibold text-white mb-1">{title}</p>
        <p className="text-stone-400 leading-relaxed">{children}</p>
      </div>
    </div>
  );
}
