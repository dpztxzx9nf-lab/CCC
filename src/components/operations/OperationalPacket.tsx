"use client";

import { useEffect, useState } from "react";

interface OperationalPacketProps {
  text: string;
  /** Unique key to re-trigger fade when text changes */
  packetKey: string;
  className?: string;
}

export function OperationalPacket({ text, packetKey, className = "" }: OperationalPacketProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(false);
    const show = window.setTimeout(() => setVisible(true), 40);
    const hide = window.setTimeout(() => setVisible(false), 4800);
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
