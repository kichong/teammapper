/**
 * Basic link connecting two nodes on the map.
 * Each link is unique through its id.
 */
/** Styling options for how a cross link is rendered on screen. */
export interface LinkStyle {
  color?: string; // line color
  width?: number; // stroke width
  dash?: string; // dash pattern "5 5" etc.
  opacity?: number; // stroke opacity 0..1
}

export interface Link {
  id: string; // id of the link
  fromNodeId: string; // id of the first node
  toNodeId: string; // id of the second node
  style?: LinkStyle; // optional styling
}
