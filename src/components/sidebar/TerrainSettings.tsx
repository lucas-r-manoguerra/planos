"use client";

import { useState } from "react";
import { useTerrainStore } from "@/stores/rooms.store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_TERRAIN } from "@/lib/constants";
import { Terrain } from "@/types/plan";
import { MapPin } from "lucide-react";

export function TerrainSettings() {
  const { terrain, updateTerrain, setTerrainColor, setTerrainImage, setTerrainFront } = useTerrainStore();

  const [widthMeters, setWidthMeters] = useState(DEFAULT_TERRAIN.width / 100);
  const [heightMeters, setHeightMeters] = useState(DEFAULT_TERRAIN.height / 100);
  const [terrainColor, setTerrainColorLocal] = useState(terrain.color);

  const handleWidthChange = (value: string) => {
    const meters = parseFloat(value) || 0;
    setWidthMeters(meters);
    updateTerrain(meters * 100, heightMeters * 100);
  };

  const handleHeightChange = (value: string) => {
    const meters = parseFloat(value) || 0;
    setHeightMeters(meters);
    updateTerrain(widthMeters * 100, meters * 100);
  };

  const handleColorChange = (value: string) => {
    setTerrainColorLocal(value);
    setTerrainColor(value);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <MapPin size={14} className="text-gray-500" aria-hidden="true" />
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Terreno</h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="terrain-width">Ancho (m)</Label>
          <Input
            id="terrain-width"
            type="number"
            value={widthMeters}
            onChange={(e) => handleWidthChange(e.target.value)}
            min={1}
            step={0.5}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="terrain-height">Alto (m)</Label>
          <Input
            id="terrain-height"
            type="number"
            value={heightMeters}
            onChange={(e) => handleHeightChange(e.target.value)}
            min={1}
            step={0.5}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Color del Terreno</Label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={terrainColor}
            onChange={(e) => handleColorChange(e.target.value)}
            className="h-9 w-12 rounded-md border border-gray-300 cursor-pointer"
            aria-label="Color del terreno"
          />
          <span className="text-sm text-gray-600">{terrainColor}</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Textura (opcional)</Label>
        <input
          type="file"
          accept="image/*"
          aria-label="Subir textura del terreno"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = (event) => {
                setTerrainImage(event.target?.result as string);
              };
              reader.readAsDataURL(file);
            }
          }}
          className="w-full text-sm text-gray-600 file:mr-2 file:py-1 file:px-3 file:rounded file:border file:border-gray-300 file:text-sm file:bg-white file:cursor-pointer"
        />
      </div>

      <div className="space-y-2">
        <Label>Lado del Frente (Calle)</Label>
        <select
          value={terrain.front}
          onChange={(e) => setTerrainFront(e.target.value as Terrain["front"])}
          aria-label="Lado del frente (calle)"
          className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm text-gray-900 shadow-sm"
        >
          <option value="top">Arriba</option>
          <option value="bottom">Abajo</option>
          <option value="left">Izquierda</option>
          <option value="right">Derecha</option>
        </select>
      </div>
    </div>
  );
}
