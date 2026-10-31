"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  name?: string;
  size?: "sm" | "default" | "lg";
}

function Avatar({ className, src, name, size = "default", ...props }: AvatarProps) {
  const sizes = {
    sm: "size-8",
    default: "size-10",
    lg: "size-14",
  };

  const initials = name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const hue = name ? name.charCodeAt(0) % 360 : 200;
  const bgColor = `hsl(${hue}, 70%, 60%)`;

  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center rounded-full text-white font-medium overflow-hidden shadow-sm",
        sizes[size],
        className
      )}
      style={{ backgroundColor: bgColor }}
      {...props}
    >
      {src ? <Image unoptimized src={src} alt="" width={64} height={64} className="aspect-square h-full w-full object-cover" /> : initials}
    </div>
  );
}

export default Avatar;
