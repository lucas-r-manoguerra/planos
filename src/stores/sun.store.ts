/**
 * Tienda de estado para la simulación solar
 *
 * Maneja la configuración de la posición del sol,
 * fecha, hora, ubicación y altura de piso.
 */

import { create } from "zustand";
import { LocationSettings } from "@/types/plan";
import { DEFAULT_SUN_SETTINGS } from "@/lib/constants";
import { getSunPosition, getSunriseTime, getSunsetTime } from "@/lib/solar";

interface SunStore extends SunStoreState {
  // Acciones de configuración
  setEnabled: (enabled: boolean) => void;
  setDate: (date: string) => void;
  setTime: (time: number) => void;
  setLocation: (location: LocationSettings) => void;
  setFloorHeight: (height: number) => void;

  // Getters computados (llamar como funciones, no selectores)
  getSunPosition: () => { azimuth: number; elevation: number };
  getSunriseTime: () => number;
  getSunsetTime: () => number;
}

interface SunStoreState {
  enabled: boolean;
  date: string;
  time: number;
  location: LocationSettings;
  floorHeight: number;
}

export const useSunStore = create<SunStore>((set, get) => ({
  enabled: DEFAULT_SUN_SETTINGS.enabled,
  date: DEFAULT_SUN_SETTINGS.date,
  time: DEFAULT_SUN_SETTINGS.time,
  location: { ...DEFAULT_SUN_SETTINGS.location },
  floorHeight: DEFAULT_SUN_SETTINGS.floorHeight,

  setEnabled: (enabled) => set({ enabled }),
  setDate: (date) => set({ date }),
  setTime: (time) => set({ time }),
  setLocation: (location) => set({ location }),
  setFloorHeight: (height) => set({ floorHeight: height }),

  getSunPosition: () => {
    const { location, date, time } = get();
    return getSunPosition(location.latitude, location.longitude, date, time, location.timezone);
  },

  getSunriseTime: () => {
    const { location, date } = get();
    return getSunriseTime(location.latitude, location.longitude, date, location.timezone);
  },

  getSunsetTime: () => {
    const { location, date } = get();
    return getSunsetTime(location.latitude, location.longitude, date, location.timezone);
  },
}));
