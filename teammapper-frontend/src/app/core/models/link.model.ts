/**
 * Basic link connecting two nodes on the map.
 * Each link is unique through its id.
 */
export interface Link {
  id: string; // id of the link (usually from-to)
  from: string; // id of the first node
  to: string; // id of the second node
}
