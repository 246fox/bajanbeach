import React from "react";

type IconProps = { className?: string };
const S = (p: IconProps & { children: React.ReactNode }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}
       strokeLinecap="round" strokeLinejoin="round" className={p.className} aria-hidden="true">
    {p.children}
  </svg>
);
const IconTarget = (p: IconProps) => (<S {...p}>
  <circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" />
  <circle cx="12" cy="12" r="0.9" fill="currentColor" stroke="none" />
</S>);
const IconMapPin = (p: IconProps) => (<S {...p}>
  <path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z" /><circle cx="12" cy="10" r="2.4" />
</S>);
const IconBuilding = (p: IconProps) => (<S {...p}>
  <path d="M4 21V6a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v15" /><path d="M14 9h5a1 1 0 0 1 1 1v11" />
  <path d="M3 21h18" /><path d="M7.5 8.5h3M7.5 12h3M7.5 15.5h3M17 12.5h0M17 16h0" />
</S>);

const row = "flex items-start gap-3";
const tile = "flex h-9 w-9 flex-none items-center justify-center rounded-[10px] border border-ocean-100 bg-ocean-50 mt-px";

export function UsefulToHear() {
  return (
    <div className="flex flex-col gap-4">
      <div className={row}>
        <span className={tile}><IconTarget className="h-5 w-5 text-[#185FA5]" /></span>
        <p className="m-0 text-[15px] leading-relaxed text-slate-700">
          <b className="font-semibold text-slate-800">A score that looks plainly wrong.</b> The scoring is still being calibrated, and ground-truth from people who know a beach well beats anything an algorithm can guess. If a Swim or Scenic score doesn&apos;t match what&apos;s actually happening on the sand, that&apos;s exactly the kind of feedback we need.
        </p>
      </div>
      <div className={row}>
        <span className={tile}><IconMapPin className="h-5 w-5 text-[#0F6E56]" /></span>
        <p className="m-0 text-[15px] leading-relaxed text-slate-700">
          <b className="font-semibold text-slate-800">Beaches we&apos;ve missed, or details that are wrong.</b> A cove that isn&apos;t on the site, an outdated description, a coast tag that doesn&apos;t match how locals actually classify it, sargassum levels that have changed since the last weekly update.
        </p>
      </div>
      <div className={row}>
        <span className={tile}><IconBuilding className="h-5 w-5 text-[#BA7517]" /></span>
        <p className="m-0 text-[15px] leading-relaxed text-slate-700">
          <b className="font-semibold text-slate-800">Hotels, villas, and operators.</b> If you run a property and want to talk about featuring local conditions on your own site or app, get in touch — early conversations welcome.
        </p>
      </div>
    </div>
  );
}

export function MailIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}
         strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3.5 6.5 8.5 6 8.5-6" />
    </svg>
  );
}
