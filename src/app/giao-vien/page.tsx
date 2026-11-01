import { getSupabasePublicKey } from "@/lib/supabase-config";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import TeacherDashboard from "./TeacherDashboard";

export default async function TeacherPage() {
  await connection();
  let signedInTeacher = false;
  let signedInNonTeacher = false;

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && getSupabasePublicKey()) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (!authError && user) {
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
        signedInTeacher = profile?.role === "teacher";
        signedInNonTeacher = !signedInTeacher;
      }
    } catch (error) {
      console.warn("Không xác thực được phiên giáo viên; mở dashboard truy cập nhanh.", error);
    }
  }

  if (signedInNonTeacher) redirect("/hoc-sinh");
  if (!signedInTeacher) return <TeacherDashboard previewMode />;
  return <TeacherDashboard />;
}
