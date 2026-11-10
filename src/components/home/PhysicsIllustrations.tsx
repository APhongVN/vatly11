import React from "react";

/**
 * Hình vẽ SVG chủ đề Vật lí — tụ điện & điện trường.
 * Dùng SVG vẽ tay nên nẹp, sắc nét mọi kích thước, không cần tải ảnh ngoài.
 */
export function CapacitorDiagram({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 420 300"
      className={className}
      role="img"
      aria-label="Sơ đồ tụ điện: hai bản tụ và đường sức điện trường"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="plate" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#93c5fd" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
        <linearGradient id="fieldLine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.1" />
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Nền phát sáng */}
      <ellipse cx="210" cy="150" rx="180" ry="120" fill="url(#glow)" />

      {/* Đường sức điện trường giữa hai bản */}
      {[70, 105, 140, 175, 210, 245, 280].map((x) => (
        <g key={x}>
          <line x1={x} y1="96" x2={x} y2="204" stroke="url(#fieldLine)" strokeWidth="2" />
          <path d={`M ${x - 4} 100 L ${x} 92 L ${x + 4} 100`} fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" />
        </g>
      ))}

      {/* Mũi tên điện trường */}
      {[70, 140, 210, 280].map((x) => (
        <path key={`a-${x}`} d={`M ${x - 5} 150 L ${x} 140 L ${x + 5} 150 L ${x} 146 Z`} fill="#93c5fd" transform="translate(0,34)" />
      ))}

      {/* Bản tụ trái */}
      <rect x="52" y="60" width="16" height="180" rx="4" fill="url(#plate)" />
      {/* Bản tụ phải */}
      <rect x="352" y="60" width="16" height="180" rx="4" fill="url(#plate)" />

      {/* Điện tích trên bản */}
      {Array.from({ length: 9 }).map((_, i) => (
        <text key={`p-${i}`} x="30" y={76 + i * 18} fontSize="12" fill="#93c5fd" fontWeight="700">+</text>
      ))}
      {Array.from({ length: 9 }).map((_, i) => (
        <text key={`n-${i}`} x="386" y={76 + i * 18} fontSize="12" fill="#f87171" fontWeight="700">−</text>
      ))}

      {/* Nhãn */}
      <text x="46" y="262" fontSize="11" fill="#cbd5e1" fontWeight="600">Bản tụ +Q</text>
      <text x="330" y="262" fontSize="11" fill="#cbd5e1" fontWeight="600">Bản tụ −Q</text>
      <text x="170" y="288" fontSize="10" fill="#64748b">Đường sức điện trường</text>
    </svg>
  );
}

/** Sơ đồ mạch: nguồn – công tắc – tụ điện – bóng đèn. */
export function CircuitDiagram({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 420 220"
      className={className}
      role="img"
      aria-label="Mạch điện tích điện nguồn công tắc tụ điện bóng đèn"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="wire" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>

      {/* Dây dẫn */}
      <path d="M40 60 H150" stroke="url(#wire)" strokeWidth="3" fill="none" />
      <path d="M150 60 L190 30" stroke="#60a5fa" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M190 30 L240 60" stroke="#334155" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M240 60 H300" stroke="url(#wire)" strokeWidth="3" fill="none" />
      <path d="M300 60 V150" stroke="url(#wire)" strokeWidth="3" fill="none" />
      <path d="M300 150 H120" stroke="url(#wire)" strokeWidth="3" fill="none" />
      <path d="M120 150 V60" stroke="url(#wire)" strokeWidth="3" fill="none" />
      <path d="M120 60 H40" stroke="url(#wire)" strokeWidth="3" fill="none" />

      {/* Nguồn */}
      <rect x="20" y="40" width="26" height="42" rx="5" fill="#1e293b" stroke="#3b82f6" strokeWidth="1.5" />
      <text x="33" y="66" fontSize="16" fill="#93c5fd" textAnchor="middle" fontWeight="700">+</text>

      {/* Công tắc */}
      <circle cx="150" cy="60" r="4" fill="#93c5fd" />
      <circle cx="240" cy="60" r="4" fill="#93c5fd" />

      {/* Tụ điện */}
      <rect x="160" y="132" width="6" height="36" rx="1" fill="url(#wire)" />
      <rect x="234" y="132" width="6" height="36" rx="1" fill="url(#wire)" />
      <text x="200" y="188" fontSize="10" fill="#94a3b8" textAnchor="middle">C</text>

      {/* Bóng đèn */}
      <circle cx="300" cy="105" r="22" fill="none" stroke="#fbbf24" strokeWidth="2.5" />
      <path d="M288 117 L312 93 M288 93 L312 117" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
      <circle cx="300" cy="105" r="34" fill="#fbbf24" opacity="0.08" />
    </svg>
  );
}

/** Biểu tượng tụ điện thu nhỏ cho card tính năng. */
export function CapacitorIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <line x1="7" y1="3" x2="7" y2="21" />
      <line x1="17" y1="3" x2="17" y2="21" />
      <line x1="10" y1="8" x2="14" y2="8" strokeDasharray="2 2" />
      <line x1="10" y1="12" x2="14" y2="12" strokeDasharray="2 2" />
      <line x1="10" y1="16" x2="14" y2="16" strokeDasharray="2 2" />
    </svg>
  );
}
