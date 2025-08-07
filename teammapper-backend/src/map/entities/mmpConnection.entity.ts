import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { MmpMap } from './mmpMap.entity'
import { MmpNode } from './mmpNode.entity'

// Represents a simple line between two nodes
@Entity()
export class MmpConnection {
  @PrimaryGeneratedColumn('uuid')
  id: string

  // Map this connection belongs to
  @ManyToOne(() => MmpMap, (map) => map.connections, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mapId' })
  map: MmpMap

  @Column('uuid')
  mapId: string

  // Starting node
  @ManyToOne(() => MmpNode, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fromNodeId' })
  fromNode: MmpNode

  @Column('uuid')
  fromNodeId: string

  // End node
  @ManyToOne(() => MmpNode, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'toNodeId' })
  toNode: MmpNode

  @Column('uuid')
  toNodeId: string

  // Optional color for the line
  @Column({ type: 'varchar', nullable: true })
  color: string | null

  // Optional width of the line
  @Column({ type: 'float', nullable: true })
  width: number | null
}
