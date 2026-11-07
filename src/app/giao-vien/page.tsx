import { getSupabasePublicKey } from "@/lib/supabase-config";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import TeacherDashboard from "./TeacherDashboard";

export default async function TeacherPage() {
  await connection();

  // Không còn chế độ xem thử: chưa đăng nhập hoặc không phải giáo viên
  // đều được chuyển thẳng sang trang đăng nhập.
  if (!(process.env.NEXT_PUBLIC_SUPABASE_URL && getSupabasePublicKey())) {
    redirect("/login");
  }

  let signedInTeacher = false;
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (!authError && user) {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      signedInTeacher = profile?.role === "teacher";
    }
  } catch (error) {
    console.warn("Không xác thực được phiên giáo viên.", error);
  }

  if (!signedInTeacher) redirect("/login?error=role");
  return <TeacherDashboard />;
}
