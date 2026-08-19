/**
 * Hook that runs normative validation whenever relevant editor state changes.
 * Debounced at 300ms to avoid excessive recomputation during rapid edits.
 *
 * Connects: floors (rooms), walls, fixtures, terrain, columns → validateAll → validation store.
 */

"use client";

import { useEffect, useRef } from "react";
import { useValidationStore } from "@/stores/validation.store";
import { useTerrainStore } from "@/stores/terrain.store";
import { useFloorsStore } from "@/stores/floors.store";
import { useFixtureStore } from "@/stores/fixtures.store";
import { useStructuralStore } from "@/stores/structural.store";
import { validateAll } from "@/lib/normative-validation";

export function useValidation() {
  const setViolations = useValidationStore((s) => s.setViolations);
  const terrain = useTerrainStore((s) => s.terrain);
  const floors = useFloorsStore((s) => s.floors);
  const activeFloorId = useFloorsStore((s) => s.activeFloorId);
  const fixtures = useFixtureStore((s) => s.fixtures);
  const columns = useStructuralStore((s) => s.columns);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      const activeFloor = floors.find((f) => f.id === activeFloorId);
      const activeRooms = activeFloor?.rooms ?? [];

      const violations = validateAll({
        rooms: activeRooms,
        fixtures,
        terrain,
        columns,
        floors,
      });

      setViolations(violations);
    }, 300);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [terrain, floors, activeFloorId, fixtures, columns, setViolations]);
}
