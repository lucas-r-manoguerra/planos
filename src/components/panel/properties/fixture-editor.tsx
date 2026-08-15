/**
 * Editor de propiedades de fixture genérico (muebles, plantas, baño, vehículos)
 */

"use client";

import { useFixtureStore } from "@/stores/fixtures.store";
import { FixtureCommonFields, FixtureDeleteButton } from "./fixture-fields";
import type { Fixture } from "@/types/plan";

interface FixtureEditorProps {
  fixture: Fixture;
}

export function FixtureEditor({ fixture }: FixtureEditorProps) {
  const updateFixture = useFixtureStore((s) => s.updateFixture);

  return (
    <>
      <FixtureCommonFields fixture={fixture} updateFixture={updateFixture} />
      <FixtureDeleteButton fixture={fixture} />
    </>
  );
}
