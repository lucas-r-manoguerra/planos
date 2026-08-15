/**
 * Editor de propiedades de escaleras
 *
 * Campos comunes de fixture (sin dimensiones manuales: se calculan a partir
 * de los parámetros de tramo/escalón) + propiedades específicas de escalera
 * con verificación de cumplimiento IRAM.
 */

"use client";

import { useFixtureStore } from "@/stores/fixtures.store";
import { FixtureCommonFields, FixtureDeleteButton } from "./fixture-fields";
import { calculateStairs } from "@/lib/fixtures-catalog";
import type { Fixture } from "@/types/plan";

interface StairEditorProps {
  fixture: Fixture;
}

export function StairEditor({ fixture }: StairEditorProps) {
  const updateFixture = useFixtureStore((s) => s.updateFixture);

  const stepHeight = (fixture.props.stepHeight as number) ?? 18;
  const stepWidth = (fixture.props.stepWidth as number) ?? 28;
  const stairWidth = (fixture.props.stairWidth as number) ?? 90;
  const floorHeight = (fixture.props.floorHeight as number) ?? 280;
  const flights = (fixture.props.flights as number) ?? 1;
  const landingWidth = (fixture.props.landingWidth as number) ?? 90;
  const separation = (fixture.props.separation as number) ?? 10;

  const calc = calculateStairs(
    floorHeight,
    stepHeight,
    stepWidth,
    flights,
    stairWidth,
    separation,
    landingWidth
  );

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
    const stepsPerFlight =
      newFlights === 1 ? totalSteps : Math.ceil(totalSteps / 2);
    const totalRun = stepsPerFlight * newStepWidth;

    // Ancho = ancho de tramo × 2 + separación (tramos paralelos lado a lado)
    const calculatedWidth =
      newFlights === 2 ? newStairWidth * 2 + newSeparation : newStairWidth;
    // Alto = desarrollo horizontal total + descanso
    const calculatedHeight = totalRun + newLandingWidth;

    updateFixture(fixture.id, {
      width: calculatedWidth,
      height: calculatedHeight,
      props: newProps,
    });
  };

  return (
    <>
      <FixtureCommonFields fixture={fixture} updateFixture={updateFixture} />

      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-500">
          Propiedades de escalera
        </label>

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
        <div
          className={`p-3 rounded-md border ${
            calc.isCompliant
              ? "bg-green-50 border-green-200"
              : "bg-amber-50 border-amber-200"
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm">{calc.isCompliant ? "✅" : "⚠️"}</span>
            <span className="text-xs font-semibold text-gray-700">Cálculo IRAM</span>
          </div>

          <div className="space-y-1 text-[11px] text-gray-600">
            <div className="flex justify-between">
              <span>Fórmula (2h + w):</span>
              <span
                className={`font-mono ${
                  calc.isCompliant ? "text-green-700" : "text-amber-700"
                }`}
              >
                2×{stepHeight} + {stepWidth} = {calc.formulaResult} cm
              </span>
            </div>
            <div className="flex justify-between">
              <span>Rango ideal:</span>
              <span className="font-mono">60–64 cm</span>
            </div>
            <div className="flex justify-between">
              <span>Cantidad de escalones:</span>
              <span className="font-mono">
                {calc.totalSteps} (
                {flights === 1 ? "1 tramo" : `${Math.ceil(calc.totalSteps / 2)} × 2 tramos`})
              </span>
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

      <FixtureDeleteButton fixture={fixture} />
    </>
  );
}
