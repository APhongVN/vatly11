import { describe, expect, it } from "vitest";
import {
  CHAT_ATTACHMENT_ACCEPT,
  MAX_CHAT_ATTACHMENT_BYTES,
  chatAttachmentMimeType,
  isInlineChatImage,
} from "../src/lib/chat-attachments.mjs";

const fileWith = (name: string, type?: string) => ({ name, type });

describe("chatAttachmentMimeType", () => {
  it("prefers a declared MIME type and keeps an opaque octet-stream declaration", () => {
    expect(chatAttachmentMimeType(fileWith("a", "application/pdf"))).toBe("application/pdf");
    expect(chatAttachmentMimeType(fileWith("a", "application/octet-stream"))).toBe("application/octet-stream");
  });

  it("falls back to the file extension when the type is missing or opaque", () => {
    expect(chatAttachmentMimeType(fileWith("notes.md"))).toBe("text/markdown");
    expect(chatAttachmentMimeType(fileWith("photo.JPG"))).toBe("image/jpeg");
    expect(chatAttachmentMimeType(fileWith("data.bin", "application/octet-stream"))).toBe("application/octet-stream");
    expect(chatAttachmentMimeType(fileWith("unknown", undefined))).toBe("application/octet-stream");
  });
});

describe("isInlineChatImage", () => {
  it("accepts only the six inline-renderable image types", () => {
    for (const type of ["image/avif", "image/bmp", "image/gif", "image/jpeg", "image/png", "image/webp"]) {
      expect(isInlineChatImage(type)).toBe(true);
    }
    for (const type of ["image/heic", "image/tiff", "image/svg+xml", "", null, 42] as unknown[]) {
      expect(isInlineChatImage(type as unknown as string)).toBe(false);
    }
  });

  it("is case- and whitespace-insensitive", () => {
    expect(isInlineChatImage("  IMAGE/PNG ")).toBe(true);
  });
});

describe("constants", () => {
  it("keeps the 100 MB attachment cap and the accepted extension list intact", () => {
    expect(MAX_CHAT_ATTACHMENT_BYTES).toBe(100 * 1024 * 1024);
    const accepted = CHAT_ATTACHMENT_ACCEPT.split(",");
    expect(accepted).toContain(".docx");
    expect(accepted).toContain(".png");
  });
});
