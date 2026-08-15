"use client";

import { useCallback, useRef } from "react";
import { useSunStore } from "@/stores/sun.store";
import { useTerrainStore } from "@/stores/rooms.store";
import { useHistoryStore } from "@/stores/history.store";
import { useCanvasColors } from "./canvas-colors";

const SIZE = 120;
const CENTER = SIZE / 2;
const ROSE_RADIUS = 42;

export function CompassOverlay() {
  const { enabled } = useSunStore();
  const { terrain, setTerrainAngle } = useTerrainStore();
  const { compassBg, compassStroke, textMuted } = useCanvasColors();
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const angle = terrain.northAngle ?? 0;

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    isDragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    useHistoryStore.getState().beginGesture();
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      // atan2(dx, -dy): 0° = arriba (Norte), sentido horario
      const newAngle = (Math.atan2(dx, -dy) * 180) / Math.PI;
      const normalized = ((newAngle % 360) + 360) % 360;
      setTerrainAngle(Math.round(normalized));
    },
    [setTerrainAngle],
  );

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
    useHistoryStore.getState().endGesture();
  }, []);

  if (!enabled) return null;

  // Líneas cardinales
  const cardinals = [
    { label: "N", color: "#e74c3c", bold: true },
    { label: "E", color: textMuted, bold: false },
    { label: "S", color: textMuted, bold: false },
    { label: "O", color: textMuted, bold: false },
  ];

  return (
    <div
      ref={containerRef}
      className="absolute bottom-14 right-4 select-none"
      style={{ width: SIZE, height: SIZE, zIndex: 50 }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`${-CENTER} ${-CENTER} ${SIZE} ${SIZE}`}
        style={{ cursor: "grab", touchAction: "none" }}
      >
        {/* Círculo de fondo */}
        <circle
          r={ROSE_RADIUS + 6}
          fill={compassBg}
          stroke={compassStroke}
          strokeWidth={1}
        />

        {/* Grupo rotado por northAngle */}
        <g transform={`rotate(${angle})`}>
          {/* Líneas de dirección */}
          {cardinals.map((d, i) => {
            const dirRad = (i * 90 * Math.PI) / 180;
            const innerR = 8;
            const outerR = d.bold ? ROSE_RADIUS : ROSE_RADIUS - 6;
            return (
              <line
                key={d.label}
                x1={Math.sin(dirRad) * innerR}
                y1={-Math.cos(dirRad) * innerR}
                x2={Math.sin(dirRad) * outerR}
                y2={-Math.cos(dirRad) * outerR}
                stroke={d.color}
                strokeWidth={d.bold ? 2.5 : 1.5}
              />
            );
          })}

          {/* Punta de flecha norte (triángulo rojo) */}
          <polygon
            points={`
              0,${-ROSE_RADIUS}
              -6,${-ROSE_RADIUS + 14}
              6,${-ROSE_RADIUS + 14}
            `}
            fill="#e74c3c"
          />
        </g>

        {/* Etiquetas fijas (NO rotan) */}
        {cardinals.map((d, i) => {
          const dirRad = ((angle + i * 90) * Math.PI) / 180;
          const labelR = ROSE_RADIUS + 14;
          const lx = Math.sin(dirRad) * labelR;
          const ly = -Math.cos(dirRad) * labelR;
          return (
            <text
              key={d.label}
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={11}
              fill={d.color}
              fontWeight={d.bold ? "bold" : "normal"}
            >
              {d.label}
            </text>
          );
        })}

        {/* Ángulo debajo */}
        <text
          x={0}
          y={ROSE_RADIUS + 18}
          textAnchor="middle"
          fontSize={10}
          fill={textMuted}
          fontFamily="monospace"
        >
          {angle}°
        </text>
      </svg>
    </div>
  );
}
