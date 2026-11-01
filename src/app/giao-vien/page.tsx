import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import TeacherDashboard from "./TeacherDashboard";

export default async function TeacherPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "teacher") redirect("/login?error=role");

  return <TeacherDashboard />;
}
