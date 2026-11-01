import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export default async function StudentPortalLayout({ children }: { children: ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile, error: profileError } = await supabase.from("profiles")
    .select("role,must_change_password").eq("id", user.id).maybeSingle();
  if (profileError || !profile) redirect("/login?error=role");
  if (profile.role !== "student") redirect(profile.role === "teacher" ? "/giao-vien" : "/login?error=role");
  if (profile.must_change_password) redirect("/doi-mat-khau");

  const { data: student, error: studentError } = await supabase.from("students")
    .select("id").eq("auth_user_id", user.id).maybeSingle();
  if (studentError || !student) redirect("/login?error=student-profile");

  return children;
}
