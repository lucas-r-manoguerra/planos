/**
 * Sección de configuración de simulación solar en el sidebar
 *
 * Controles: activar/desactivar, fecha, hora, orientación del norte,
 * ubicación geográfica, altura de piso e información de posición solar.
 */

"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Sun } from "lucide-react";
import { useSunStore } from "@/stores/sun.store";
import { useTerrainStore } from "@/stores/rooms.store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SunSettings() {
  const [isOpen, setIsOpen] = useState(true);

  const {
    enabled,
    date,
    time,
    location,
    floorHeight,
    setEnabled,
    setDate,
    setTime,
    setLocation,
    setFloorHeight,
    getSunPosition,
    getSunriseTime: getRise,
    getSunsetTime: getSet,
  } = useSunStore();

  const { terrain, setTerrainNorth } = useTerrainStore();

  const sunPos = enabled ? getSunPosition() : null;
  const sunrise = enabled ? getRise() : null;
  const sunset = enabled ? getSet() : null;

  const formatTime = (decimal: number) => {
    const h = Math.floor(decimal);
    const m = Math.round((decimal - h) * 60);
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full text-left"
        aria-expanded={isOpen}
      >
        {isOpen ? (
          <ChevronDown size={14} className="text-gray-400" />
        ) : (
          <ChevronRight size={14} className="text-gray-400" />
        )}
        <Sun size={14} className="text-amber-500" aria-hidden="true" />
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Simulación Solar
        </h3>
      </button>

      {isOpen && (
        <div className="space-y-4">
          {/* Botón activar/desactivar */}
          <button
            onClick={() => setEnabled(!enabled)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-md border transition-colors ${
              enabled
                ? "bg-amber-50 border-amber-200 text-amber-700"
                : "bg-gray-50 border-gray-200 text-gray-500"
            }`}
          >
            <span className="text-sm">{enabled ? "Activo" : "Inactivo"}</span>
            <div
              className={`w-9 h-5 rounded-full transition-colors relative ${
                enabled ? "bg-amber-500" : "bg-gray-300"
              }`}
            >
              <div
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                  enabled ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </div>
          </button>

          {enabled && (
            <>
              {/* Orientación del norte */}
              <div className="space-y-1">
                <Label>Orientación del Norte</Label>
                <select
                  value={terrain.northAt ?? "top"}
                  onChange={(e) =>
                    setTerrainNorth(
                      e.target.value as "top" | "bottom" | "left" | "right"
                    )
                  }
                  className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm text-gray-900 shadow-sm transition-colors"
                  aria-label="Orientación del norte"
                >
                  <option value="top">↑ Arriba (Norte hacia arriba)</option>
                  <option value="right">→ Derecha</option>
                  <option value="bottom">↓ Abajo</option>
                  <option value="left">← Izquierda</option>
                </select>
              </div>

              {/* Fecha */}
              <div className="space-y-1">
                <Label htmlFor="sun-date">Fecha</Label>
                <Input
                  id="sun-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              {/* Slider de hora */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <Label>Hora</Label>
                  <span className="text-xs font-mono text-gray-600">
                    {formatTime(time)}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={24}
                  step={0.0833} // Pasos de 5 minutos
                  value={time}
                  onChange={(e) => setTime(parseFloat(e.target.value))}
                  className="w-full accent-amber-500"
                  aria-label="Hora del día"
                />
                <div className="flex justify-between text-[10px] text-gray-400">
                  <span>00:00</span>
                  <span>12:00</span>
                  <span>23:59</span>
                </div>
              </div>

              {/* Amanecer / Atardecer */}
              {sunrise !== null && sunset !== null && (
                <div className="flex gap-4 text-[10px] text-gray-500">
                  <span>🌅 {formatTime(sunrise)}</span>
                  <span>🌇 {formatTime(sunset)}</span>
                </div>
              )}

              {/* Altura de piso */}
              <div className="space-y-1">
                <Label htmlFor="floor-height">Altura de piso (cm)</Label>
                <Input
                  id="floor-height"
                  type="number"
                  value={floorHeight}
                  min={200}
                  max={500}
                  step={5}
                  onChange={(e) =>
                    setFloorHeight(parseInt(e.target.value) || 280)
                  }
                />
                <div className="text-[10px] text-gray-400">
                  = {(floorHeight / 100).toFixed(2)}m
                </div>
              </div>

              {/* Info de posición solar */}
              {sunPos && (
                <div className="bg-amber-50 rounded-md p-2 text-[10px] text-amber-700 space-y-0.5">
                  <div>Azimuth: {sunPos.azimuth.toFixed(1)}°</div>
                  <div>Elevación: {sunPos.elevation.toFixed(1)}°</div>
                </div>
              )}

              {/* Ubicación geográfica */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="sun-lat">Latitud</Label>
                  <Input
                    id="sun-lat"
                    type="number"
                    value={location.latitude}
                    step={0.01}
                    onChange={(e) =>
                      setLocation({
                        ...location,
                        latitude: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="sun-lng">Longitud</Label>
                  <Input
                    id="sun-lng"
                    type="number"
                    value={location.longitude}
                    step={0.01}
                    onChange={(e) =>
                      setLocation({
                        ...location,
                        longitude: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>

              {/* Preset: Gualeguay */}
              <button
                onClick={() =>
                  setLocation({
                    latitude: -32.05,
                    longitude: -59.25,
                    timezone: "America/Argentina/Buenos_Aires",
                  })
                }
                className="w-full text-[10px] text-amber-600 hover:text-amber-800 text-left"
              >
                📍 Gualeguay, Entre Ríos (default)
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
