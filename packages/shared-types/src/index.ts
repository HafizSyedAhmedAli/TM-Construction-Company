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

export type RateItemType =
  | "masonry"
  | "plaster"
  | "shuttering"
  | "steelFixing"
  | "sanitary"
  | "tileFixing"
  | "marbleFixing"
  | "woodwork"
  | "falseCeiling"
  | "foundation"
  | "rccRoof"
  | "electrical"
  | "paint"
  | "brick"
  | "cement"
  | "sand"
  | "steelMaterial";

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
