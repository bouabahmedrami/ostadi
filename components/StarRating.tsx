"use client";
import { useState } from "react";
import { Star } from "lucide-react";

interface StarPickerProps {
  value: number;
  onChange: (v: number) => void;
  size?: "sm" | "md" | "lg";
  readonly?: boolean;
}

export function StarPicker({ value, onChange, size = "md", readonly = false }: StarPickerProps) {
  const [hovered, setHovered] = useState(0);
  const sz = size === "sm" ? "w-4 h-4" : size === "lg" ? "w-8 h-8" : "w-6 h-6";
  const active = hovered || value;

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          disabled={readonly}
          onClick={() => !readonly && onChange(i)}
          onMouseEnter={() => !readonly && setHovered(i)}
          onMouseLeave={() => !readonly && setHovered(0)}
          className={`transition-transform ${!readonly ? "hover:scale-110 cursor-pointer" : "cursor-default"}`}
        >
          <Star
            className={`${sz} transition-colors ${
              i <= active
                ? "fill-[#FF8C00] text-[#FF8C00]"
                : "text-purple-700 fill-transparent"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export function StarDisplay({ rating, count, size = "sm" }: {
  rating?: number;
  count?: number;
  size?: "sm" | "md" | "lg";
}) {
  const r = rating || 0;
  const sz = size === "sm" ? "w-3.5 h-3.5" : size === "lg" ? "w-6 h-6" : "w-5 h-5";

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${sz} ${
            i <= Math.round(r)
              ? "fill-[#FF8C00] text-[#FF8C00]"
              : "text-purple-800 fill-transparent"
          }`}
        />
      ))}
      <span className={`${size === "sm" ? "text-xs" : "text-sm"} text-purple-400 ml-0.5`}>
        {r > 0 ? r.toFixed(1) : "Nouveau"}
        {count !== undefined && count > 0 && (
          <span className="text-purple-500"> ({count})</span>
        )}
      </span>
    </div>
  );
}
