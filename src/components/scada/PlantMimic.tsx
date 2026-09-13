import { Link } from "@tanstack/react-router";
import { useScadaStore, motorStatus } from "@/lib/scada-store";
import { cn, fmt } from "@/lib/utils";

/** InfoU-style process graphic — scales to fill one viewport when fill=true. */
export function PlantMimic({ fill = false }: { fill?: boolean }) {
  const tanks = useScadaStore((s) => s.tanks);
  const motors = useScadaStore((s) => s.motors);
  const valves = useScadaStore((s) => s.valves);
  const plantFlow = useScadaStore((s) => s.plantFlowM3h);
  const inlet = useScadaStore((s) => s.inletFlowM3d);
  const mdb1kW = useScadaStore((s) => s.mdb1.kWTotal);

  const act1Open = valves["act-v1"]?.open;
  const act2Open = valves["act-v2"]?.open;

  const raw1Running = [1, 2, 3].filter((p) => motors[`raw1-p${p}`]?.run && !motors[`raw1-p${p}`]?.fault).length;
  const raw2Running = [1, 2, 3].filter((p) => motors[`raw2-p${p}`]?.run && !motors[`raw2-p${p}`]?.fault).length;
  const clear1Running = [1, 2, 3, 4].filter((p) => motors[`clear1-p${p}`]?.run && !motors[`clear1-p${p}`]?.fault).length;
  const clear2Running = [1, 2, 3, 4].filter((p) => motors[`clear2-p${p}`]?.run && !motors[`clear2-p${p}`]?.fault).length;

  const unitStates = [1, 2, 3, 4].map((u) => {
    const pumps = [`u${u}-raw-1`, `u${u}-raw-2`].map((id) => motors[id]);
    const fault = pumps.some((p) => p?.fault);
    const run = pumps.some((p) => p?.run && !p?.fault);
    return { u, fault, run };
  });

  const blowersRun = [1, 2, 3, 4].filter((n) => motors[`blower-${n}`]?.run).length;
  const boostRun = ["boost1-p1", "boost1-p2", "boost2-p1", "boost2-p2"].filter(
    (id) => motors[id]?.run && !motors[id]?.fault,
  ).length;

  const trainAFlow = !!act1Open || raw1Running > 0 || unitStates.slice(0, 2).some((u) => u.run);
  const trainBFlow = !!act2Open || raw2Running > 0 || unitStates.slice(2).some((u) => u.run);
  const anyFlow = trainAFlow || trainBFlow || clear1Running > 0 || clear2Running > 0 || boostRun > 0;

  // Path segments for particle animation (process flow direction)
  const flowPaths = {
    inletA: "M98 62 H155",
    toRaw1: "M225 62 H300",
    raw1ToUf: "M400 88 H485",
    ufToClear1: "M680 88 H745",
    clear1ToBoost: "M850 88 H930",
    boostOutA: "M1035 88 H1110",
    inletB: "M98 268 H155",
    toRaw2: "M225 268 H300",
    raw2ToUf: "M400 292 H485",
    ufToClear2: "M680 292 H745",
    clear2ToBoost: "M850 292 H930",
    boostOutB: "M1035 292 H1110",
    riser: "M126 62 V268",
  } as const;

  return (
    <div
      className={cn(
        "panel relative flex flex-col overflow-hidden",
        fill ? "h-full min-h-0" : "",
      )}
    >
      <div className="scada-grid pointer-events-none absolute inset-0 opacity-25" />

      <div className="infou-chrome relative flex shrink-0 flex-wrap items-center justify-between gap-1 border-b border-border px-2 py-1 sm:px-3">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-semibold uppercase tracking-wider text-sky-200/80">
            Process graphic
          </span>
          <h2 className="text-xs font-semibold text-white sm:text-sm">Plant Mimic · Full system</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[10px] text-sky-100/80 sm:gap-3">
          <Legend color="bg-run" label="Run" />
          <Legend color="bg-stop" label="Stop" />
          <Legend color="bg-fault" label="Fault" />
          <span className="flow-indicator">
            <span className={cn("flow-indicator-dot", !anyFlow && "opacity-30")} />
            <span className={anyFlow ? "text-water" : "text-fg-subtle"}>Flow</span>
          </span>
          <span className="font-mono font-semibold text-white tabular">{fmt(plantFlow, 1)} m³/h</span>
        </div>
      </div>

      <div
        className={cn(
          "relative hidden min-h-0 flex-1 items-center justify-center lg:flex",
          fill ? "p-1" : "p-2",
        )}
      >
        <svg
          viewBox="0 0 1200 520"
          preserveAspectRatio="xMidYMid meet"
          className="h-full w-full max-h-full max-w-full"
          role="img"
          aria-label="Water treatment plant process overview"
          shapeRendering="geometricPrecision"
        >
          <defs>
            <linearGradient id="tankFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7dd4ff" stopOpacity="0.95" />
              <stop offset="45%" stopColor="#2eb8ff" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#0a6eb0" stopOpacity="0.95" />
            </linearGradient>
            <linearGradient id="panelGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#e8f4fc" />
            </linearGradient>
            <linearGradient id="pipeGlowGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#7dd4ff" stopOpacity="0.15" />
              <stop offset="50%" stopColor="#2eb8ff" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#7dd4ff" stopOpacity="0.15" />
            </linearGradient>
            <filter id="soft">
              <feDropShadow dx="0" dy="1" stdDeviation="1.2" floodOpacity="0.35" />
            </filter>
            <filter id="waterGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.8" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <marker id="flowArrow" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
              <path d="M0,0 L7,3.5 L0,7 Z" fill="#7dd4ff" />
            </marker>
          </defs>

          <text x="12" y="16" fill="#5a7a96" fontSize="10" fontFamily="Segoe UI, sans-serif">
            MWA INLET · {inlet.toLocaleString()} m³/day · Dual train UF · Animated flow
          </text>
          <text
            x="1188"
            y="16"
            fill="#5a7a96"
            fontSize="10"
            textAnchor="end"
            fontFamily="Consolas, monospace"
          >
            LS InfoU · Live
          </text>

          <g filter="url(#soft)">
            <rect x="10" y="40" width="88" height="44" rx="3" fill="url(#panelGrad)" stroke="#7eb6d6" />
            <text x="54" y="58" textAnchor="middle" fill="#16324f" fontSize="10" fontWeight="600">
              MWA Inlet
            </text>
            <text x="54" y="72" textAnchor="middle" fill="#5a7a96" fontSize="8">
              ~2000 m³/d
            </text>
          </g>

          {/* ===== TRAIN A pipes + particles ===== */}
          <FlowPipe d={flowPaths.inletA} active={!!act1Open} speed="fast" />
          <FlowPipe d={flowPaths.toRaw1} active={!!act1Open} speed="fast" />
          <FlowPipe d={flowPaths.raw1ToUf} active={raw1Running > 0} speed="normal" />
          <FlowPipe d={flowPaths.ufToClear1} active={unitStates.slice(0, 2).some((u) => u.run)} speed="normal" />
          <FlowPipe d={flowPaths.clear1ToBoost} active={clear1Running > 0} speed="normal" />
          <FlowPipe d={flowPaths.boostOutA} active={boostRun > 0} speed="fast" />

          {/* ===== TRAIN B ===== */}
          <FlowPipe d={flowPaths.inletB} active={!!act2Open} speed="fast" />
          <FlowPipe d={flowPaths.toRaw2} active={!!act2Open} speed="fast" />
          <FlowPipe d={flowPaths.raw2ToUf} active={raw2Running > 0} speed="normal" />
          <FlowPipe d={flowPaths.ufToClear2} active={unitStates.slice(2).some((u) => u.run)} speed="normal" />
          <FlowPipe d={flowPaths.clear2ToBoost} active={clear2Running > 0} speed="normal" />
          <FlowPipe d={flowPaths.boostOutB} active={boostRun > 0} speed="fast" />
          <FlowPipe d={flowPaths.riser} active={!!(act1Open || act2Open)} speed="slow" />

          <ValveNode x={175} y={62} open={!!act1Open} label="AV-1" />
          <ValveNode x={175} y={268} open={!!act2Open} label="AV-2" />

          <TankNode
            x={300}
            y={28}
            w={95}
            h={115}
            level={tanks.raw1.level}
            label="Raw 1"
            sub={`${fmt(tanks.raw1.level, 0)}%`}
            href="/tanks/raw1"
            filling={!!act1Open}
            draining={raw1Running > 0}
          />
          <TankNode
            x={300}
            y={232}
            w={95}
            h={115}
            level={tanks.raw2.level}
            label="Raw 2"
            sub={`${fmt(tanks.raw2.level, 0)}%`}
            href="/tanks/raw2"
            filling={!!act2Open}
            draining={raw2Running > 0}
          />

          <PumpBank
            x={405}
            y={48}
            label={`Raw1 ${raw1Running}/3`}
            pumps={[motors["raw1-p1"], motors["raw1-p2"], motors["raw1-p3"]]}
            href="/equipment"
          />
          <PumpBank
            x={405}
            y={252}
            label={`Raw2 ${raw2Running}/3`}
            pumps={[motors["raw2-p1"], motors["raw2-p2"], motors["raw2-p3"]]}
            href="/equipment"
          />

          <UnitBlock
            x={495}
            y={28}
            units={unitStates.slice(0, 2)}
            title="UF Train A · U1–U2"
            flowing={unitStates.slice(0, 2).some((u) => u.run)}
          />
          <UnitBlock
            x={495}
            y={232}
            units={unitStates.slice(2)}
            title="UF Train B · U3–U4"
            flowing={unitStates.slice(2).some((u) => u.run)}
          />

          <TankNode
            x={750}
            y={28}
            w={95}
            h={115}
            level={tanks.clear1.level}
            label="Clear 1"
            sub={`${fmt(tanks.clear1.level, 0)}%`}
            href="/tanks/clear1"
            filling={unitStates.slice(0, 2).some((u) => u.run)}
            draining={clear1Running > 0}
          />
          <TankNode
            x={750}
            y={232}
            w={95}
            h={115}
            level={tanks.clear2.level}
            label="Clear 2"
            sub={`${fmt(tanks.clear2.level, 0)}%`}
            href="/tanks/clear2"
            filling={unitStates.slice(2).some((u) => u.run)}
            draining={clear2Running > 0}
          />

          <PumpBank
            x={855}
            y={48}
            label={`Clr1 ${clear1Running}/4`}
            pumps={[motors["clear1-p1"], motors["clear1-p2"], motors["clear1-p3"], motors["clear1-p4"]]}
            href="/equipment"
          />
          <PumpBank
            x={855}
            y={252}
            label={`Clr2 ${clear2Running}/4`}
            pumps={[motors["clear2-p1"], motors["clear2-p2"], motors["clear2-p3"], motors["clear2-p4"]]}
            href="/equipment"
          />

          <a href="/equipment">
            <rect x="1110" y="40" width="78" height="95" rx="3" fill="url(#panelGrad)" stroke="#7eb6d6" />
            <text x="1149" y="58" textAnchor="middle" fill="#16324f" fontSize="10" fontWeight="600">
              Booster
            </text>
            <text x="1149" y="72" textAnchor="middle" fill="#5a7a96" fontSize="9">
              {boostRun}/4
            </text>
            <circle cx="1128" cy="98" r="8" fill={motors["boost1-p1"]?.run ? "#00c853" : "#9ec4dc"} />
            <circle cx="1149" cy="98" r="8" fill={motors["boost1-p2"]?.run ? "#00c853" : "#9ec4dc"} />
            <circle cx="1170" cy="98" r="8" fill={motors["boost2-p1"]?.run ? "#00c853" : "#9ec4dc"} />
            <circle cx="1149" cy="120" r="8" fill={motors["boost2-p2"]?.run ? "#00c853" : "#9ec4dc"} />
            {boostRun > 0 && (
              <FlowDots
                d="M1110 88 H1188"
                count={3}
                duration={1.2}
                color="#7dd4ff"
              />
            )}
          </a>

          <g>
            <rect x="1110" y="245" width="78" height="95" rx="3" fill="url(#panelGrad)" stroke="#7eb6d6" />
            <text x="1149" y="268" textAnchor="middle" fill="#16324f" fontSize="10" fontWeight="600">
              Supply
            </text>
            <text
              x="1149"
              y="300"
              textAnchor="middle"
              fill="#2eb8ff"
              fontSize="12"
              fontWeight="700"
              fontFamily="Consolas, monospace"
            >
              {fmt(plantFlow, 1)}
            </text>
            <text x="1149" y="316" textAnchor="middle" fill="#5a7a96" fontSize="9">
              m³/h
            </text>
            {plantFlow > 1 && (
              <>
                <circle r="2.5" fill="#7dd4ff" filter="url(#waterGlow)">
                  <animate attributeName="cx" values="1125;1175;1125" dur="1.4s" repeatCount="indefinite" />
                  <animate attributeName="cy" values="325;325;325" dur="1.4s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.3;1;0.3" dur="1.4s" repeatCount="indefinite" />
                </circle>
              </>
            )}
          </g>

          <a href="/equipment">
            <rect x="300" y="400" width="420" height="95" rx="3" fill="url(#panelGrad)" stroke="#7eb6d6" />
            <text x="316" y="422" fill="#16324f" fontSize="11" fontWeight="600">
              Air Blowers B1–B4
            </text>
            <text x="316" y="438" fill="#5a7a96" fontSize="9">
              {blowersRun}/4 running
            </text>
            {[1, 2, 3, 4].map((n, i) => {
              const m = motors[`blower-${n}`];
              const st = m ? motorStatus(m) : "stop";
              const color = st === "run" ? "#00c853" : st === "fault" ? "#ff1744" : "#78909c";
              const cx = 400 + i * 70;
              return (
                <g key={n}>
                  <circle cx={cx} cy={462} r="16" fill={color} />
                  {st === "run" && (
                    <g>
                      {/* spinning impeller hint */}
                      <path
                        d={`M${cx} ${462 - 8} L${cx + 3} ${462} L${cx} ${462 + 8} L${cx - 3} ${462} Z`}
                        fill="#0a1628"
                        opacity="0.55"
                      >
                        <animateTransform
                          attributeName="transform"
                          type="rotate"
                          from={`0 ${cx} 462`}
                          to={`360 ${cx} 462`}
                          dur="1.1s"
                          repeatCount="indefinite"
                        />
                      </path>
                    </g>
                  )}
                  <text
                    x={cx}
                    y={466}
                    textAnchor="middle"
                    fill="#0a1628"
                    fontSize="11"
                    fontWeight="700"
                  >
                    B{n}
                  </text>
                </g>
              );
            })}
          </a>

          <a href="/units">
            <rect x="740" y="400" width="240" height="95" rx="3" fill="url(#panelGrad)" stroke="#7eb6d6" />
            <text x="756" y="424" fill="#16324f" fontSize="11" fontWeight="600">
              Chemicals · Ozone
            </text>
            <text x="756" y="444" fill="#5a7a96" fontSize="9">
              Pre / Post / BW Cl₂ + O₃
            </text>
            <text x="756" y="468" fill="#ffab00" fontSize="10">
              Open UF unit details →
            </text>
            <text x="756" y="486" fill="#5a7a96" fontSize="9">
              Units 1–4 low-level tanks
            </text>
          </a>

          <a href="/electrical">
            <rect x="1000" y="400" width="188" height="95" rx="3" fill="url(#panelGrad)" stroke="#7eb6d6" />
            <text x="1016" y="424" fill="#16324f" fontSize="11" fontWeight="600">
              MDB Power
            </text>
            <text
              x="1016"
              y="448"
              fill="#2eb8ff"
              fontSize="14"
              fontWeight="700"
              fontFamily="Consolas, monospace"
            >
              {fmt(mdb1kW, 1)} kW
            </text>
            <text x="1016" y="470" fill="#5a7a96" fontSize="9">
              Slave 1 · open detail
            </text>
          </a>

          <text x="12" y="510" fill="#5a7a96" fontSize="9" fontFamily="Segoe UI, sans-serif">
            Water flow animates when valves OPEN / pumps RUN · Cyan stream + particles show direction
          </text>
        </svg>
      </div>

      {/* Mobile */}
      <div
        className={cn(
          "relative grid gap-1.5 overflow-auto p-2 lg:hidden",
          fill ? "min-h-0 flex-1 grid-cols-2 content-start sm:grid-cols-3" : "",
        )}
      >
        <FlowCard
          title="MWA Inlet"
          detail={`${inlet.toLocaleString()} m³/d`}
          className="col-span-2 sm:col-span-1"
        />
        <MiniTank tank={tanks.raw1} to="/tanks/raw1" valveOpen={!!act1Open} pumps={`${raw1Running}/3`} flowing={!!act1Open || raw1Running > 0} />
        <MiniTank tank={tanks.raw2} to="/tanks/raw2" valveOpen={!!act2Open} pumps={`${raw2Running}/3`} flowing={!!act2Open || raw2Running > 0} />
        {unitStates.map(({ u, run, fault }) => (
          <Link
            key={u}
            to="/units/$unitId"
            params={{ unitId: String(u) }}
            className={cn(
              "rounded-[var(--radius-sm)] border bg-surface-2 px-2 py-1.5",
              fault ? "border-fault/50" : run ? "border-water/40" : "border-border",
            )}
          >
            <div className="flex items-center justify-between gap-1">
              <div className="text-[11px] font-semibold">UF {u}</div>
              {run && <span className="flow-indicator-dot" />}
            </div>
            <div
              className={cn(
                "text-[10px] font-semibold",
                fault ? "text-fault" : run ? "text-run" : "text-fg-muted",
              )}
            >
              {fault ? "FAULT" : run ? "RUN · FLOW" : "STOP"}
            </div>
          </Link>
        ))}
        <MiniTank tank={tanks.clear1} to="/tanks/clear1" pumps={`${clear1Running}/4`} flowing={clear1Running > 0} />
        <MiniTank tank={tanks.clear2} to="/tanks/clear2" pumps={`${clear2Running}/4`} flowing={clear2Running > 0} />
        <FlowCard title="Booster" detail={`${boostRun}/4`} to="/equipment" />
        <FlowCard title="Blowers" detail={`${blowersRun}/4`} to="/equipment" />
        <FlowCard title="Flow" detail={`${fmt(plantFlow, 1)} m³/h`} />
      </div>
    </div>
  );
}

/* ---------- Animated flow primitives ---------- */

function FlowPipe({
  d,
  active,
  speed = "normal",
}: {
  d: string;
  active: boolean;
  speed?: "slow" | "normal" | "fast";
}) {
  const flowClass =
    speed === "fast" ? "pipe-flow-fast" : speed === "slow" ? "pipe-flow-slow" : "pipe-flow";
  const dur = speed === "fast" ? 0.9 : speed === "slow" ? 2.0 : 1.35;
  const count = speed === "fast" ? 4 : speed === "slow" ? 2 : 3;

  return (
    <g className={active ? "pipe-glow" : undefined}>
      {/* pipe body */}
      <path
        d={d}
        fill="none"
        stroke={active ? "#7eb8d8" : "#c5dcea"}
        strokeWidth={active ? 6 : 4}
        strokeLinecap="round"
        strokeLinejoin="miter"
        opacity={0.95}
        shapeRendering="geometricPrecision"
      />
      {/* active water stream (dashed) */}
      <path
        d={d}
        fill="none"
        stroke={active ? "#2eb8ff" : "#9ec4dc"}
        strokeWidth={active ? 3 : 2}
        strokeLinecap="round"
        strokeLinejoin="miter"
        className={active ? flowClass : undefined}
        opacity={active ? 1 : 0.7}
        shapeRendering="geometricPrecision"
      />
      {/* bright pulse trail */}
      {active && (
        <path
          d={d}
          fill="none"
          stroke="#e0f7ff"
          strokeWidth={2}
          strokeLinecap="round"
          className="pipe-pulse"
          shapeRendering="geometricPrecision"
        />
      )}
      {/* moving water droplets */}
      {active && <FlowDots d={d} count={count} duration={dur} color="#b3ecff" />}
    </g>
  );
}

function FlowDots({
  d,
  count = 3,
  duration = 1.4,
  color = "#7dd4ff",
}: {
  d: string;
  count?: number;
  duration?: number;
  color?: string;
}) {
  return (
    <g filter="url(#waterGlow)">
      {Array.from({ length: count }).map((_, i) => (
        <circle key={i} r={2.4} fill={color} opacity={0.95}>
          <animateMotion
            dur={`${duration}s`}
            repeatCount="indefinite"
            begin={`${(i * duration) / count}s`}
            path={d}
            rotate="auto"
          />
          <animate
            attributeName="opacity"
            values="0;1;1;0"
            keyTimes="0;0.12;0.88;1"
            dur={`${duration}s`}
            repeatCount="indefinite"
            begin={`${(i * duration) / count}s`}
          />
        </circle>
      ))}
      {/* slightly larger lead droplet */}
      <circle r={3.2} fill="#ffffff" opacity={0.55}>
        <animateMotion dur={`${duration * 1.05}s`} repeatCount="indefinite" path={d} />
        <animate
          attributeName="opacity"
          values="0;0.7;0.7;0"
          keyTimes="0;0.1;0.9;1"
          dur={`${duration * 1.05}s`}
          repeatCount="indefinite"
        />
      </circle>
    </g>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={cn("size-1.5 rounded-full", color)} />
      {label}
    </span>
  );
}

function ValveNode({ x, y, open, label }: { x: number; y: number; open: boolean; label: string }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <polygon
        points="-12,0 0,-10 12,0 0,10"
        fill={open ? "#0d6cad" : "#d5e8f4"}
        stroke={open ? "#2eb8ff" : "#78909c"}
        strokeWidth="1.75"
      />
      {open && (
        <circle r="3" fill="#7dd4ff" opacity="0.9">
          <animate attributeName="r" values="2;4;2" dur="1.2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.4;1;0.4" dur="1.2s" repeatCount="indefinite" />
        </circle>
      )}
      <text y="22" textAnchor="middle" fill="#5a7a96" fontSize="8">
        {label}
      </text>
      <text y="32" textAnchor="middle" fill={open ? "#2eb8ff" : "#78909c"} fontSize="7" fontWeight="700">
        {open ? "OPEN" : "CLOSE"}
      </text>
    </g>
  );
}

function TankNode({
  x,
  y,
  w,
  h,
  level,
  label,
  sub,
  href,
  filling,
  draining,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  level: number;
  label: string;
  sub: string;
  href: string;
  filling?: boolean;
  draining?: boolean;
}) {
  const pad = 5;
  const innerH = h - 32;
  const fillH = (Math.max(0, Math.min(100, level)) / 100) * (innerH - pad * 2);
  const surfaceY = y + 22 + pad + (innerH - pad * 2 - fillH);
  const clipId = `clip_${label.replace(/\s/g, "")}_${x}_${y}`;

  return (
    <a href={href}>
      <defs>
        <clipPath id={clipId}>
          <rect x={x + pad} y={y + 22} width={w - pad * 2} height={innerH} rx="2" />
        </clipPath>
      </defs>
      <rect x={x} y={y} width={w} height={h} rx="3" fill="#ffffff" stroke="#7eb6d6" strokeWidth="1.5" />
      <rect x={x + pad} y={y + 22} width={w - pad * 2} height={innerH} rx="2" fill="#cfe6f5" stroke="#7eb6d6" />
      {/* water body */}
      <rect
        x={x + pad}
        y={surfaceY}
        width={w - pad * 2}
        height={fillH}
        fill="url(#tankFill)"
        clipPath={`url(#${clipId})`}
      />
      {/* surface ripple */}
      {fillH > 4 && (
        <g clipPath={`url(#${clipId})`}>
          <ellipse
            cx={x + w / 2}
            cy={surfaceY + 2}
            rx={(w - pad * 2) / 2 - 1}
            ry={3}
            fill="#e0f7ff"
            opacity="0.35"
            className="tank-surface-wave"
          />
          {(filling || draining) && (
            <>
              {/* rising/falling micro bubbles */}
              {[0.25, 0.5, 0.75].map((t, i) => (
                <circle key={i} cx={x + pad + (w - pad * 2) * t} r="1.4" fill="#b3ecff" opacity="0.7">
                  <animate
                    attributeName="cy"
                    values={
                      filling
                        ? `${y + 22 + innerH - 4};${surfaceY + 6}`
                        : `${surfaceY + 8};${y + 22 + innerH - 6}`
                    }
                    dur={`${1.6 + i * 0.35}s`}
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="0;0.85;0"
                    dur={`${1.6 + i * 0.35}s`}
                    repeatCount="indefinite"
                  />
                </circle>
              ))}
            </>
          )}
        </g>
      )}
      <text x={x + w / 2} y={y + 14} textAnchor="middle" fill="#16324f" fontSize="10" fontWeight="600">
        {label}
      </text>
      <text
        x={x + w / 2}
        y={y + h - 6}
        textAnchor="middle"
        fill="#5a7a96"
        fontSize="9"
        fontFamily="Consolas, monospace"
      >
        {sub}
        {filling ? " ↑" : draining ? " ↓" : ""}
      </text>
    </a>
  );
}

function PumpBank({
  x,
  y,
  label,
  pumps,
  href,
}: {
  x: number;
  y: number;
  label: string;
  pumps: Array<{ run: boolean; fault: boolean } | undefined>;
  href: string;
}) {
  return (
    <a href={href}>
      <rect x={x} y={y} width={68} height={80} rx="3" fill="#f4fafd" stroke="#7eb6d6" />
      <text x={x + 34} y={y + 12} textAnchor="middle" fill="#5a7a96" fontSize="7.5">
        {label}
      </text>
      {pumps.map((p, i) => {
        const st = !p ? "stop" : p.fault ? "fault" : p.run ? "run" : "stop";
        const color = st === "run" ? "#00c853" : st === "fault" ? "#ff1744" : "#546e7a";
        const cx = x + 20 + (i % 2) * 28;
        const cy = y + 36 + Math.floor(i / 2) * 22;
        return (
          <g key={i}>
            <circle cx={cx} cy={cy} r="8" fill={color} />
            {st === "run" && (
              <g>
                <circle cx={cx} cy={cy} r="10" fill="none" stroke="#7dd4ff" strokeWidth="1" opacity="0.5">
                  <animate attributeName="r" values="8;12;8" dur="1s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.6;0;0.6" dur="1s" repeatCount="indefinite" />
                </circle>
                <path d={`M${cx} ${cy - 4} L${cx + 2.5} ${cy} L${cx} ${cy + 4} L${cx - 2.5} ${cy} Z`} fill="#052e16" opacity="0.7">
                  <animateTransform
                    attributeName="transform"
                    type="rotate"
                    from={`0 ${cx} ${cy}`}
                    to={`360 ${cx} ${cy}`}
                    dur="0.9s"
                    repeatCount="indefinite"
                  />
                </path>
              </g>
            )}
          </g>
        );
      })}
    </a>
  );
}

function UnitBlock({
  x,
  y,
  units,
  title,
  flowing,
}: {
  x: number;
  y: number;
  units: Array<{ u: number; run: boolean; fault: boolean }>;
  title: string;
  flowing?: boolean;
}) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={170}
        height={115}
        rx="3"
        fill="#f4fafd"
        stroke={flowing ? "#2eb8ff" : "#7eb6d6"}
        strokeWidth={flowing ? 1.5 : 1}
      />
      <text x={x + 10} y={y + 15} fill="#16324f" fontSize="10" fontWeight="600">
        {title}
      </text>
      {flowing && (
        <FlowDots d={`M${x + 14} ${y + 95} H${x + 156}`} count={3} duration={1.5} color="#5ecbff" />
      )}
      {units.map((u, i) => {
        const color = u.fault ? "#ff1744" : u.run ? "#00c853" : "#78909c";
        return (
          <a key={u.u} href={`/units/${u.u}`}>
            <rect
              x={x + 10 + i * 78}
              y={y + 26}
              width={70}
              height={72}
              rx="3"
              fill="#ffffff"
              stroke={color}
              strokeWidth="1.5"
            />
            <text
              x={x + 45 + i * 78}
              y={y + 54}
              textAnchor="middle"
              fill="#16324f"
              fontSize="13"
              fontWeight="700"
            >
              U{u.u}
            </text>
            <text
              x={x + 45 + i * 78}
              y={y + 72}
              textAnchor="middle"
              fill={color}
              fontSize="9"
              fontWeight="700"
            >
              {u.fault ? "FAULT" : u.run ? "RUN" : "STOP"}
            </text>
            {u.run && !u.fault && (
              <g>
                {/* membrane flow lines */}
                {[0, 1, 2].map((line) => (
                  <line
                    key={line}
                    x1={x + 22 + i * 78}
                    y1={y + 82 + line * 3}
                    x2={x + 68 + i * 78}
                    y2={y + 82 + line * 3}
                    stroke="#2eb8ff"
                    strokeWidth="1"
                    opacity="0.55"
                    strokeDasharray="4 4"
                  >
                    <animate
                      attributeName="stroke-dashoffset"
                      values="0;-16"
                      dur={`${0.7 + line * 0.15}s`}
                      repeatCount="indefinite"
                    />
                  </line>
                ))}
              </g>
            )}
          </a>
        );
      })}
    </g>
  );
}

function MiniTank({
  tank,
  to,
  valveOpen,
  pumps,
  flowing,
}: {
  tank: { name: string; level: number };
  to: string;
  valveOpen?: boolean;
  pumps?: string;
  flowing?: boolean;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "panel block px-2 py-1.5 hover:border-primary/50",
        flowing && "border-water/35",
      )}
    >
      <div className="flex items-center justify-between gap-1">
        <div className="truncate text-[10px] font-semibold">{tank.name.replace("Water ", "")}</div>
        {flowing && <span className="flow-indicator-dot" />}
      </div>
      <div className="font-mono text-sm font-semibold text-water tabular">{fmt(tank.level, 0)}%</div>
      <div className="mt-0.5 h-1.5 overflow-hidden rounded-sm bg-bg">
        <div
          className={cn("h-full water-shimmer", flowing && "animate-pulse")}
          style={{ width: `${tank.level}%` }}
        />
      </div>
      <div className="mt-0.5 flex justify-between text-[9px] text-fg-subtle">
        {valveOpen != null && <span>{valveOpen ? "OPEN" : "CLOSE"}</span>}
        {pumps && <span>{pumps}</span>}
      </div>
    </Link>
  );
}

function FlowCard({
  title,
  detail,
  to,
  className,
}: {
  title: string;
  detail: string;
  to?: string;
  className?: string;
}) {
  const body = (
    <div className={cn("panel px-2 py-1.5", className)}>
      <div className="text-[10px] font-semibold">{title}</div>
      <div className="text-[10px] text-fg-muted">{detail}</div>
    </div>
  );
  return to ? (
    <Link to={to} className={cn("block hover:opacity-90", className)}>
      {body}
    </Link>
  ) : (
    body
  );
}
