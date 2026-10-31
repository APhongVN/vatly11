import { NextResponse } from "next/server";
import { authorizeApi } from "@/lib/api-security";

export async function GET(request: Request) {
  const access = await authorizeApi(["teacher", "student"], 120, "file-download");
  if ("response" in access) return access.response;

  const search = new URL(request.url).searchParams;
  const path = search.get("path") || "";
  const bucket = search.get("bucket") || "class-work";
  const validPath = bucket === "class-work"
    ? /^(chat|submissions|group-submissions)\/[\w-]+\/[\w. -]+$/.test(path)
    : bucket === "videos" && /^[\w./ -]+$/.test(path);
  if (!validPath || !path || path.length > 700 || path.startsWith("/") || path.includes("..")) {
    return NextResponse.json({ error: "Đường dẫn tệp không hợp lệ." }, { status: 400 });
  }

  const { data, error } = await access.supabase.storage.from(bucket).createSignedUrl(path, 600);
  if (error || !data?.signedUrl) return NextResponse.json({ error: "Không tìm thấy tệp hoặc bạn không có quyền tải." }, { status: 404 });
  return NextResponse.redirect(data.signedUrl, { status: 302 });
}
