/**
 * Simple shape on the map (currently only circles).
 */
export interface Shape {
  id: string; // unique id
  type: 'circle'; // future shape types
  x: number; // center x in map coordinates
  y: number; // center y in map coordinates
  radius: number; // circle radius in pixels
  color: string; // fill color
}
