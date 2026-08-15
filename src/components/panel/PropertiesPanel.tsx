/**
 * Panel flotante de propiedades
 *
 * Se abre al seleccionar "Propiedades" desde el menú contextual.
 * Soporta habitaciones y fixtures (muebles, plantas, puertas, ventanas, escaleras).
 * Se puede arrastrar por la pantalla y se cierra con X o click fuera.
 */

"use client";

import { useRef, useEffect, useCallback } from "react";
import { usePanelStore } from "@/stores/panel.store";
import { useFloorsStore } from "@/stores/floors.store";
import { useFixtureStore } from "@/stores/fixtures.store";
import { getCatalogItem, calculateStairs } from "@/lib/fixtures-catalog";
import { X, GripHorizontal } from "lucide-react";
import { Fixture } from "@/types/plan";

export function PropertiesPanel() {
  const { isOpen, roomId, fixtureId, x, y, closePanel, setPosition } = usePanelStore();
  const { floors, activeFloorId, renameRoom, setRoomColor, updateRoomDimensions, setRoomSnap, setRoomWallWidth, setRoomEnclosed } = useFloorsStore();
  const { fixtures, updateFixture } = useFixtureStore();
  const panelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; panelX: number; panelY: number } | null>(null);

  const activeFloor = floors.find((f) => f.id === activeFloorId);
  const room = roomId ? activeFloor?.rooms.find((r) => r.id === roomId) : null;
  const fixture = fixtureId ? fixtures.find((f) => f.id === fixtureId) : null;

  // Cerrar al hacer click fuera del panel
  useEffect(() => {
    if (!isOpen) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        closePanel();
      }
    };

    // Delay para evitar cerrar inmediatamente desde el click derecho que lo abrió
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleMouseDown);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [isOpen, closePanel]);

  // Cerrar con Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePanel();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closePanel]);

  // Manejo de drag del panel
  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragRef.current = { startX: e.clientX, startY: e.clientY, panelX: x, panelY: y };

      const handleDragMove = (moveEvent: MouseEvent) => {
        if (!dragRef.current) return;
        const dx = moveEvent.clientX - dragRef.current.startX;
        const dy = moveEvent.clientY - dragRef.current.startY;
        setPosition(dragRef.current.panelX + dx, dragRef.current.panelY + dy);
      };

      const handleDragEnd = () => {
        dragRef.current = null;
        document.removeEventListener("mousemove", handleDragMove);
        document.removeEventListener("mouseup", handleDragEnd);
      };

      document.addEventListener("mousemove", handleDragMove);
      document.addEventListener("mouseup", handleDragEnd);
    },
    [x, y, setPosition]
  );

  if (!isOpen || (!room && !fixture)) return null;

  const isFixture = !!fixture;

  return (
    <div
      ref={panelRef}
      className="fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col"
      style={{ left: x, top: y, width: 320, maxHeight: "80vh" }}
      role="dialog"
      aria-label={`Propiedades de ${isFixture ? fixture!.label : room!.label}`}
    >
      {/* Header — draggable */}
      <div
        onMouseDown={handleDragStart}
        className="flex items-center justify-between px-4 py-3 border-b border-gray-100 cursor-grab active:cursor-grabbing rounded-t-xl bg-gray-50"
      >
        <div className="flex items-center gap-2">
          <GripHorizontal size={14} className="text-gray-400" aria-hidden="true" />
          <span className="text-sm font-semibold text-gray-800">Propiedades</span>
          <span className="text-[10px] text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded">
            {isFixture ? "Fixture" : "Habitación"}
          </span>
        </div>
        <button
          onClick={closePanel}
          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors"
          aria-label="Cerrar panel de propiedades"
        >
          <X size={16} />
        </button>
      </div>

      {/* Contenido */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        {isFixture && fixture ? (
          <FixtureProperties fixture={fixture} updateFixture={updateFixture} />
        ) : room ? (
          <RoomProperties
            room={room}
            renameRoom={renameRoom}
            setRoomColor={setRoomColor}
            updateRoomDimensions={updateRoomDimensions}
            setRoomSnap={setRoomSnap}
            setRoomWallWidth={setRoomWallWidth}
            setRoomEnclosed={setRoomEnclosed}
          />
        ) : null}
      </div>
    </div>
  );
}

// ==================== Propiedades de Fixture ====================

function FixtureProperties({
  fixture,
  updateFixture,
}: {
  fixture: Fixture;
  updateFixture: (id: string, updates: Record<string, unknown>) => void;
}) {
  const catalogItem = getCatalogItem(fixture.catalogId);

  return (
    <>
      {/* Nombre */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-500">Nombre</label>
        <input
          type="text"
          value={fixture.label}
          onChange={(e) => updateFixture(fixture.id, { label: e.target.value })}
          className="w-full text-sm text-gray-900 border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Tipo */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-500">Tipo</label>
        <div className="text-sm text-gray-700 bg-gray-50 rounded-md px-3 py-1.5 border border-gray-200 flex items-center gap-2">
          <span>{catalogItem?.icon}</span>
          <span>{catalogItem?.label ?? fixture.catalogId}</span>
        </div>
      </div>

      {/* Dimensiones — solo editable para fixtures que no son escalera */}
      {fixture.category !== "stair" && (
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500">Dimensiones (cm)</label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-gray-400">Ancho</label>
              <input
                type="number"
                value={fixture.width}
                min={5}
                onChange={(e) => updateFixture(fixture.id, { width: parseInt(e.target.value) || 5 })}
                className="w-full text-sm text-gray-900 border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-400">Alto</label>
              <input
                type="number"
                value={fixture.height}
                min={5}
                onChange={(e) => updateFixture(fixture.id, { height: parseInt(e.target.value) || 5 })}
                className="w-full text-sm text-gray-900 border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Posición */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-500">Posición (cm)</label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-gray-400">X</label>
            <div className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-md px-2 py-1">
              {Math.round(fixture.x)}
            </div>
          </div>
          <div>
            <label className="text-[10px] text-gray-400">Y</label>
            <div className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-md px-2 py-1">
              {Math.round(fixture.y)}
            </div>
          </div>
        </div>
      </div>

      {/* Rotación */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-500">Rotación</label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={360}
            step={15}
            value={fixture.rotation}
            onChange={(e) => updateFixture(fixture.id, { rotation: parseInt(e.target.value) })}
            className="flex-1"
          />
          <span className="text-xs text-gray-600 w-10 text-right">{fixture.rotation}°</span>
        </div>
      </div>

      {/* Color */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-500">Color</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={fixture.color}
            onChange={(e) => updateFixture(fixture.id, { color: e.target.value })}
            className="h-8 w-10 rounded border border-gray-300 cursor-pointer"
          />
          <span className="text-xs text-gray-500 font-mono">{fixture.color}</span>
        </div>
      </div>

      {/* Propiedades de apertura — puertas y ventanas */}
      {(fixture.category === "door" || fixture.category === "window") && (
        <OpeningFixtureProperties fixture={fixture} updateFixture={updateFixture} />
      )}

      {/* Propiedades de escaleras */}
      {fixture.category === "stair" && (
        <StairProperties fixture={fixture} updateFixture={updateFixture} />
      )}

      {/* Eliminar */}
      <button
        onClick={() => {
          useFixtureStore.getState().removeFixture(fixture.id);
          usePanelStore.getState().closePanel();
        }}
        className="w-full px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded-md hover:bg-red-100 transition-colors text-sm"
      >
        Eliminar fixture
      </button>
    </>
  );
}

// ==================== Propiedades de apertura (puertas/ventanas) ====================

function OpeningFixtureProperties({
  fixture,
  updateFixture,
}: {
  fixture: Fixture;
  updateFixture: (id: string, updates: Record<string, unknown>) => void;
}) {
  const updateProp = (key: string, value: number | string | boolean) => {
    updateFixture(fixture.id, { props: { ...fixture.props, [key]: value } });
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-gray-500">Propiedades de apertura</label>

      {/* Abierta/Cerrada */}
      <button
        onClick={() => updateProp("isOpen", !(fixture.props.isOpen !== false))}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-md border transition-colors ${
          fixture.props.isOpen !== false
            ? "bg-blue-50 border-blue-200 text-blue-700"
            : "bg-gray-50 border-gray-200 text-gray-500"
        }`}
        role="switch"
        aria-checked={fixture.props.isOpen !== false}
      >
        <span className="text-sm">{fixture.props.isOpen !== false ? "Abierta" : "Cerrada"}</span>
        <div className={`w-9 h-5 rounded-full transition-colors relative ${fixture.props.isOpen !== false ? "bg-blue-500" : "bg-gray-300"}`}>
          <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${fixture.props.isOpen !== false ? "translate-x-4" : "translate-x-0.5"}`} />
        </div>
      </button>

      {/* Controles de ángulo/lado — solo si está abierta */}
      {fixture.props.isOpen !== false && (
        <>
          {/* Ángulo de apertura */}
      <div className="space-y-1">
        <label className="text-[10px] text-gray-400">Ángulo de apertura</label>
        <select
          value={(fixture.props.openingAngle as number) ?? 90}
          onChange={(e) => updateProp("openingAngle", parseInt(e.target.value))}
          className="w-full text-sm text-gray-900 border border-gray-300 rounded-md px-2 py-1"
        >
          <option value={45}>45°</option>
          <option value={90}>90°</option>
          <option value={135}>135°</option>
        </select>
      </div>

      {/* Lado de apertura */}
      <div className="space-y-1">
        <label className="text-[10px] text-gray-400">Lado de apertura</label>
        <select
          value={(fixture.props.openingSide as string) ?? "right"}
          onChange={(e) => updateProp("openingSide", e.target.value)}
          className="w-full text-sm text-gray-900 border border-gray-300 rounded-md px-2 py-1"
        >
          <option value="right">Derecha</option>
          <option value="left">Izquierda</option>
        </select>
      </div>
        </>
      )}

      {/* Corrediza */}
      {fixture.props.sliding !== undefined && (
        <button
          onClick={() => updateProp("sliding", !fixture.props.sliding)}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-md border transition-colors ${
            fixture.props.sliding
              ? "bg-blue-50 border-blue-200 text-blue-700"
              : "bg-gray-50 border-gray-200 text-gray-500"
          }`}
          role="switch"
          aria-checked={!!fixture.props.sliding}
        >
          <span className="text-sm">Corrediza</span>
          <div className={`w-9 h-5 rounded-full transition-colors relative ${fixture.props.sliding ? "bg-blue-500" : "bg-gray-300"}`}>
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${fixture.props.sliding ? "translate-x-4" : "translate-x-0.5"}`} />
          </div>
        </button>
      )}
    </div>
  );
}

// ==================== Propiedades de escalera ====================

function StairProperties({
  fixture,
  updateFixture,
}: {
  fixture: Fixture;
  updateFixture: (id: string, updates: Record<string, unknown>) => void;
}) {
  const stepHeight = (fixture.props.stepHeight as number) ?? 18;
  const stepWidth = (fixture.props.stepWidth as number) ?? 28;
  const stairWidth = (fixture.props.stairWidth as number) ?? 90;
  const floorHeight = (fixture.props.floorHeight as number) ?? 280;
  const flights = (fixture.props.flights as number) ?? 1;
  const landingWidth = (fixture.props.landingWidth as number) ?? 90;
  const separation = (fixture.props.separation as number) ?? 10;

  const calc = calculateStairs(floorHeight, stepHeight, stepWidth, flights, stairWidth, separation, landingWidth);

  const updateProp = (key: string, value: number | boolean) => {
    const newProps = { ...fixture.props, [key]: value };

    // Recalcular dimensiones del fixture
    const newStepHeight = (newProps.stepHeight as number) ?? stepHeight;
    const newStepWidth = (newProps.stepWidth as number) ?? stepWidth;
    const newStairWidth = (newProps.stairWidth as number) ?? stairWidth;
    const newFlights = (newProps.flights as number) ?? flights;
    const newFloorHeight = (newProps.floorHeight as number) ?? floorHeight;
    const newLandingWidth = (newProps.landingWidth as number) ?? landingWidth;
    const newSeparation = (newProps.separation as number) ?? separation;

    const totalSteps = Math.ceil(newFloorHeight / newStepHeight);
    const stepsPerFlight = newFlights === 1 ? totalSteps : Math.ceil(totalSteps / 2);
    const totalRun = stepsPerFlight * newStepWidth;

    // Ancho = ancho de tramo × 2 + separación (tramos paralelos lado a lado)
    const calculatedWidth = newFlights === 2 ? newStairWidth * 2 + newSeparation : newStairWidth;
    // Alto = desarrollo horizontal total + descanso
    const calculatedHeight = totalRun + newLandingWidth;

    updateFixture(fixture.id, {
      width: calculatedWidth,
      height: calculatedHeight,
      props: newProps,
    });
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-gray-500">Propiedades de escalera</label>

      {/* Altura de planta */}
      <div className="space-y-1">
        <label className="text-[10px] text-gray-400">Altura de planta (cm)</label>
        <input
          type="number"
          value={floorHeight}
          min={200}
          max={400}
          onChange={(e) => updateProp("floorHeight", parseInt(e.target.value) || 280)}
          className="w-full text-sm text-gray-900 border border-gray-300 rounded-md px-2 py-1"
        />
      </div>

      {/* Cantidad de tramos */}
      <div className="space-y-1">
        <label className="text-[10px] text-gray-400">Tramos</label>
        <select
          value={flights}
          onChange={(e) => updateProp("flights", parseInt(e.target.value))}
          className="w-full text-sm text-gray-900 border border-gray-300 rounded-md px-2 py-1"
        >
          <option value={1}>Tramo único</option>
          <option value={2}>Dos tramos con descanso</option>
        </select>
      </div>

      {/* Ancho de escalera */}
      <div className="space-y-1">
        <label className="text-[10px] text-gray-400">Ancho de escalera (cm)</label>
        <input
          type="number"
          value={stairWidth}
          min={60}
          max={150}
          onChange={(e) => updateProp("stairWidth", parseInt(e.target.value) || 90)}
          className="w-full text-sm text-gray-900 border border-gray-300 rounded-md px-2 py-1"
        />
      </div>

      {/* Dimensiones calculadas */}
      <div className="space-y-1">
        <label className="text-[10px] text-gray-400">Dimensiones calculadas</label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-gray-400">Ancho</label>
            <div className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-md px-2 py-1 font-mono">
              {calc.calculatedWidth} cm
            </div>
          </div>
          <div>
            <label className="text-[10px] text-gray-400">Largo</label>
            <div className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-md px-2 py-1 font-mono">
              {calc.calculatedHeight} cm
            </div>
          </div>
        </div>
        <div className="text-[10px] text-gray-400">
          = {((calc.calculatedWidth * calc.calculatedHeight) / 10000).toFixed(1)} m²
        </div>
      </div>

      {/* Altura de escalón */}
      <div className="space-y-1">
        <label className="text-[10px] text-gray-400">Altura de escalón (cm)</label>
        <input
          type="number"
          value={stepHeight}
          min={10}
          max={30}
          onChange={(e) => updateProp("stepHeight", parseInt(e.target.value) || 18)}
          className="w-full text-sm text-gray-900 border border-gray-300 rounded-md px-2 py-1"
        />
      </div>

      {/* Ancho de escalón (huella) */}
      <div className="space-y-1">
        <label className="text-[10px] text-gray-400">Ancho de escalón / huella (cm)</label>
        <input
          type="number"
          value={stepWidth}
          min={20}
          max={40}
          onChange={(e) => updateProp("stepWidth", parseInt(e.target.value) || 28)}
          className="w-full text-sm text-gray-900 border border-gray-300 rounded-md px-2 py-1"
        />
      </div>

      {/* Descanso */}
      <div className="space-y-1">
        <label className="text-[10px] text-gray-400">Ancho descanso (cm)</label>
        <input
          type="number"
          value={landingWidth}
          min={60}
          max={150}
          onChange={(e) => updateProp("landingWidth", parseInt(e.target.value) || 90)}
          className="w-full text-sm text-gray-900 border border-gray-300 rounded-md px-2 py-1"
        />
      </div>

      {/* Separación entre tramos (solo 2 tramos) */}
      {flights === 2 && (
        <div className="space-y-1">
          <label className="text-[10px] text-gray-400">Separación entre tramos (cm)</label>
          <input
            type="number"
            value={separation}
            min={0}
            max={50}
            onChange={(e) => updateProp("separation", parseInt(e.target.value) || 0)}
            className="w-full text-sm text-gray-900 border border-gray-300 rounded-md px-2 py-1"
          />
          <div className="text-[10px] text-gray-400">
            Hueco entre final del primer tramo e inicio del segundo
          </div>
        </div>
      )}

      {/* Cálculo IRAM */}
      <div className={`p-3 rounded-md border ${calc.isCompliant ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm">{calc.isCompliant ? "✅" : "⚠️"}</span>
          <span className="text-xs font-semibold text-gray-700">Cálculo IRAM</span>
        </div>

        <div className="space-y-1 text-[11px] text-gray-600">
          <div className="flex justify-between">
            <span>Fórmula (2h + w):</span>
            <span className={`font-mono ${calc.isCompliant ? "text-green-700" : "text-amber-700"}`}>
              2×{stepHeight} + {stepWidth} = {calc.formulaResult} cm
            </span>
          </div>
          <div className="flex justify-between">
            <span>Rango ideal:</span>
            <span className="font-mono">60–64 cm</span>
          </div>
          <div className="flex justify-between">
            <span>Cantidad de escalones:</span>
            <span className="font-mono">{calc.totalSteps} ({flights === 1 ? "1 tramo" : `${Math.ceil(calc.totalSteps / 2)} × 2 tramos`})</span>
          </div>
          <div className="flex justify-between">
            <span>Desarrollo horizontal:</span>
            <span className="font-mono">{calc.totalRun} cm</span>
          </div>
        </div>

        {calc.recommendation && (
          <p className="mt-2 text-[10px] text-amber-700 font-medium">
            {calc.recommendation}
          </p>
        )}
      </div>
    </div>
  );
}

// ==================== Propiedades de Habitación ====================

function RoomProperties({
  room,
  renameRoom,
  setRoomColor,
  updateRoomDimensions,
  setRoomSnap,
  setRoomWallWidth,
  setRoomEnclosed,
}: {
  room: { id: string; label: string; type: string; width: number; height: number; x: number; y: number; color?: string; snapEnabled?: boolean; wallWidth?: number; enclosed?: boolean };
  renameRoom: (id: string, label: string) => void;
  setRoomColor: (id: string, color: string) => void;
  updateRoomDimensions: (id: string, width: number, height: number) => void;
  setRoomSnap: (id: string, enabled: boolean) => void;
  setRoomWallWidth: (id: string, width: number) => void;
  setRoomEnclosed: (id: string, enclosed: boolean) => void;
}) {
  return (
    <>
      {/* Nombre */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-500">Nombre</label>
        <input
          type="text"
          value={room.label}
          onChange={(e) => renameRoom(room.id, e.target.value)}
          className="w-full text-sm text-gray-900 border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Tipo */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-500">Tipo</label>
        <div className="text-sm text-gray-700 bg-gray-50 rounded-md px-3 py-1.5 border border-gray-200">
          {room.type}
        </div>
      </div>

      {/* Dimensiones */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-500">Dimensiones (cm)</label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-gray-400">Ancho</label>
            <input
              type="number"
              value={room.width}
              min={50}
              onChange={(e) => {
                const w = parseInt(e.target.value) || 50;
                updateRoomDimensions(room.id, w, room.height);
              }}
              className="w-full text-sm text-gray-900 border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-400">Alto</label>
            <input
              type="number"
              value={room.height}
              min={50}
              onChange={(e) => {
                const h = parseInt(e.target.value) || 50;
                updateRoomDimensions(room.id, room.width, h);
              }}
              className="w-full text-sm text-gray-900 border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="text-xs text-gray-400">
          = {((room.width * room.height) / 10000).toFixed(1)} m²
        </div>
      </div>

      {/* Posición */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-500">Posición (cm)</label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-gray-400">X</label>
            <div className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-md px-2 py-1">
              {Math.round(room.x)}
            </div>
          </div>
          <div>
            <label className="text-[10px] text-gray-400">Y</label>
            <div className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-md px-2 py-1">
              {Math.round(room.y)}
            </div>
          </div>
        </div>
      </div>

      {/* Color */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-500">Color</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={room.color || "#e8f4e8"}
            onChange={(e) => setRoomColor(room.id, e.target.value)}
            className="h-8 w-10 rounded border border-gray-300 cursor-pointer"
            aria-label="Color de la habitación"
          />
          <span className="text-xs text-gray-500 font-mono">{room.color || "#e8f4e8"}</span>
        </div>
      </div>

      {/* Magnetismo */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-500">Magnetismo</label>
        <button
          onClick={() => setRoomSnap(room.id, room.snapEnabled === false)}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-md border transition-colors ${
            room.snapEnabled !== false
              ? "bg-blue-50 border-blue-200 text-blue-700"
              : "bg-gray-50 border-gray-200 text-gray-500"
          }`}
          role="switch"
          aria-checked={room.snapEnabled !== false}
          aria-label={`Magnetismo ${room.snapEnabled !== false ? "activado" : "desactivado"} para ${room.label}`}
        >
          <span className="text-sm">
            {room.snapEnabled !== false ? "Activado" : "Desactivado"}
          </span>
          <div
            className={`w-9 h-5 rounded-full transition-colors relative ${
              room.snapEnabled !== false ? "bg-blue-500" : "bg-gray-300"
            }`}
          >
            <div
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                room.snapEnabled !== false ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </div>
        </button>
        <p className="text-[10px] text-gray-400">
          Alineación magnética a bordes del terreno y otras habitaciones
        </p>
      </div>

      {/* Paredes */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-500">Paredes</label>

        {/* Enclosed toggle */}
        <button
          onClick={() => setRoomEnclosed(room.id, room.enclosed === false)}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-md border transition-colors ${
            room.enclosed !== false
              ? "bg-blue-50 border-blue-200 text-blue-700"
              : "bg-gray-50 border-gray-200 text-gray-500"
          }`}
          role="switch"
          aria-checked={room.enclosed !== false}
          aria-label={`Paredes ${room.enclosed !== false ? "encerradas" : "abiertas"} para ${room.label}`}
        >
          <span className="text-sm">
            {room.enclosed !== false ? "Encerrada (4 paredes)" : "Abierta"}
          </span>
          <div
            className={`w-9 h-5 rounded-full transition-colors relative ${
              room.enclosed !== false ? "bg-blue-500" : "bg-gray-300"
            }`}
          >
            <div
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                room.enclosed !== false ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </div>
        </button>

        {/* Wall width */}
        <div className="space-y-1">
          <label className="text-[10px] text-gray-400">Ancho de pared (cm)</label>
          <input
            type="number"
            value={room.wallWidth ?? 10}
            min={0}
            max={50}
            step={1}
            onChange={(e) => {
              const w = parseInt(e.target.value) || 0;
              setRoomWallWidth(room.id, Math.max(0, Math.min(50, w)));
            }}
            className="w-full text-sm text-gray-900 border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="text-[10px] text-gray-400">
            {(room.wallWidth ?? 10) > 0
              ? `= ${((room.wallWidth ?? 10) / 100).toFixed(2)}m`
              : "Sin paredes"}
          </div>
        </div>

        <p className="text-[10px] text-gray-400">
          Las paredes de habitaciones adyacentes se fusionan automáticamente
        </p>
      </div>
    </>
  );
}
