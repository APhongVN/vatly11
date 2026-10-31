import { createServerSupabaseClient } from "@/lib/supabase-server";
import TeacherDashboard from "./TeacherDashboard";

export default async function TeacherPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return <TeacherDashboard previewMode />;

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "teacher") return <TeacherDashboard previewMode />;

  return <TeacherDashboard />;
}
