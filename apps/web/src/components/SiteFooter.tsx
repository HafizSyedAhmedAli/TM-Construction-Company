// apps/web/src/components/SiteFooter.tsx
import Image from "next/image";
import { Globe, Mail, MapPin, Phone } from "lucide-react";

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

// Same footer as the homepage, so office pages feel like one product.
export function SiteFooter() {
  return (
    <footer className="print:hidden bg-[#1c1a19] text-stone-300">
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
  );
}
