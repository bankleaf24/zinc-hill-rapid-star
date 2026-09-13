import { useState, type ReactNode } from "react";
import { Cpu, Fan, Gauge, Waves } from "lucide-react";
import { motorStatus, useScadaStore } from "@/lib/scada-store";
import type { MotorDevice, ValveDevice } from "@/lib/scada-types";
import { cn, fmt } from "@/lib/utils";

const YELLOW = "#d4a017";
const PURPLE = "#7c3aed";
const BG = "#d7eefb";
const CARD = "#ffffff";
const INK = "#12324f";
const MUTED = "#3d617c";
const LINE = "#86b6d6";
const GREEN = "#008c3a";
const RED = "#e11d48";
const GRAY = "#64748b";

const SETS = [
  {
    id: 1 as const,
    label: "Water Treatment 1 & 2",
    short: "Set 1",
    units: [1, 2] as const,
    rawId: "raw1",
    clearId: "clear1",
    actId: "act-v1",
    flow: "Raw Tank 1 → WT 1 & 2 → Clear Tank 1",
  },
  {
    id: 2 as const,
    label: "Water Treatment 3 & 4",
    short: "Set 2",
    units: [3, 4] as const,
    rawId: "raw2",
    clearId: "clear2",
    actId: "act-v2",
    flow: "Raw Tank 2 → WT 3 & 4 → Clear Tank 2",
  },
];

export function PidDiagram() {
  const [setId, setSetId] = useState<1 | 2>(1);
  const spec = SETS[setId - 1];

  const tanks = useScadaStore((s) => s.tanks);
  const motors = useScadaStore((s) => s.motors);
  const valves = useScadaStore((s) => s.valves);
  const lowTanks = useScadaStore((s) => s.lowTanks);
  const levels = useScadaStore((s) => s.levels);

  const act = valves[spec.actId];
  const raw = tanks[spec.rawId];
  const clear = tanks[spec.clearId];
  const rawLevel = levels[spec.rawId]?.value ?? raw.level;
  const clearLevel = levels[spec.clearId]?.value ?? clear.level;
  const rawPumps = [1, 2, 3].map((p) => motors[`${spec.rawId}-p${p}`]);

  const unitFlow = spec.units.map((u) => !!(motors[`u${u}-raw-1`]?.run || motors[`u${u}-raw-2`]?.run));
  const flow =
    !!act?.open || rawPumps.some((p) => p?.run) || unitFlow.some(Boolean);

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[var(--radius-lg)] border border-border bg-bg">
      <div className="infou-chrome flex shrink-0 items-center justify-between gap-2 px-3 py-1.5">
        <div className="min-w-0">
          <div className="text-[9px] font-semibold uppercase tracking-wider text-sky-100/80">P&I Diagram</div>
          <h2 className="truncate text-sm font-semibold text-white">Water Treatment Plant · {spec.flow}</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md bg-black/25 p-0.5 ring-1 ring-white/15">
            {SETS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSetId(s.id)}
                className={cn(
                  "rounded px-2.5 py-1 text-[11px] font-semibold transition",
                  setId === s.id
                    ? "bg-white text-[#0d3570] shadow-sm"
                    : "text-sky-100 hover:bg-white/10",
                )}
              >
                <span className="hidden sm:inline">{s.label}</span>
                <span className="sm:hidden">{s.short}</span>
              </button>
            ))}
          </div>
          <div className="hidden items-center gap-3 text-[10px] text-sky-100 xl:flex">
            <span className="inline-flex items-center gap-1">
              <span className="h-0.5 w-5 rounded bg-[#d4a017]" /> Process
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-0.5 w-5 rounded bg-[#7c3aed]" /> Air / O₃
            </span>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1 overflow-auto bg-bg">
          <svg
            viewBox="0 0 1760 940"
            className="h-full w-full min-w-[1080px]"
            role="img"
            aria-label={`${spec.label} P and I diagram`}
            shapeRendering="geometricPrecision"
          >
            <defs>
              <linearGradient id="hopMetal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#b7c4d4" />
              </linearGradient>
              <linearGradient id="tubeMetal" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#9aa8bd" />
                <stop offset="45%" stopColor="#f8fbff" />
                <stop offset="100%" stopColor="#6f7d93" />
              </linearGradient>
              <linearGradient id="tankSteel" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#8ea0b5" />
                <stop offset="40%" stopColor="#e8eef5" />
                <stop offset="100%" stopColor="#6b7c90" />
              </linearGradient>
              <marker id="arrY" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto">
                <polygon points="0,0 9,4.5 0,9" fill={YELLOW} />
              </marker>
              <marker id="arrP" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto">
                <polygon points="0,0 9,4.5 0,9" fill={PURPLE} />
              </marker>
            </defs>

            <rect width="1760" height="940" fill={BG} />

            <text x="78" y="32" fill={INK} fontSize="13" fontWeight="700">
              From MWA
            </text>
            <PidPipe d="M58 40 V900" color={YELLOW} active={flow} />

            <PidPipe d={`M58 78 H132`} color={YELLOW} active={!!act?.open} marker />
            <ActValve
              x={100}
              y={78}
              open={!!act?.open}
              label={`ACT. Valve ${spec.id}`}
              href="/equipment"
            />

            {/* Shared raw tank feeds both treatment units in this set */}
            <RawTank
              x={86}
              y={382}
              unit={spec.id}
              level={rawLevel}
              pumps={rawPumps}
              href={`/tanks/${spec.rawId}`}
            />
            <PidPipe d="M172 454 H200" color={YELLOW} active={flow} />
            <PidPipe d="M200 296 V740" color={YELLOW} active={flow} />

            <TreatmentLane
              y={48}
              unit={spec.units[0]}
              motors={motors}
              valves={valves}
              lowTanks={lowTanks}
              flow={flow || unitFlow[0]}
            />

            <line x1="220" y1="470" x2="1488" y2="470" stroke={LINE} strokeWidth="2" />
            <text x="228" y="464" fill={MUTED} fontSize="10" fontWeight="700">
              Water Treatment {spec.units[0]}
            </text>
            <text x="228" y="488" fill={MUTED} fontSize="10" fontWeight="700">
              Water Treatment {spec.units[1]}
            </text>

            <TreatmentLane
              y={492}
              unit={spec.units[1]}
              motors={motors}
              valves={valves}
              lowTanks={lowTanks}
              flow={flow || unitFlow[1]}
            />

            {/* Both units discharge to the set's clear-water tank */}
            <PidPipe d="M1460 296 H1508 V430" color={YELLOW} active={flow || unitFlow[0]} marker />
            <PidPipe d="M1460 740 H1508 V558" color={YELLOW} active={flow || unitFlow[1]} marker />
            <ClearTank
              x={1508}
              y={382}
              unit={spec.id}
              level={clearLevel}
              href={`/tanks/${spec.clearId}`}
            />
          </svg>
        </div>

        <aside className="hidden w-[176px] shrink-0 flex-col gap-2 overflow-y-auto border-l border-border bg-bg-elevated p-2 lg:flex">
          <div className="panel p-2 text-[11px] leading-snug text-fg">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-fg-muted">This set</div>
            <p className="mt-1 font-semibold text-primary">{spec.label}</p>
            <p className="mt-1 text-fg-muted">{spec.flow}</p>
          </div>
          <RailBlock title="PLC" icon={Cpu}>
            <RailRow label="PLC Master" ok />
            <RailRow label="PLC Slave 1" ok />
            <RailRow label="PLC Slave 2" ok />
          </RailBlock>
          <RailBlock title="Air Blower" icon={Fan}>
            {[1, 2, 3, 4].map((n) => (
              <RailRow
                key={n}
                label={`Air Blower ${n}`}
                ok={!!motors[`blower-${n}`]?.run}
                fault={!!motors[`blower-${n}`]?.fault}
              />
            ))}
          </RailBlock>
          <RailBlock title="Booster Pump" icon={Gauge}>
            <RailRow label="Boos. Pump 1" ok={!!motors["boost1-p1"]?.run} fault={!!motors["boost1-p1"]?.fault} />
            <RailRow label="Boos. Pump 2" ok={!!motors["boost1-p2"]?.run} fault={!!motors["boost1-p2"]?.fault} />
          </RailBlock>
          <RailBlock title="Control Room" icon={Waves}>
            <RailRow label="Sub Pump 1" ok={!!motors["s2-xfer-p1"]?.run} fault={!!motors["s2-xfer-p1"]?.fault} />
            <RailRow label="Sub Pump 2" ok={!!motors["s2-xfer-p2"]?.run} fault={!!motors["s2-xfer-p2"]?.fault} />
          </RailBlock>
        </aside>
      </div>
    </div>
  );
}

function TreatmentLane({
  y,
  unit,
  motors,
  valves,
  lowTanks,
  flow,
}: {
  y: number;
  unit: 1 | 2 | 3 | 4;
  motors: Record<string, MotorDevice>;
  valves: Record<string, ValveDevice>;
  lowTanks: Record<string, { lowLevel: boolean }>;
  flow: boolean;
}) {
  const spine = y + 248;
  const purpleY = y + 52;
  const rp1 = motors[`u${unit}-raw-1`];
  const rp2 = motors[`u${unit}-raw-2`];
  const cip = motors[`u${unit}-cip`];
  const bw = motors[`u${unit}-bw`];
  const ozone = motors[`u${unit}-ozone`];
  const sv = (n: number) => valves[`u${unit}-sv${n}`];
  const ufRun = !!(rp1?.run || rp2?.run);
  const o3 = !!ozone?.run;

  return (
    <g>
      <PidPipe d={`M200 ${spine} H1460`} color={YELLOW} active={flow} />

      <PidPipe d={`M560 ${purpleY} H1288`} color={PURPLE} active={o3} marker />
      <PidPipe d={`M560 ${purpleY} V${spine - 18}`} color={PURPLE} active={o3} />
      <PidPipe d={`M1288 ${purpleY} V${spine - 18}`} color={PURPLE} active={o3} />

      <Pump x={236} y={spine - 52} motor={rp1} label="Raw Pump 1" href={`/units/${unit}`} place="right" />
      <Pump x={236} y={spine + 56} motor={rp2} label="Raw Pump 2" href={`/units/${unit}`} place="below" />
      <PidPipe d={`M236 ${spine - 37} V${spine + 56}`} color={YELLOW} active={!!rp1?.run || !!rp2?.run} />

      <Hopper x={300} y={y + 86} title={`Post Chlorine ${unit}`} low={!!lowTanks[`u${unit}-post-cl`]?.lowLevel} />
      <Hopper x={300} y={y + 168} title={`Pre Chlorine ${unit}`} low={!!lowTanks[`u${unit}-pre-cl`]?.lowLevel} />
      <Hopper x={392} y={y + 86} title={`Backwash Chlorine ${unit}`} low={!!lowTanks[`u${unit}-bw-cl`]?.lowLevel} />
      <PidPipe d={`M324 ${y + 150} V${spine}`} color={YELLOW} active={flow} />
      <PidPipe d={`M324 ${y + 232} V${spine}`} color={YELLOW} active={flow} />
      <PidPipe d={`M416 ${y + 150} V${spine}`} color={YELLOW} active={flow} />

      <FilterCan x={488} y={spine} />
      <Solenoid x={548} y={spine} v={sv(1)} name="Solenoid V. 1" href={`/units/${unit}`} chipY={18} />

      <UfBank x={620} y={spine - 42} run={ufRun} href={`/units/${unit}`} title={`Water Treatment ${unit}`} />

      <Solenoid x={640} y={spine + 92} v={sv(5)} name="Solenoid V. 5" href={`/units/${unit}`} note="Drain" />
      <Solenoid x={740} y={spine + 92} v={sv(6)} name="Solenoid V. 6" href={`/units/${unit}`} note="Air" />

      <PidPipe d={`M716 ${spine} H980`} color={YELLOW} active={ufRun || !!cip?.run} />
      <BlueVessel x={748} y={spine - 22} />
      <Pump x={830} y={spine} motor={cip} label="CIP Pump" href={`/units/${unit}`} place="below" />
      <CipTank x={980} y={spine - 30} />

      <Solenoid x={640} y={purpleY} v={sv(2)} name="Solenoid V. 2" href={`/units/${unit}`} chipY={22} />
      <Solenoid x={770} y={purpleY} v={sv(4)} name="Solenoid V. 4" href={`/units/${unit}`} chipY={22} />
      <Solenoid x={900} y={purpleY} v={sv(7)} name="Solenoid V. 7" href={`/units/${unit}`} chipY={22} />
      <Solenoid x={1030} y={purpleY} v={sv(3)} name="Solenoid V. 3" href={`/units/${unit}`} chipY={22} />
      <text x="1174" y={purpleY + 4} fill={MUTED} fontSize="10">
        Drain Air
      </text>

      <Pump x={1148} y={spine - 96} motor={bw} label="Backwash Pump" href={`/units/${unit}`} place="left" />
      <PidPipe d={`M1148 ${spine - 81} V${spine}`} color={YELLOW} active={!!bw?.run} />

      <OzoneSkid
        x={1268}
        y={y + 118}
        unit={unit}
        run={o3}
        low={!!lowTanks[`u${unit}-oz-tank`]?.lowLevel}
        href={`/units/${unit}`}
      />
    </g>
  );
}

function PidPipe({
  d,
  color,
  active,
  marker,
}: {
  d: string;
  color: string;
  active?: boolean;
  marker?: boolean;
}) {
  const flow = color === YELLOW ? "pid-flow-y" : "pid-flow-p";
  return (
    <path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={active ? 3 : 2}
      strokeLinecap="round"
      strokeLinejoin="miter"
      strokeMiterlimit={2}
      strokeDasharray={active ? "12 8" : undefined}
      opacity={active ? 1 : 0.5}
      markerEnd={marker ? (color === YELLOW ? "url(#arrY)" : "url(#arrP)") : undefined}
      className={active ? flow : undefined}
      shapeRendering="geometricPrecision"
    />
  );
}

function ActValve({
  x,
  y,
  open,
  label,
  href,
}: {
  x: number;
  y: number;
  open: boolean;
  label: string;
  href: string;
}) {
  return (
    <a href={href}>
      <polygon
        points={`${x - 11},${y} ${x},${y - 11} ${x + 11},${y} ${x},${y + 11}`}
        fill={open ? "#dcfce7" : "#fee2e2"}
        stroke={open ? GREEN : RED}
        strokeWidth="1.7"
      />
      {!open && (
        <path
          d={`M${x - 6} ${y - 6} L${x + 6} ${y + 6} M${x + 6} ${y - 6} L${x - 6} ${y + 6}`}
          stroke={RED}
          strokeWidth="1.6"
        />
      )}
      <Chip x={x + 16} y={y - 8} ok={open} text={label} />
    </a>
  );
}

function Chip({ x, y, ok, text, fault }: { x: number; y: number; ok: boolean; text: string; fault?: boolean }) {
  const w = Math.max(84, text.length * 6.4 + 24);
  const fill = fault ? RED : ok ? GREEN : GRAY;
  return (
    <g>
      <rect x={x} y={y} width={w} height={16} rx="3" fill={CARD} stroke={LINE} />
      <rect x={x + 3} y={y + 3} width={10} height={10} rx="1.5" fill={fill} />
      <text x={x + 16} y={y + 12} fill={INK} fontSize="8" fontWeight="600">
        {text}
      </text>
    </g>
  );
}

function RawTank({
  x,
  y,
  unit,
  level,
  pumps,
  href,
}: {
  x: number;
  y: number;
  unit: number;
  level: number;
  pumps: Array<MotorDevice | undefined>;
  href: string;
}) {
  const h = 176;
  const w = 92;
  const inner = h - 24;
  const fillH = (Math.max(0, Math.min(100, level)) / 100) * inner;
  return (
    <a href={href}>
      <rect x={x} y={y} width={w} height={h} rx="4" fill={CARD} stroke={LINE} strokeWidth="1.6" />
      <rect x={x + 6} y={y + 18} width={w - 12} height={inner} rx="2" fill="#e8f4fc" />
      <rect x={x + 6} y={y + 18 + (inner - fillH)} width={w - 12} height={fillH} fill="url(#tankSteel)" opacity="0.95" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <line
          key={i}
          x1={x + 12}
          y1={y + 32 + i * 22}
          x2={x + w - 12}
          y2={y + 32 + i * 22}
          stroke="#ffffff"
          strokeWidth="1.6"
          opacity="0.45"
        />
      ))}
      <text x={x + w / 2} y={y + 13} textAnchor="middle" fill={INK} fontSize="8" fontWeight="700">
        Raw Water Tank {unit}
      </text>
      <circle cx={x + w + 22} cy={y + 12} r="10" fill="#facc15" stroke="#a16207" />
      <text x={x + w + 22} y={y + 15} textAnchor="middle" fill={INK} fontSize="8" fontWeight="700">
        LS
      </text>
      <text x={x + w + 36} y={y + 16} fill="#0369a1" fontSize="9" fontWeight="600">
        Radar {unit}
      </text>
      <rect x={x - 20} y={y + 32} width="12" height="108" rx="1" fill="#ecfdf3" stroke={GREEN} />
      <rect x={x - 18} y={y + 32 + (108 - fillH * 0.6)} width="8" height={Math.max(4, fillH * 0.6)} fill={GREEN} />
      <text x={x - 36} y={y + 42} fill={RED} fontSize="8">
        HH
      </text>
      <text x={x - 32} y={y + 64} fill={RED} fontSize="8">
        H
      </text>
      <text x={x - 30} y={y + 118} fill={RED} fontSize="8">
        L
      </text>
      <text x={x - 36} y={y + 140} fill={RED} fontSize="8">
        LL
      </text>
      <text x={x + 10} y={y + h - 7} fill={GREEN} fontSize="11" fontFamily="Consolas, monospace" fontWeight="700">
        {fmt(level, 0)}%
      </text>
      {pumps.map((p, i) => (
        <text
          key={i}
          x={x + 10}
          y={y + 36 + i * 13}
          fill={p?.fault ? RED : p?.run ? GREEN : MUTED}
          fontSize="8"
          fontWeight="600"
        >
          Subm. Pump {i + 1}
        </text>
      ))}
    </a>
  );
}

function ClearTank({
  x,
  y,
  unit,
  level,
  href,
}: {
  x: number;
  y: number;
  unit: number;
  level: number;
  href: string;
}) {
  const h = 176;
  const w = 96;
  const inner = h - 24;
  const fillH = (Math.max(0, Math.min(100, level)) / 100) * inner;
  return (
    <a href={href}>
      <rect x={x} y={y} width={w} height={h} rx="4" fill={CARD} stroke={LINE} strokeWidth="1.6" />
      <rect x={x + 6} y={y + 18} width={w - 12} height={inner} rx="2" fill="#e8f4fc" />
      <rect x={x + 6} y={y + 18 + (inner - fillH)} width={w - 12} height={fillH} fill="url(#tankSteel)" opacity="0.95" />
      <text x={x + w / 2} y={y + 13} textAnchor="middle" fill={INK} fontSize="8" fontWeight="700">
        Clear Water Tank {unit}
      </text>
      <circle cx={x - 20} cy={y + 10} r="10" fill="#facc15" stroke="#a16207" />
      <text x={x - 20} y={y + 13} textAnchor="middle" fill={INK} fontSize="8" fontWeight="700">
        LS
      </text>
      <text x={x - 8} y={y + 32} fill="#0369a1" fontSize="9" fontWeight="600">
        Radar {unit}
      </text>
      <rect x={x + w + 8} y={y + 32} width="12" height="108" rx="1" fill="#ecfdf3" stroke={GREEN} />
      <rect
        x={x + w + 10}
        y={y + 32 + (108 - fillH * 0.6)}
        width="8"
        height={Math.max(4, fillH * 0.6)}
        fill={GREEN}
      />
      <text x={x + 12} y={y + h - 7} fill={GREEN} fontSize="11" fontFamily="Consolas, monospace" fontWeight="700">
        {fmt(level, 0)}%
      </text>
    </a>
  );
}

function Hopper({ x, y, title, low }: { x: number; y: number; title: string; low: boolean }) {
  return (
    <g>
      <polygon points={`${x + 8},${y} ${x + 48},${y} ${x + 28},${y + 38}`} fill="url(#hopMetal)" stroke={LINE} />
      <rect x={x} y={y + 40} width="56" height="30" rx="3" fill={CARD} stroke={LINE} />
      <text x={x + 28} y={y + 52} textAnchor="middle" fill={INK} fontSize="7" fontWeight="600">
        {title}
      </text>
      {[0, 1, 2].map((i) => (
        <rect key={i} x={x + 8 + i * 14} y={y + 56} width="12" height="9" rx="1" fill={low && i === 2 ? RED : GREEN} />
      ))}
    </g>
  );
}

function FilterCan({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x - 14} y={y - 18} width="28" height="36" rx="8" fill={CARD} stroke={LINE} strokeWidth="1.5" />
      <line x1={x - 8} y1={y - 8} x2={x + 8} y2={y - 8} stroke={MUTED} />
      <line x1={x - 8} y1={y} x2={x + 8} y2={y} stroke={MUTED} />
      <line x1={x - 8} y1={y + 8} x2={x + 8} y2={y + 8} stroke={MUTED} />
    </g>
  );
}

function Solenoid({
  x,
  y,
  v,
  name,
  href,
  note,
  chipY = 18,
}: {
  x: number;
  y: number;
  v?: ValveDevice;
  name: string;
  href: string;
  note?: string;
  chipY?: number;
}) {
  const open = !!v?.open;
  return (
    <a href={href}>
      <circle cx={x} cy={y - 22} r="9" fill={CARD} stroke={GREEN} strokeWidth="1.6" />
      <text x={x} y={y - 18} textAnchor="middle" fill={GREEN} fontSize="9" fontWeight="700">
        S
      </text>
      <rect x={x - 15} y={y - 11} width="30" height="22" rx="3" fill={CARD} stroke={LINE} />
      <path
        d={`M${x - 7} ${y - 5} L${x + 7} ${y + 5} M${x + 7} ${y - 5} L${x - 7} ${y + 5}`}
        stroke={open ? GREEN : RED}
        strokeWidth="2.1"
      />
      <Chip x={x - 42} y={y + chipY} ok={open} text={name} />
      {note && (
        <text x={x} y={y + chipY + 28} textAnchor="middle" fill={MUTED} fontSize="8">
          {note}
        </text>
      )}
    </a>
  );
}

function Pump({
  x,
  y,
  motor,
  label,
  href,
  place = "right",
}: {
  x: number;
  y: number;
  motor?: MotorDevice;
  label: string;
  href: string;
  place?: "right" | "left" | "below";
}) {
  const st = motor ? motorStatus(motor) : "stop";
  const fill = st === "run" ? GREEN : st === "fault" ? RED : GRAY;
  const chipW = Math.max(84, label.length * 6.4 + 24);
  const chip =
    place === "left"
      ? { x: x - 20 - chipW, y: y - 8 }
      : place === "below"
        ? { x: x - chipW / 2, y: y + 20 }
        : { x: x + 20, y: y - 8 };
  return (
    <a href={href}>
      <circle cx={x} cy={y} r="16" fill={fill} stroke="#052e16" strokeWidth="1.4" />
      <polygon points={`${x - 5},${y - 6} ${x + 9},${y} ${x - 5},${y + 6}`} fill="#ffffff" opacity="0.9" />
      <Chip x={chip.x} y={chip.y} ok={st === "run"} fault={st === "fault"} text={label} />
    </a>
  );
}

function UfBank({
  x,
  y,
  run,
  href,
  title,
}: {
  x: number;
  y: number;
  run: boolean;
  href: string;
  title: string;
}) {
  return (
    <a href={href}>
      <rect x={x} y={y} width="104" height="78" rx="4" fill={CARD} stroke={run ? GREEN : LINE} strokeWidth="1.7" />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <rect key={i} x={x + 10 + i * 11} y={y + 10} width="8" height="42" rx="2" fill="url(#tubeMetal)" />
      ))}
      <rect x={x + 6} y={y + 6} width="14" height="8" rx="1" fill={run ? GREEN : GRAY} />
      <text x={x + 52} y={y + 68} textAnchor="middle" fill={INK} fontSize="8" fontWeight="600">
        {title}
      </text>
    </a>
  );
}

function BlueVessel({ x, y }: { x: number; y: number }) {
  return (
    <path
      d={`M${x} ${y} L${x + 32} ${y} L${x + 26} ${y + 42} L${x + 6} ${y + 42} Z`}
      fill="#3b82f6"
      stroke="#1d4ed8"
    />
  );
}

function CipTank({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x} y={y} width="62" height="50" rx="3" fill="#94a3b8" stroke={LINE} />
      <rect x={x + 6} y={y + 8} width="50" height="32" rx="2" fill="#e2e8f0" />
      <text x={x + 31} y={y + 64} textAnchor="middle" fill={INK} fontSize="8" fontWeight="600">
        CIP Tank Level
      </text>
    </g>
  );
}

function OzoneSkid({
  x,
  y,
  unit,
  run,
  low,
  href,
}: {
  x: number;
  y: number;
  unit: number;
  run: boolean;
  low: boolean;
  href: string;
}) {
  return (
    <a href={href}>
      <Chip x={x} y={y} ok={run} text={`Ozone ${unit}`} />
      <rect x={x} y={y + 24} width="86" height="22" rx="3" fill={CARD} stroke={LINE} />
      <rect x={x + 5} y={y + 28} width="12" height="14" rx="1" fill={low ? RED : GREEN} />
      <text x={x + 22} y={y + 39} fill={INK} fontSize="8" fontWeight="600">
        Ozone Tank
      </text>
      <rect x={x + 96} y={y + 10} width="56" height="50" rx="4" fill="#cbd5e1" stroke={LINE} />
      <rect x={x + 104} y={y + 16} width="40" height="22" rx="2" fill="#0f172a" />
      <circle cx={x + 124} cy={y + 50} r="5" fill={run ? GREEN : GRAY} />
    </a>
  );
}

function RailBlock({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Cpu;
  children: ReactNode;
}) {
  return (
    <div className="panel p-2">
      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-fg-muted">
        <Icon className="size-3.5 text-primary" />
        {title}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function RailRow({ label, ok, fault }: { label: string; ok?: boolean; fault?: boolean }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] text-fg">
      <span
        className={cn(
          "h-2.5 w-2.5 shrink-0 rounded-[2px]",
          fault ? "bg-fault" : ok ? "bg-run" : "bg-stop",
        )}
      />
      {label}
    </div>
  );
}

