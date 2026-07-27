/**
 * Formulario para agregar habitaciones
 *
 * Permite al usuario definir: nombre, tipo, ancho y alto de la habitación
 * La habitación se agrega al centro del terreno automáticamente
 */

"use client";

import { useState } from "react";
import { useFloorsStore } from "@/stores/floors.store";
import { RoomType } from "@/types/plan";
import { ROOM_TYPE_PRESETS } from "@/lib/constants";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";

export function RoomForm() {
  const { addRoom } = useFloorsStore();

  const [label, setLabel] = useState("");
  const [type, setType] = useState<RoomType>(RoomType.DORMITORIO);
  const [width, setWidth] = useState<number>(ROOM_TYPE_PRESETS[RoomType.DORMITORIO].width);
  const [height, setHeight] = useState<number>(ROOM_TYPE_PRESETS[RoomType.DORMITORIO].height);
  const [color, setColor] = useState("#e8f4e8");
  const [opacity, setOpacity] = useState(1);

  const handleTypeChange = (newType: RoomType) => {
    setType(newType);
    const preset = ROOM_TYPE_PRESETS[newType];
    setWidth(preset.width);
    setHeight(preset.height);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!label.trim()) return;

    addRoom({
      label: label.trim(),
      type,
      x: 0,
      y: 0,
      width,
      height,
      color,
      opacity,
    });

    setLabel("");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3" aria-label="Agregar habitación">
      <div className="flex items-center gap-2">
        <Plus size={14} className="text-gray-500" aria-hidden="true" />
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Agregar Habitación
        </h3>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="room-label">Nombre</Label>
        <Input
          id="room-label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Ej: Dormitorio 1"
          required
          aria-required="true"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="room-type">Tipo</Label>
        <Select value={type} onValueChange={(value) => handleTypeChange(value as RoomType)}>
          <SelectTrigger aria-label="Tipo de habitación">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.values(RoomType).map((roomType) => (
              <SelectItem key={roomType} value={roomType}>
                {roomType}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="room-width">Ancho (cm)</Label>
          <Input
            id="room-width"
            type="number"
            value={width}
            onChange={(e) => setWidth(parseInt(e.target.value) || 0)}
            min={50}
            aria-label="Ancho en centímetros"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="room-height">Alto (cm)</Label>
          <Input
            id="room-height"
            type="number"
            value={height}
            onChange={(e) => setHeight(parseInt(e.target.value) || 0)}
            min={50}
            aria-label="Alto en centímetros"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="room-color">Color</Label>
        <div className="flex items-center gap-2">
          <input
            id="room-color"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-9 w-12 rounded-md border border-gray-300 cursor-pointer"
            aria-label="Color de la habitación"
          />
          <span className="text-xs text-gray-500 font-mono">{color}</span>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="room-opacity">
          Opacidad: <span className="text-blue-600 font-semibold">{Math.round(opacity * 100)}%</span>
        </Label>
        <input
          id="room-opacity"
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={opacity}
          onChange={(e) => setOpacity(parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          aria-label={`Opacidad: ${Math.round(opacity * 100)}%`}
          aria-valuetext={`${Math.round(opacity * 100)}%`}
        />
      </div>

      <Button type="submit" className="w-full" aria-label="Agregar habitación al plano">
        <Plus size={14} className="mr-1" />
        Agregar
      </Button>
    </form>
  );
}
