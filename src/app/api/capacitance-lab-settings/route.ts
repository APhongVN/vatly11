import { NextResponse } from "next/server";
import { authorizeApi } from "@/lib/api-security";
import { readBoundedRequestText } from "@/lib/read-bounded-request.mjs";
import {
  DEFAULT_CAPACITANCE_LAB_SETTINGS,
  capacitanceLabSettingsFromDatabase,
  capacitanceLabSettingsToDatabase,
  isValidCapacitanceLabSettings,
} from "@/lib/capacitance-lab-settings.mjs";

export async function GET() {
  const access = await authorizeApi(["teacher", "student"], 120, "capacitance-lab-settings");
  if ("response" in access) return access.response;
  const { data, error } = await access.supabase.from("capacitance_lab_settings").select("*").eq("id", 1).maybeSingle();
  if (error) return NextResponse.json({ error: "Chưa tải được cấu hình phòng thí nghiệm. Hãy áp dụng migration 20261031002300." }, { status: 503 });
  return NextResponse.json({ settings: capacitanceLabSettingsFromDatabase(data), storageReady: true, locked: false });
}

export async function POST(request: Request) {
  const access = await authorizeApi(["teacher"], 20, "capacitance-lab-settings");
  if ("response" in access) return access.response;
  try {
    const length = Number(request.headers.get("content-length") || 0);
    if (length > 4000) return NextResponse.json({ error: "Cấu hình vượt quá dung lượng." }, { status: 413 });
    const rawBody = await readBoundedRequestText(request, 4_000);
    const body = JSON.parse(rawBody) as { settings?: unknown };
    if (!isValidCapacitanceLabSettings(body.settings)) return NextResponse.json({ error: "Giá trị cấu hình không hợp lệ hoặc nằm ngoài giới hạn." }, { status: 400 });

    const { count, error: evidenceError } = await access.supabase.from("activity_evidence")
      .select("id", { count: "exact", head: true }).in("activity_id", [4, 8]);
    if (evidenceError) return NextResponse.json({ error: "Không kiểm tra được hồ sơ học sinh trước khi đổi cấu hình." }, { status: 503 });
    if ((count || 0) > 0) return NextResponse.json({ error: "Cấu hình đã khóa vì lớp đã có hồ sơ thí nghiệm. Hãy lưu bản xuất dữ liệu và tạo đợt học mới trước khi đổi miền." }, { status: 409 });

    const { data, error } = await access.supabase.from("capacitance_lab_settings")
      .upsert(capacitanceLabSettingsToDatabase(body.settings, access.user.id), { onConflict: "id" }).select("*").single();
    if (error || !data) return NextResponse.json({ error: "Không lưu được cấu hình. Hãy kiểm tra migration và quyền giáo viên." }, { status: 503 });
    return NextResponse.json({ settings: capacitanceLabSettingsFromDatabase(data), storageReady: true, locked: false });
  } catch (error) {
    const tooLarge = error instanceof Error && error.name === "RequestBodyTooLargeError";
    return NextResponse.json({ error: tooLarge ? "Cấu hình vượt quá dung lượng." : "Yêu cầu cấu hình không hợp lệ." }, { status: tooLarge ? 413 : 400 });
  }
}
