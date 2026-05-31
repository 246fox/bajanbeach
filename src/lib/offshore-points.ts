export type OffshorePoint = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
};

/** Open-ocean reference markers (East and West). Full precision. */
export const OFFSHORE_POINTS: OffshorePoint[] = [
  {
    id: "offshore-east",
    label: "Atlantic Ocean",
    latitude: 13.278815129526977,
    longitude: -59.452172248662215
  },
  {
    id: "offshore-west",
    label: "Caribbean Sea",
    latitude: 13.182124342038033,
    longitude: -59.715514305463444
  }
];
