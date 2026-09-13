import { createFileRoute } from "@tanstack/react-router";
import { ScadaShell } from "@/components/scada/ScadaShell";
import { PidDiagram } from "@/components/scada/PidDiagram";

export const Route = createFileRoute("/pid")({ component: PidPage });

function PidPage() {
  return (
    <ScadaShell fill>
      <div className="flex h-full min-h-0 flex-col p-1.5 sm:p-2">
        <PidDiagram />
      </div>
    </ScadaShell>
  );
}
