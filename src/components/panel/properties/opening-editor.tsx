/**
 * Editor de propiedades de aperturas (puertas y ventanas)
 *
 * Campos comunes de fixture + propiedades de apertura: abierta/cerrada,
 * ángulo, lado de apertura y corrediza.
 */

"use client";

import { useFixtureStore } from "@/stores/fixtures.store";
import { FixtureCommonFields, FixtureDeleteButton } from "./fixture-fields";
import { Switch } from "@/components/ui/switch";
import type { Fixture } from "@/types/plan";

interface OpeningEditorProps {
  fixture: Fixture;
}

export function OpeningEditor({ fixture }: OpeningEditorProps) {
  const updateFixture = useFixtureStore((s) => s.updateFixture);

  const isOpen = fixture.props.isOpen !== false;
  const openingAngle = (fixture.props.openingAngle as number) ?? 90;
  const openingSide = (fixture.props.openingSide as string) ?? "right";
  const isSliding = !!fixture.props.sliding;

  const updateProp = (key: string, value: number | string | boolean) => {
    updateFixture(fixture.id, { props: { ...fixture.props, [key]: value } });
  };

  return (
    <>
      <FixtureCommonFields fixture={fixture} updateFixture={updateFixture} />

      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-500">
          Propiedades de apertura
        </label>

        {/* Abierta/Cerrada */}
        <div
          className={`flex items-center justify-between px-3 py-2 rounded-md border transition-colors ${
            isOpen
              ? "bg-blue-50 border-blue-200 text-blue-700"
              : "bg-gray-50 border-gray-200 text-gray-500"
          }`}
        >
          <span className="text-sm">{isOpen ? "Abierta" : "Cerrada"}</span>
          <Switch
            checked={isOpen}
            onCheckedChange={(checked) => updateProp("isOpen", checked)}
            label="Apertura abierta"
          />
        </div>

        {/* Controles de ángulo/lado — solo si está abierta */}
        {isOpen && (
          <>
            <div className="space-y-1">
              <label className="text-[10px] text-gray-400">Ángulo de apertura</label>
              <select
                value={openingAngle}
                onChange={(e) => updateProp("openingAngle", parseInt(e.target.value))}
                className="w-full text-sm text-gray-900 border border-gray-300 rounded-md px-2 py-1"
              >
                <option value={45}>45°</option>
                <option value={90}>90°</option>
                <option value={135}>135°</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-gray-400">Lado de apertura</label>
              <select
                value={openingSide}
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
          <div
            className={`flex items-center justify-between px-3 py-2 rounded-md border transition-colors ${
              isSliding
                ? "bg-blue-50 border-blue-200 text-blue-700"
                : "bg-gray-50 border-gray-200 text-gray-500"
            }`}
          >
            <span className="text-sm">Corrediza</span>
            <Switch
              checked={isSliding}
              onCheckedChange={(checked) => updateProp("sliding", checked)}
              label="Apertura corrediza"
            />
          </div>
        )}
      </div>

      <FixtureDeleteButton fixture={fixture} />
    </>
  );
}
