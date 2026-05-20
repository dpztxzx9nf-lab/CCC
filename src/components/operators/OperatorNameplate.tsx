"use client";

interface OperatorNameplateProps {
  callsign: string;
  intensity?: "calm" | "steady" | "elevated";
  isTransit?: boolean;
}

export function OperatorNameplate({
  callsign,
  intensity = "calm",
  isTransit,
}: OperatorNameplateProps) {
  return (
    <span
      className={`ccc-nameplate ccc-nameplate--${intensity}${isTransit ? " ccc-nameplate--transit" : ""}`}
      aria-hidden
    >
      {callsign}
    </span>
  );
}
