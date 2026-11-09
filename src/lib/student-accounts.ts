import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

const DEFAULT_STUDENT_AUTH_EMAIL_DOMAIN = "vatly.com";
const EMAIL_DOMAIN_PATTERN = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;
const MAX_USERNAME_LENGTH = 32;

export function normalizeStudentUsername(value: string) {
  return value.trim().toLocaleLowerCase("en-US").replace(/[^a-z0-9]/g, "").slice(0, MAX_USERNAME_LENGTH);
}

export function studentUsernameBase(fullName: string) {
  const ascii = fullName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d");
  const normalized = normalizeStudentUsername(ascii);
  return (normalized || "hocsinh").slice(0, 24);
}

export function generateTemporaryStudentPassword(fullName: string) {
  // Mật khẩu tạm dạng SỐ ngắn gọn, đúng 6 chữ số, dễ nhập cho học sinh.
  // Dùng CSPRNG (randomBytes) nên không dự đoán được; không lưu plaintext.
  const min = 100000;
  const range = 900000; // 100000..999999
  const randomValue = randomBytes(4).readUInt32BE(0);
  return String(min + (randomValue % range));
}

export function studentInternalEmail(username: string) {
  const domain = (process.env.STUDENT_AUTH_EMAIL_DOMAIN || DEFAULT_STUDENT_AUTH_EMAIL_DOMAIN).trim().toLocaleLowerCase("en-US");
  if (!EMAIL_DOMAIN_PATTERN.test(domain) || domain.endsWith(".invalid")) {
    throw new Error("STUDENT_AUTH_EMAIL_DOMAIN cần là miền email thật, có thể phân giải DNS.");
  }
  const normalizedUsername = normalizeStudentUsername(username);
  if (normalizedUsername.length < 3) throw new Error("Tên đăng nhập học sinh chưa hợp lệ.");
  return `student-${normalizedUsername}@${domain}`;
}
export function studentUsernameRateLimitHash(username: string) {
  return createHash("sha256").update(`username:${normalizeStudentUsername(username)}`).digest("hex");
}

export function clientAddressRateLimitHash(ip: string) {
  // Không ghi IP thô xuống database.
  return createHash("sha256").update(`ip:${ip}`).digest("hex");
}
export async function provisionStudentAccount(
  admin: AdminClient,
  input: { fullName: string; className: string; birthDate?: string | null; studentId?: string; studentCode?: string | null },
) {
  const fullName = input.fullName.normalize("NFC").trim();
  const className = input.className.normalize("NFC").trim();
  const studentCode = typeof input.studentCode === "string" ? input.studentCode.normalize("NFC").trim().slice(0, 40) : "";
  let existing: { id: string; full_name: string; class_name: string; auth_user_id: string | null; username: string | null; login_email: string | null; is_active?: boolean } | null = null;

  if (input.studentId) {
    const { data: activeData, error: activeError } = await admin.from("students")
      .select("id,full_name,class_name,auth_user_id,username,login_email,is_active")
      .eq("id", input.studentId).maybeSingle();
    let data = activeData;
    let error = activeError;
    if (error?.code === "42703" || error?.code === "PGRST204") {
      const legacyResult = await admin.from("students")
        .select("id,full_name,class_name,auth_user_id,username,login_email")
        .eq("id", input.studentId).maybeSingle();
      data = legacyResult.data ? { ...legacyResult.data, is_active: true } : null;
      error = legacyResult.error;
    }
    if (error) throw new Error("Không đọc được hồ sơ học sinh.");
    if (!data) throw new Error("Không tìm thấy hồ sơ học sinh.");
    if (data.is_active === false) throw new Error("Học sinh này đã được lưu trữ. Hãy khôi phục hồ sơ trước khi cấp tài khoản.");
    existing = data;
    if (existing.auth_user_id) {
      const username = existing.username || studentUsernameBase(existing.full_name);
      const password = generateTemporaryStudentPassword(existing.full_name);
      const { error: profileError } = await admin.from("profiles").update({ must_change_password: true }).eq("id", existing.auth_user_id);
      if (profileError) throw new Error("Không bật được yêu cầu đổi mật khẩu lần đầu.");
      const { error: resetError } = await admin.auth.admin.updateUserById(existing.auth_user_id, { password, user_metadata: { full_name: existing.full_name, must_change_password: true } });
      if (resetError) {
        await admin.from("profiles").update({ must_change_password: false }).eq("id", existing.auth_user_id);
        throw new Error("Không đặt lại được mật khẩu tài khoản.");
      }
      return { id: existing.id, full_name: existing.full_name, class_name: existing.class_name, auth_user_id: existing.auth_user_id, username, password };
    }
  }

  const sourceName = existing?.full_name || fullName;
  const targetClass = existing?.class_name || className;
  const base = studentUsernameBase(sourceName);
  const adminClient = admin;
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const suffix = attempt === 0 ? "" : String(attempt + 1);
    const username = `${base.slice(0, MAX_USERNAME_LENGTH - suffix.length)}${suffix}`;
    const email = studentInternalEmail(username);
    let studentId = existing?.id || null;
    let createdUserId: string | null = null;

    if (!studentId) {
      const insertPayload: Record<string, unknown> = {
        full_name: sourceName,
        class_name: targetClass,
        birth_date: input.birthDate || null,
        username,
        login_email: email,
      };
      if (studentCode) insertPayload.student_code = studentCode;
      let { data: inserted, error: insertError } = await adminClient.from("students").insert(insertPayload).select("id").single();
      // Mục 8: nếu cột student_code chưa tồn tại (migration chưa áp), vẫn tạo được học sinh.
      if (insertError && (insertError.code === "42703" || insertError.code === "PGRST204") && "student_code" in insertPayload) {
        delete insertPayload.student_code;
        const retry = await adminClient.from("students").insert(insertPayload).select("id").single();
        inserted = retry.data;
        insertError = retry.error;
      }
      if (insertError) {
        if (insertError.code === "23505") { lastError = insertError; continue; }
        throw new Error("Không lưu được hồ sơ học sinh.");
      }
      studentId = inserted!.id;
    } else {
      const { error: reserveError } = await adminClient.from("students").update({ username, login_email: email, ...(studentCode ? { student_code: studentCode } : {}) }).eq("id", studentId);
      if (reserveError && (reserveError.code === "42703" || reserveError.code === "PGRST204")) {
        await adminClient.from("students").update({ username, login_email: email }).eq("id", studentId);
      } else if (reserveError) {
        if (reserveError.code === "23505") { lastError = reserveError; continue; }
        throw new Error("Không cập nhật được thông tin tài khoản học sinh.");
      }
    }

    const password = generateTemporaryStudentPassword(sourceName);
    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: sourceName, username, must_change_password: true },
    });
    if (createError || !created.user) {
      lastError = createError;
      if (studentId && !existing) await adminClient.from("students").delete().eq("id", studentId);
      if (/already|exists|registered|duplicate/i.test(createError?.message || "")) continue;
      throw new Error("Không tạo được tài khoản đăng nhập. Kiểm tra Auth hoặc cấu hình Supabase.");
    }
    createdUserId = created.user.id;

    const { error: profileError } = await adminClient.from("profiles").upsert({
      id: createdUserId,
      role: "student",
      full_name: sourceName,
      must_change_password: true,
    });
    const { data: linked, error: linkError } = await adminClient.from("students").update({
      auth_user_id: createdUserId,
      username,
      login_email: email,
    }).eq("id", studentId).is("auth_user_id", null).select("id").maybeSingle();

    if (profileError || linkError || !linked) {
      await adminClient.auth.admin.deleteUser(createdUserId);
      if (!existing) await adminClient.from("students").delete().eq("id", studentId);
      if (linkError?.code === "23505") { lastError = linkError; continue; }
      throw new Error("Không liên kết được tài khoản với hồ sơ học sinh.");
    }

    return { id: studentId, full_name: sourceName, class_name: targetClass, auth_user_id: createdUserId, username, password };
  }

  throw lastError instanceof Error ? lastError : new Error("Không tạo được tên đăng nhập duy nhất sau nhiều lần thử.");
}
