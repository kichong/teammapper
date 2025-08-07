import { ExportNodeProperties, NodeProperties, UserNodeProperties } from './models/node'
import { ExportHistory, MapSnapshot } from './handlers/history'

interface MapConnection {
  id: string
  from: string
  to: string
  color?: string | null
  width?: number | null
}
import { DefaultNodeProperties, OptionParameters } from './options'

interface MapCreateEvent {
    previousMapData: MapSnapshot
}

interface MapProperties {
    uuid: string,
    lastModified: number,
    createdAt: number,
    data: MapSnapshot,
    connections: MapConnection[],
    deletedAt: number,
    deleteAfterDays: number
}

interface NodeUpdateEvent {
    nodeProperties: ExportNodeProperties,
    previousValue: any,
    changedProperty: string
}

export {
    DefaultNodeProperties,
    ExportHistory,
    ExportNodeProperties,
    MapCreateEvent,
    MapProperties,
    MapConnection,
    MapSnapshot,
    NodeProperties,
    NodeUpdateEvent,
    OptionParameters,
    UserNodeProperties
}