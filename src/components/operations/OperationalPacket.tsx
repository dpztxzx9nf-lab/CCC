"use client";

import { useEffect, useState } from "react";

interface OperationalPacketProps {
  text: string;
  /** Unique key to re-trigger fade when text changes */
  packetKey: string;
  className?: string;
}

export function OperationalPacket({ text, packetKey, className = "" }: OperationalPacketProps) {
  const [visiblePacket, setVisiblePacket] = useState<{
    packetKey: string;
    text: string;
  } | null>(null);
  const visible =
    visiblePacket?.packetKey === packetKey && visiblePacket.text === text;

  useEffect(() => {
    const show = window.setTimeout(() => setVisiblePacket({ packetKey, text }), 40);
    const hide = window.setTimeout(() => setVisiblePacket(null), 4800);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
    };
  }, [packetKey, text]);

  if (!text) return null;

  return (
    <span
      className={`ccc-op-packet ${visible ? "ccc-op-packet--visible" : ""} ${className}`.trim()}
      aria-live="polite"
      aria-atomic="true"
    >
      {text}
    </span>
  );
}
