export type Category = "A" | "B" | "C";
export type EngagementModel = 1 | 2 | 3;

export interface Wall {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  length: number;
  height: number;
  thickness: number;
}

export type RoomType = "bathroom" | "kitchen" | "general";

export interface Room {
  id: string;
  name: string;
  area: number;
  type: RoomType; // needed for sanitary pricing (bathroom count)
}

export interface Opening {
  id: string;
  type: "door" | "window";
  width: number; // ft — needed for woodwork area
  height: number; // ft — needed for woodwork area
}

export interface Geometry {
  walls: Wall[];
  rooms: Room[];
  openings: Opening[];
}

export interface RateCardItem {
  itemType: RateItemType;
  unitRate: number;
  unit: "sqft" | "ton" | "bath" | "1000nos" | "bag" | "cft";
}

export interface RateCard {
  city: string;
  category: Category;
  items: RateCardItem[];
  taxPercent: number;
}

export interface BOQLineItem {
  itemType: RateItemType;
  quantity: number;
  unit: string;
  unitRate: number;
  subtotal: number;
}

export interface BOQResult {
  lineItems: BOQLineItem[];
  subtotal: number;
  tax: number;
  total: number;
}

export const RATE_ITEM_TYPES = [
  "masonry",
  "plaster",
  "shuttering",
  "steelFixing",
  "sanitary",
  "tileFixing",
  "marbleFixing",
  "woodwork",
  "falseCeiling",
  "foundation",
  "rccRoof",
  "electrical",
  "paint",
  "brick",
  "cement",
  "sand",
  "steelMaterial",
] as const;

export type RateItemType = (typeof RATE_ITEM_TYPES)[number];

// The four materials that must always appear on a BOQ, priced from a live
// city-specific search (never a built-in figure).
export const CORE_MATERIAL_TYPES = [
  "brick",
  "cement",
  "sand",
  "steelMaterial",
] as const satisfies readonly RateItemType[];

export interface RateCardItem {
  itemType: RateItemType;
  unitRate: number;
  unit: "sqft" | "ton" | "bath" | "1000nos" | "bag" | "cft";
}
