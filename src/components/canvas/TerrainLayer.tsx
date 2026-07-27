"use client";

import { Rect, Text, Image as KonvaImage, Line } from "react-konva";
import { useRef, useEffect, useState } from "react";
import { useTerrainStore } from "@/stores/rooms.store";
import { cmToDisplay } from "@/lib/utils";
import Konva from "konva";

export function TerrainLayer() {
  const { terrain } = useTerrainStore();
  const [image, setImage] = useState<Konva.Image | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (terrain.backgroundImage) {
      const img = new window.Image();
      img.onload = () => {
        imageRef.current = img;
        setImage(new Konva.Image({ image: img }));
      };
      img.src = terrain.backgroundImage;
    } else {
      setImage(null);
      imageRef.current = null;
    }
  }, [terrain.backgroundImage]);

  return (
    <>
      {terrain.backgroundImage && imageRef.current && (
        <KonvaImage
          image={imageRef.current}
          x={0}
          y={0}
          width={terrain.width}
          height={terrain.height}
        />
      )}

      <Rect
        x={0}
        y={0}
        width={terrain.width}
        height={terrain.height}
        fill={terrain.backgroundImage ? undefined : terrain.color}
        stroke="#333333"
        strokeWidth={2}
        onContextMenu={(e) => {
          e.evt.preventDefault();
          const event = new CustomEvent("terrain-contextmenu", {
            detail: { clientX: e.evt.clientX, clientY: e.evt.clientY },
            bubbles: true,
          });
          e.target.getStage()?.container().dispatchEvent(event);
        }}
      />

      {terrain.front === "top" && (
        <>
          <Line points={[0, 0, terrain.width, 0]} stroke="#ff0000" strokeWidth={3} dash={[10, 5]} />
          <Text x={terrain.width / 2 - 30} y={-50} text="FRENTE" fontSize={12} fill="#ff0000" width={60} align="center" />
        </>
      )}
      {terrain.front === "bottom" && (
        <>
          <Line points={[0, terrain.height, terrain.width, terrain.height]} stroke="#ff0000" strokeWidth={3} dash={[10, 5]} />
          <Text x={terrain.width / 2 - 30} y={terrain.height + 10} text="FRENTE" fontSize={12} fill="#ff0000" width={60} align="center" />
        </>
      )}
      {terrain.front === "left" && (
        <>
          <Line points={[0, 0, 0, terrain.height]} stroke="#ff0000" strokeWidth={3} dash={[10, 5]} />
          <Text x={-60} y={terrain.height / 2 - 10} text="FRENTE" fontSize={12} fill="#ff0000" width={50} align="center" rotation={-90} />
        </>
      )}
      {terrain.front === "right" && (
        <>
          <Line points={[terrain.width, 0, terrain.width, terrain.height]} stroke="#ff0000" strokeWidth={3} dash={[10, 5]} />
          <Text x={terrain.width + 10} y={terrain.height / 2 - 10} text="FRENTE" fontSize={12} fill="#ff0000" width={50} align="center" rotation={90} />
        </>
      )}

      <Text
        x={terrain.width / 2 - 50}
        y={-30}
        text={cmToDisplay(terrain.width)}
        fontSize={14}
        fill="#333333"
        width={100}
        align="center"
      />

      <Text
        x={-60}
        y={terrain.height / 2 - 10}
        text={cmToDisplay(terrain.height)}
        fontSize={14}
        fill="#333333"
        width={50}
        align="center"
      />
    </>
  );
}
