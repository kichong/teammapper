/**
 * Basic link connecting two nodes on the map.
 * Each link is unique through its id.
 */
export interface Link {
  id: string; // id of the link
  fromNodeId: string; // id of the first node
  toNodeId: string; // id of the second node
  style?: any; // future style options
}
