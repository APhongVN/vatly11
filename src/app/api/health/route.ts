import { NextResponse } from "next/server";

// Liveness + dependency probe. Always returns HTTP 200 while the app itself is
// up (so a load balancer keeps the service attached); the `status` field and
// per-dependency `dependencies` objects carry the real signal for operators.
export const dynamic = "force-dynamic";

type DependencyStatus = "ok" | "configured" | "missing" | "unreachable";

type Dependency = {
  name: "supabase" | "gemini";
  status: DependencyStatus;
  detail?: string;
};

async function probeSupabase(): Promise<Dependency> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) {
    return { name: "supabase", status: "missing", detail: "NEXT_PUBLIC_SUPABASE_URL or key not set" };
  }
  try {
    // Supabase's documented liveness endpoint; does not require table access.
    const res = await fetch(`${url.replace(/\/$/, "")}/auth/v1/health`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      return { name: "supabase", status: "unreachable", detail: `health endpoint returned ${res.status}` };
    }
    return { name: "supabase", status: "ok" };
  } catch (error) {
    return {
      name: "supabase",
      status: "unreachable",
      detail: error instanceof Error ? error.message : "probe failed",
    };
  }
}

function checkGemini(): Dependency {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) return { name: "gemini", status: "missing", detail: "GEMINI_API_KEY not set" };
  return { name: "gemini", status: "configured" };
}

export async function GET() {
  const [supabase] = await Promise.all([probeSupabase()]);
  const dependencies = [supabase, checkGemini()];
  const healthy = dependencies.every((dep) => dep.status === "ok" || dep.status === "configured");
  const status = healthy ? "ok" : "degraded";
  return NextResponse.json({
    status,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    dependencies,
  });
}
