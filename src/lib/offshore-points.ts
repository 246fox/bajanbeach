export type OffshorePoint = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
};

/** Open-ocean reference markers (North → East → South → West). Full precision. */
export const OFFSHORE_POINTS: OffshorePoint[] = [
  {
    id: "offshore-north",
    label: "North",
    latitude: 13.405758722874376,
    longitude: -59.66652058838864
  },
  {
    id: "offshore-east",
    label: "East",
    latitude: 13.278815129526977,
    longitude: -59.452172248662215
  },
  {
    id: "offshore-south",
    label: "South",
    latitude: 12.99791587399699,
    longitude: -59.505958311283855
  },
  {
    id: "offshore-west",
    label: "West",
    latitude: 13.182124342038033,
    longitude: -59.715514305463444
  }
];
