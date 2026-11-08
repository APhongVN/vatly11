"use client";

import { useEffect, useState } from "react";
import { Send, Trash2 } from "lucide-react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { CHAT_ATTACHMENT_ACCEPT, chatAttachmentMimeType, isInlineChatImage, MAX_CHAT_ATTACHMENT_BYTES } from "@/lib/chat-attachments.mjs";

type TeacherChatTabProps = {
  previewMode: boolean;
  onPreviewNotice: (message: string) => void;
  getAvatar: (name: string | undefined) => string;
  formatTime: (isoString: string) => string;
  privateFileHref: (value: string) => string;
};

export default function TeacherChatTab({ previewMode, onPreviewNotice, getAvatar, formatTime, privateFileHref }: TeacherChatTabProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [chatFile, setChatFile] = useState<File | null>(null);
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [isChatMuted, setIsChatMuted] = useState(false);
  const [isDeletionBlocked, setIsDeletionBlocked] = useState(false);

  useEffect(() => {
    if (previewMode) {
      setMessages([
        { id: "preview-chat-1", sender_name: "Cô Hương Xuân (Giáo viên)", content: "Chào cả lớp, cô tạo kênh thảo luận này để các em hỏi bài và trao đổi về chủ đề Tụ điện.", created_at: new Date().toISOString() },
        { id: "preview-chat-2", sender_name: "Nguyễn Văn An", content: "Em không hiểu phần điện dung, cô giải thích thêm được không ạ?", created_at: new Date().toISOString() },
      ]);
      setIsChatMuted(false);
      setIsDeletionBlocked(false);
      return;
    }
    (async () => {
      const { data: msgs } = await supabase.from("messages").select("id, sender_name, content, attachment_url, attachment_name, attachment_type, created_at").order("created_at");
      if (msgs) setMessages([...msgs].reverse());
      const { data: setting } = await supabase.from("chat_settings").select("*").limit(1).maybeSingle();
      if (setting) {
        setIsChatMuted(setting.is_muted);
        setIsDeletionBlocked(Boolean((setting as any).deletion_blocked));
      }
    })();
  }, [previewMode]);

  const reload = async () => {
    if (previewMode) return;
    const { data: msgs } = await supabase.from("messages").select("id, sender_name, content, attachment_url, attachment_name, attachment_type, created_at").order("created_at");
    if (msgs) setMessages([...msgs].reverse());
    // Nạp lại thiết lập kênh để trạng thái khóa/mở cập nhật ngay, không cần tải lại trang.
    const { data: setting } = await supabase.from("chat_settings").select("*").limit(1).maybeSingle();
    if (setting) {
      setIsChatMuted(Boolean(setting.is_muted));
      setIsDeletionBlocked(Boolean((setting as any).deletion_blocked));
    }
  };

  const toggleMuted = async () => {
    if (previewMode) {
      const nextMuted = !isChatMuted;
      setIsChatMuted(nextMuted);
      onPreviewNotice(nextMuted ? "Đã khóa kênh chat mẫu trong phiên này." : "Đã mở khóa kênh chat mẫu trong phiên này.");
      return;
    }
    const nextMuted = !isChatMuted;
    setIsChatMuted(nextMuted);
    await supabase.from("chat_settings").update({ is_muted: nextMuted }).eq("id", 1);
    reload();
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMsg.trim() && !chatFile) || isSendingChat) return;
    if (previewMode) {
      setMessages((current) => [...current, { id: `preview-message-${Date.now()}`, sender_name: "Cô Hương Xuân (Giáo viên)", content: newMsg.trim(), attachment_name: chatFile?.name || null, attachment_type: chatFile?.type || null, created_at: new Date().toISOString() }]);
      setNewMsg(""); setChatFile(null);
      onPreviewNotice("Đã gửi tin nhắn vào kênh chat mẫu. Tệp chỉ hiển thị tên, không được tải lên máy chủ.");
      return;
    }
    setIsSendingChat(true);
    try {
      let attachment: Record<string, string> = {};
      if (chatFile) {
        if (chatFile.size > MAX_CHAT_ATTACHMENT_BYTES) throw new Error("Tệp chat tối đa 100 MB.");
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
        const contentType = chatAttachmentMimeType(chatFile);
        const safeName = chatFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `chat/${user.id}/${Date.now()}-${safeName}`;
        const { error: uploadError } = await supabase.storage.from("class-work").upload(path, chatFile, { upsert: false, contentType });
        if (uploadError) throw uploadError;
        attachment = { attachment_url: path, attachment_name: chatFile.name, attachment_type: contentType };
      }
      const { error } = await supabase.from("messages").insert([{ sender_name: "Cô Hương Xuân (Giáo viên)", content: newMsg.trim(), ...attachment }]);
      if (error) throw error;
      setNewMsg(""); setChatFile(null); await reload();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Không gửi được tin nhắn.");
    } finally { setIsSendingChat(false); }
  };

  const deleteMessage = async (message: any) => {
    if (previewMode) {
      setMessages((current) => current.filter((item) => item.id !== message.id));
      onPreviewNotice("Đã xóa tin nhắn khỏi kênh chat mẫu.");
      return;
    }
    if (!confirm("Xóa tin nhắn này khỏi kênh chat?")) return;
    const { error } = await supabase.from("messages").delete().eq("id", message.id);
    if (error) { alert("Không xóa được tin nhắn: " + error.message); return; }
    setMessages((current) => current.filter((item) => item.id !== message.id));
    if (message.attachment_url && !message.attachment_url.startsWith("http")) {
      const { error: fileError } = await supabase.storage.from("class-work").remove([message.attachment_url]);
      if (fileError) alert("Tin nhắn đã xóa, nhưng chưa dọn được tệp đính kèm: " + fileError.message);
    }
    await reload();
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 h-[80vh] flex flex-col max-w-4xl mx-auto overflow-hidden animate-in fade-in">
      <div className="p-4 border-b bg-slate-900 text-white flex justify-between items-center">
        <div>
          <h2 className="font-bold text-sm">Kênh thảo luận lớp học 11A1</h2>
          <p className="text-[11px] text-slate-400">Trao đổi giữa Giáo viên và Sinh viên</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={toggleMuted}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold text-white ${isChatMuted ? 'bg-emerald-600' : 'bg-amber-600'}`}
          >
            {isChatMuted ? "Mở khóa chat cho học sinh" : "Khóa chat học sinh"}
          </button>
        </div>
      </div>

      <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-50/50">
        {messages.map(m => {
          const isTeacher = m.sender_name?.includes('Cô') || m.sender_name?.includes('Giáo viên');
          return (
            <div key={m.id} className={`flex gap-3 group ${isTeacher ? 'flex-row-reverse' : ''}`}>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm ${isTeacher ? 'bg-blue-600' : 'bg-emerald-600'}`}>
                {getAvatar(m.sender_name)}
              </div>
              <div className={`flex flex-col ${isTeacher ? 'items-end' : 'items-start'} max-w-[70%]`}>
                <div className={`p-3.5 rounded-2xl text-xs shadow-sm ${isTeacher ? 'bg-blue-600 text-white' : 'bg-white border text-slate-800'}`}>
                  <p className={`font-bold text-[10px] mb-1 flex items-center gap-1 ${isTeacher ? 'text-blue-200' : 'text-slate-400'}`}>
                    <span>{m.sender_name}</span>
                    <span className="opacity-70">• {formatTime(m.created_at)}</span>
                  </p>
                  <p className="leading-relaxed">{m.content}</p>
                  {m.attachment_url && (isInlineChatImage(m.attachment_type) ? <a href={privateFileHref(m.attachment_url)} target="_blank" rel="noreferrer"><Image unoptimized width={800} height={600} src={privateFileHref(m.attachment_url)} alt={m.attachment_name || "Tệp ảnh"} className="mt-2 max-h-64 rounded-xl object-contain" /></a> : <a href={privateFileHref(m.attachment_url)} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold underline">📎 {m.attachment_name || "Tải tệp đính kèm"}</a>)}
                  {isTeacher && !isDeletionBlocked && <button onClick={() => deleteMessage(m)} className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold opacity-80 hover:opacity-100"><Trash2 className="h-3 w-3" /> Xóa tin nhắn</button>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={sendMessage} className="p-4 border-t bg-white flex gap-2">
        <input type="file" accept={CHAT_ATTACHMENT_ACCEPT} onChange={(e) => setChatFile(e.target.files?.[0] || null)} className="max-w-32 text-[10px]" aria-label="Đính kèm tệp hoặc ảnh" /><input value={newMsg} onChange={e => setNewMsg(e.target.value)} placeholder="Nhập tin nhắn hướng dẫn học sinh..." className="flex-1 border p-3 rounded-xl text-xs outline-none bg-slate-50/50" /><button type="button" onClick={() => setChatFile(null)} className="text-xs">{chatFile?.name || ""}</button>
        <button type="submit" disabled={isSendingChat || (!newMsg.trim() && !chatFile)} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 rounded-xl text-xs font-bold flex items-center gap-1.5">
          <Send className="w-4 h-4"/> Gửi
        </button>
      </form>
    </div>
  );
}