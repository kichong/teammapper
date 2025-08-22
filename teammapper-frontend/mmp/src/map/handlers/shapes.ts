import * as d3 from 'd3'
import { v4 as uuidv4 } from 'uuid'
import Map from '../map'
import { Shape } from '../models/shape'

/**
 * Manage simple shapes like circles/ellipses on the map.
 */
export default class Shapes {
    private map: Map
    private shapes: Shape[]

    constructor(map: Map) {
        this.map = map
        this.shapes = []
    }

    /**
     * Add a new ellipse shape to the map.
     */
    public addShape = (props: Partial<Shape> = {}): Shape => {
        const color = d3.schemeCategory10[Math.floor(Math.random() * 10)]
        const shape: Shape = Object.assign({
            id: uuidv4(),
            type: 'ellipse',
            cx: 0,
            cy: 0,
            rx: 100,
            ry: 60,
            color
        }, props)

        this.shapes.push(shape)
        this.draw()
        return shape
    }

    /** Load shapes from snapshot */
    public loadShapes = (shapes: Shape[] = []) => {
        this.shapes = shapes
        this.draw()
    }

    /** Remove shape by id */
    public removeShape = (id: string) => {
        this.shapes = this.shapes.filter(s => s.id !== id)
        this.draw()
    }

    /** Return all shapes */
    public getShapes = (): Shape[] => {
        return this.shapes
    }

    /** Export shapes (clone) */
    public export = (): Shape[] => {
        return this.shapes.map(s => ({...s}))
    }

    /**
     * Draw or update all shapes in the dom.
     */
    private draw() {
        if (!this.map.dom.shapes) return

        const selection = this.map.dom.shapes
            .selectAll<SVGGElement, Shape>('g.shape')
            .data(this.shapes, d => d.id)

        const enter = selection.enter().append('g').attr('class', 'shape')

        enter.append('ellipse')
            .style('fill', 'none')
            .style('stroke-width', 3)
            .style('cursor', 'move')
            .attr('cx', d => d.cx)
            .attr('cy', d => d.cy)
            .attr('rx', d => d.rx)
            .attr('ry', d => d.ry)
            .style('stroke', d => d.color)
            .call(d3.drag<SVGEllipseElement, Shape>()
                .on('drag', (event, d) => {
                    d.cx += event.dx
                    d.cy += event.dy
                    this.draw()
                }))

        // resize handle
        enter.append('circle')
            .attr('class', 'resize-handle')
            .attr('r', 6)
            .style('cursor', 'nwse-resize')
            .style('fill', d => d.color)
            .call(d3.drag<SVGCircleElement, Shape>()
                .on('drag', (event, d) => {
                    d.rx = Math.max(10, d.rx + event.dx)
                    d.ry = Math.max(10, d.ry + event.dy)
                    this.draw()
                }))

        // remove on double click
        enter.on('dblclick', (_event, d) => this.removeShape(d.id))

        // update existing
        selection.select('ellipse')
            .attr('cx', d => d.cx)
            .attr('cy', d => d.cy)
            .attr('rx', d => d.rx)
            .attr('ry', d => d.ry)
            .style('stroke', d => d.color)

        selection.select('circle.resize-handle')
            .attr('cx', d => d.cx + d.rx)
            .attr('cy', d => d.cy + d.ry)
            .style('fill', d => d.color)

        selection.exit().remove()
    }
}
