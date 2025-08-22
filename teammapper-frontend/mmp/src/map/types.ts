import { ExportNodeProperties, NodeProperties, UserNodeProperties } from './models/node'
import { Shape } from './models/shape'
import { ExportHistory, MapSnapshot } from './handlers/history'
import { DefaultNodeProperties, OptionParameters } from './options'

interface MapCreateEvent {
    previousMapData: MapSnapshot
}

interface MapData {
    nodes: MapSnapshot,
    shapes: Shape[]
}

interface MapProperties {
    uuid: string,
    lastModified: number,
    createdAt: number,
    data: MapData,
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
    MapData,
    MapProperties,
    MapSnapshot,
    Shape,
    NodeProperties,
    NodeUpdateEvent,
    OptionParameters,
    UserNodeProperties
}
