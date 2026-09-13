import { createFileRoute, Link } from "@tanstack/react-router";
import { Droplets } from "lucide-react";
import { GROK_PROVIDERS, authEnabled, signIn } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-4 pt-[var(--grok-banner-h,0px)]">
      <div className="panel w-full max-w-sm space-y-5 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)] bg-primary/15 text-primary ring-1 ring-primary/30">
            <Droplets className="size-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Sign in</h1>
            <p className="text-xs text-fg-muted">Water Bank 901 SCADA</p>
          </div>
        </div>

        {authEnabled ? (
          <div className="space-y-2">
            {GROK_PROVIDERS.map((p) => (
              <Button
                key={p.providerId}
                type="button"
                variant="secondary"
                className="w-full"
                onClick={() => signIn(p.providerId, { callbackURL: "/" })}
              >
                Continue with {p.label}
              </Button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-fg-muted">Sign-in is disabled for this environment.</p>
        )}

        <Link to="/" className="block text-center text-xs text-primary hover:underline">
          Back to plant overview
        </Link>
      </div>
    </main>
  );
}
