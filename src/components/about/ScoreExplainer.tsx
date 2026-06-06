import React from "react";

type IconProps = { className?: string };
const S = (p: IconProps & { children: React.ReactNode }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}
       strokeLinecap="round" strokeLinejoin="round" className={p.className} aria-hidden="true">
    {p.children}
  </svg>
);
const IconWaves = (p: IconProps) => (<S {...p}>
  <path d="M2 7c2 0 2 1.5 4 1.5S8 7 10 7s2 1.5 4 1.5S16 7 18 7s2 1.5 4 1.5" />
  <path d="M2 12c2 0 2 1.5 4 1.5S8 12 10 12s2 1.5 4 1.5 2-1.5 4-1.5 2 1.5 4 1.5" />
  <path d="M2 17c2 0 2 1.5 4 1.5S8 17 10 17s2 1.5 4 1.5 2-1.5 4-1.5 2 1.5 4 1.5" />
</S>);
const IconWind = (p: IconProps) => (<S {...p}>
  <path d="M3 8h9a2.5 2.5 0 1 0-2.5-2.5" /><path d="M3 12h13a2.5 2.5 0 1 1-2.5 2.5" />
  <path d="M3 16h7a2.5 2.5 0 1 1-2.5 2.5" />
</S>);
const IconTide = (p: IconProps) => (<S {...p}>
  <path d="M12 3v12" /><path d="M8 7l4-4 4 4" /><path d="M8 11l4 4 4-4" />
  <path d="M3 20c1.5 0 1.5-1 3-1s1.5 1 3 1 1.5-1 3-1 1.5 1 3 1 1.5-1 3-1" />
</S>);
const IconSargassum = (p: IconProps) => (<S {...p}>
  <path d="M12 21v-9" />
  <path d="M12 13c0-3.2-2.6-5.8-5.8-5.8 0 3.2 2.6 5.8 5.8 5.8Z" />
  <path d="M12 15c0-2.7 2.2-4.9 4.9-4.9 0 2.7-2.2 4.9-4.9 4.9Z" />
</S>);
const IconBeach = (p: IconProps) => (<S {...p}>
  <path d="M12 13v8" /><path d="M5 13a7 7 0 0 1 14 0Z" /><path d="M5 21h14" />
</S>);
const IconSatellite = (p: IconProps) => (<S {...p}>
  <path d="M14 4 20 10l-3.4 3.4L10.6 7.4z" /><path d="m12.4 9-3 3" />
  <path d="M5.5 14.5a4 4 0 0 1 4 4" /><path d="M5 18a1.6 1.6 0 0 1 1 1" />
</S>);
const IconSwimmer = (p: IconProps) => (<S {...p}>
  <circle cx="16" cy="6.5" r="1.6" fill="currentColor" stroke="none" />
  <path d="M4 15.5c1.4 1 2.6 1 4 0s2.6-1 4 0 2.6 1 4 0 2.6-1 4 0" />
  <path d="M6.5 12.5 11 10l3 2 3.5-3.5" />
</S>);
const IconCamera = (p: IconProps) => (<S {...p}>
  <path d="M3 8.5a2 2 0 0 1 2-2h1.5L8 4.5h8L17.5 6.5H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  <circle cx="12" cy="13" r="3.2" />
</S>);
const IconMapPin = (p: IconProps) => (<S {...p}>
  <path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z" /><circle cx="12" cy="10" r="2.4" />
</S>);
const IconWarning = (p: IconProps) => (<S {...p}>
  <path d="M12 3 22 20H2L12 3Z" /><path d="M12 10v4" />
  <circle cx="12" cy="16.6" r="0.9" fill="currentColor" stroke="none" />
</S>);

function Gauge() {
  return (
    <svg width="78" height="78" viewBox="0 0 100 100" role="img" aria-label="Today's score 7.6 out of 10">
      <circle cx="50" cy="50" r="42" fill="none" stroke="#dff1fb" strokeWidth="7" />
      <circle cx="50" cy="50" r="42" fill="none" stroke="#1D9E75" strokeWidth="7" strokeLinecap="round"
              strokeDasharray="264" strokeDashoffset="63" transform="rotate(-90 50 50)" />
      <text x="50" y="48" textAnchor="middle" fontSize="24" fontWeight="600" fill="#1f3d52">7.6</text>
      <text x="50" y="66" textAnchor="middle" fontSize="11" fill="#64748b">/10</text>
    </svg>
  );
}

const chip = "flex min-w-[78px] flex-col items-center justify-center gap-1 rounded-xl border border-ocean-100 bg-ocean-50 px-2 py-2.5 text-center";
const sep = "flex items-center text-base text-slate-400";

export function ScoreFlow() {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <div className={chip}><IconWaves className="h-6 w-6 text-[#185FA5]" /><span className="text-[13px] font-medium leading-tight">Waves</span></div>
        <span className={sep}>+</span>
        <div className={chip}><IconWind className="h-6 w-6 text-[#185FA5]" /><span className="text-[13px] font-medium leading-tight">Wind</span></div>
        <span className={sep}>+</span>
        <div className={chip}><IconTide className="h-6 w-6 text-[#0F6E56]" /><span className="text-[13px] font-medium leading-tight">Tide</span></div>
        <span className={sep}>+</span>
        <div className={chip}><IconSargassum className="h-6 w-6 text-[#BA7517]" /><span className="text-[13px] font-medium leading-tight">Sargassum</span></div>
        <span className={sep}>+</span>
        <div className={chip}><IconBeach className="h-6 w-6 text-[#0F6E56]" /><span className="text-[13px] font-medium leading-tight">Beach character</span></div>
        <span className="flex items-center px-0.5 text-lg text-slate-400">=</span>
        <div className="flex flex-col items-center">
          <span className="mb-1 text-[13px] font-medium">Today&apos;s score</span>
          <Gauge />
        </div>
      </div>

      <div className="mt-2.5 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
        <IconSatellite className="h-3.5 w-3.5" /> Live marine &amp; weather data · updated hourly
      </div>

      <div className="mx-auto mt-3 max-w-[400px]">
        <svg width="100%" viewBox="0 0 400 40" role="img" aria-label="The score becomes a swim score or a scenic score">
          <path d="M200 4 C200 24, 80 16, 70 36" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 4" />
          <path d="M200 4 C200 24, 320 16, 330 36" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 4" />
        </svg>
      </div>

      <div className="mt-1.5 flex flex-wrap gap-3.5">
        <div className="min-w-[250px] flex-1 overflow-hidden rounded-xl border border-ocean-100 bg-ocean-50">
          <div className="flex items-center gap-2.5 px-4 pb-2.5 pt-3.5">
            <span className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full bg-[#E1F5EE]"><IconSwimmer className="h-[18px] w-[18px] text-[#0F6E56]" /></span>
            <div><div className="text-base font-medium">Swim score</div><div className="text-xs text-slate-500">For calm and moderate beaches</div></div>
          </div>
          <svg width="100%" viewBox="0 0 320 150" role="img" aria-label="Swim score 8.2 out of 10" className="block">
            <rect x="0" y="0" width="320" height="150" fill="#EAF5FB" />
            <path d="M0 60 H320 V150 H0 Z" fill="#A6DCE2" />
            <path d="M0 60 Q90 52 180 60 T320 60 V150 H0 Z" fill="#9FD6DE" />
            <path d="M210 150 Q260 110 320 104 V150 Z" fill="#F2E4C6" />
            <path d="M20 86 q26 -6 52 0" fill="none" stroke="#ffffff" strokeWidth="2" opacity=".6" strokeLinecap="round" />
            <path d="M30 104 q26 -6 52 0" fill="none" stroke="#ffffff" strokeWidth="2" opacity=".5" strokeLinecap="round" />
            <circle cx="160" cy="88" r="32" fill="#ffffff" stroke="#1D9E75" strokeWidth="2.5" />
            <text x="160" y="86" textAnchor="middle" fontSize="22" fontWeight="600" fill="#0F6E56">8.2</text>
            <text x="160" y="102" textAnchor="middle" fontSize="10" fill="#0F6E56">/10</text>
          </svg>
          <div className="mx-3.5 mb-3.5 mt-2.5 rounded-md bg-[#E1F5EE] px-3 py-1.5 text-center text-xs font-medium text-[#0F6E56]">West &amp; south coast · best for swimming</div>
        </div>

        <div className="min-w-[250px] flex-1 overflow-hidden rounded-xl border border-ocean-100 bg-ocean-50">
          <div className="flex items-center gap-2.5 px-4 pb-2.5 pt-3.5">
            <span className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full bg-[#E6F1FB]"><IconCamera className="h-[18px] w-[18px] text-[#185FA5]" /></span>
            <div><div className="text-base font-medium">Scenic score</div><div className="text-xs text-slate-500">For wild, beautiful coastlines</div></div>
          </div>
          <svg width="100%" viewBox="0 0 320 150" role="img" aria-label="Scenic score 7.1 out of 10" className="block">
            <rect x="0" y="0" width="320" height="150" fill="#E7EEF6" />
            <path d="M0 54 H320 V150 H0 Z" fill="#6098CC" />
            <path d="M0 70 Q60 60 120 70 T240 70 T320 66 V150 H0 Z" fill="#4E86BD" />
            <path d="M232 150 L260 64 L286 90 L300 60 L320 84 V150 Z" fill="#6E7782" />
            <path d="M260 64 L286 90 L300 60 L320 84 V96 L300 78 L286 104 L260 86 Z" fill="#828B96" />
            <path d="M40 92 q22 -7 44 0" fill="none" stroke="#EAF2FA" strokeWidth="2" opacity=".7" strokeLinecap="round" />
            <path d="M70 110 q22 -7 44 0" fill="none" stroke="#EAF2FA" strokeWidth="2" opacity=".6" strokeLinecap="round" />
            <circle cx="160" cy="88" r="32" fill="#ffffff" stroke="#185FA5" strokeWidth="2.5" />
            <text x="160" y="86" textAnchor="middle" fontSize="22" fontWeight="600" fill="#0C447C">7.1</text>
            <text x="160" y="102" textAnchor="middle" fontSize="10" fill="#0C447C">/10</text>
          </svg>
          <div className="mx-3.5 mb-3.5 mt-2.5 rounded-md bg-[#E6F1FB] px-3 py-1.5 text-center text-xs font-medium text-[#0C447C]">Atlantic coast · best for scenery</div>
        </div>
      </div>
    </div>
  );
}

const scaleWrap = "flex flex-wrap items-center justify-center gap-x-[22px] gap-y-3 rounded-xl border border-ocean-100 bg-ocean-50 px-[18px] py-4";
const ScaleRow = ({ icon, label, sub }: { icon: React.ReactNode; label: string; sub: string }) => (
  <div className="flex items-center gap-2.5">
    {icon}
    <div><div className="text-sm font-medium">{label}</div><div className="text-[11px] text-slate-500">{sub}</div></div>
  </div>
);

export function SeaStateScale() {
  return (
    <div className={scaleWrap}>
      <ScaleRow icon={<IconWaves className="h-[22px] w-[22px] text-[#0F6E56]" />} label="Calm" sub="smooth & safe" />
      <ScaleRow icon={<IconWaves className="h-[22px] w-[22px] text-[#BA7517]" />} label="Moderate" sub="some chop" />
      <ScaleRow icon={<IconWaves className="h-[22px] w-[22px] text-[#D85A30]" />} label="Rough" sub="stronger surf" />
    </div>
  );
}

export function SargassumScale() {
  return (
    <div className={scaleWrap}>
      <ScaleRow icon={<IconSargassum className="h-[22px] w-[22px] text-[#0F6E56]" />} label="Clear" sub="little or none" />
      <ScaleRow icon={<IconSargassum className="h-[22px] w-[22px] text-[#BA7517]" />} label="Some present" sub="patchy seaweed" />
      <ScaleRow icon={<IconSargassum className="h-[22px] w-[22px] text-[#D85A30]" />} label="Heavy" sub="significant build-up" />
    </div>
  );
}

export function DataSources() {
  const card = "flex min-w-[230px] flex-1 flex-col items-center gap-2 rounded-xl border border-ocean-100 bg-ocean-50 px-3.5 py-[18px] text-center";
  return (
    <div className="flex flex-col items-stretch gap-2.5 sm:flex-row sm:justify-center">
      <div className={card}><IconSatellite className="h-7 w-7 text-[#185FA5]" /><div className="text-[15px] font-medium">Marine &amp; weather models</div></div>
      <span className="flex items-center justify-center text-lg text-slate-400">+</span>
      <div className={card}><IconMapPin className="h-7 w-7 text-[#0F6E56]" /><div className="text-[15px] font-medium">Local knowledge</div></div>
    </div>
  );
}

export function ManchineelCallout() {
  return (
    <div className="flex items-start gap-2.5 rounded-md border border-ocean-100 bg-ocean-50 p-3.5">
      <IconWarning className="mt-0.5 h-5 w-5 flex-none text-[#BA7517]" />
      <p className="text-sm leading-relaxed text-slate-600">Manchineel trees: several Barbados beaches, especially on the west coast, have manchineel trees near the sand. Every part is toxic: the sap burns and blisters skin, the small green apple-like fruit is dangerously poisonous, and sheltering under the canopy in rain can blister you from dripping sap. Many are marked with a red painted band, but not all. Keep a respectful distance from any unfamiliar tree on the back beach, rinse with fresh water if you think you&apos;ve made contact, and never eat any fruit you find on a beach.</p>
    </div>
  );
}
