import { Component, ElementRef, HostBinding } from '@angular/core';
import { nanoid } from 'nanoid/non-secure';
import { Shape } from 'src/app/core/models/shape.model';
import { ShapesService } from 'src/app/core/services/shapes/shapes.service';
import { MmpService } from 'src/app/core/services/mmp/mmp.service';

/**
 * Renders and edits simple shapes (circles) on top of the map.
 */
@Component({
  selector: 'teammapper-shapes-layer',
  templateUrl: './shapes-layer.component.html',
  styleUrls: ['./shapes-layer.component.scss'],
  standalone: false,
})
export class ShapesLayerComponent {
  public shapes: Shape[] = [];
  public selectedId: string | null = null;
  public drawMode = false;

  private resizingId: string | null = null;
  private startRadius = 0;
  private startX = 0;
  private startY = 0;

  private movingId: string | null = null;
  private moveStartX = 0;
  private moveStartY = 0;
  private shapeStartX = 0;
  private shapeStartY = 0;

  constructor(
    private elementRef: ElementRef<HTMLElement>,
    public shapesService: ShapesService,
    public mmpService: MmpService
  ) {
    this.shapesService.shapes$.subscribe(s => (this.shapes = s));
    this.shapesService.selected$.subscribe(id => (this.selectedId = id));
    this.shapesService.drawMode$.subscribe(mode => (this.drawMode = mode));
  }

  @HostBinding('class.drawing') get drawing() {
    return this.drawMode;
  }

  /** Handle clicks on empty layer to create a new circle. */
  public onSvgClick(event: MouseEvent) {
    if (!this.drawMode) return;
    if (event.target !== event.currentTarget) return;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const sx = event.clientX - rect.left;
    const sy = event.clientY - rect.top;
    const { x, y } = this.screenToMap(sx, sy);
    this.shapesService.add({ id: `sh_${nanoid()}`, x, y });
  }

  /** Select a shape */
  public selectShape(event: MouseEvent, id: string) {
    event.stopPropagation();
    this.shapesService.select(id);
  }

  /** Start resizing using the little handle */
  public startResize(event: MouseEvent, shape: Shape) {
    event.stopPropagation();
    this.resizingId = shape.id;
    this.startRadius = shape.radius;
    this.startX = event.clientX;
    this.startY = event.clientY;
    window.addEventListener('mousemove', this.onResize);
    window.addEventListener('mouseup', this.stopResize);
  }

  private onResize = (event: MouseEvent) => {
    if (!this.resizingId) return;
    const scale = this.currentScale();
    const dx = (event.clientX - this.startX) / scale;
    const dy = (event.clientY - this.startY) / scale;
    const delta = Math.max(dx, dy);
    const newRadius = Math.max(10, this.startRadius + delta);
    this.shapesService.update(this.resizingId, { radius: newRadius });
  };

  private stopResize = () => {
    if (this.resizingId) {
      this.shapesService.commit();
    }
    this.resizingId = null;
    window.removeEventListener('mousemove', this.onResize);
    window.removeEventListener('mouseup', this.stopResize);
  };

  /** Start moving the shape */
  public startMove(event: MouseEvent, shape: Shape) {
    event.stopPropagation();
    this.movingId = shape.id;
    this.moveStartX = event.clientX;
    this.moveStartY = event.clientY;
    this.shapeStartX = shape.x;
    this.shapeStartY = shape.y;
    window.addEventListener('mousemove', this.onMove);
    window.addEventListener('mouseup', this.stopMove);
  }

  private onMove = (event: MouseEvent) => {
    if (!this.movingId) return;
    const scale = this.currentScale();
    const dx = (event.clientX - this.moveStartX) / scale;
    const dy = (event.clientY - this.moveStartY) / scale;
    this.shapesService.update(this.movingId, {
      x: this.shapeStartX + dx,
      y: this.shapeStartY + dy,
    });
  };

  private stopMove = () => {
    if (this.movingId) {
      this.shapesService.commit();
    }
    this.movingId = null;
    window.removeEventListener('mousemove', this.onMove);
    window.removeEventListener('mouseup', this.stopMove);
  };

  /** Delete shape via handle */
  public deleteShape(event: MouseEvent, id: string) {
    event.stopPropagation();
    this.shapesService.remove(id);
  }

  /** Convert screen coordinates to map space using current transform. */
  private screenToMap(sx: number, sy: number): { x: number; y: number } {
    const matrix = this.mapMatrix().inverse();
    const p = new DOMPoint(sx, sy).matrixTransform(matrix);
    return { x: p.x, y: p.y };
  }

  /** Current uniform scale of the map. */
  private currentScale(): number {
    return this.mapMatrix().a || 1;
  }

  /**
   * Build a DOMMatrix from the map's transform string. The transform is
   * usually in the form `translate(x,y) scale(k)`, but the DOMMatrix
   * constructor cannot parse that string directly. We extract the numbers and
   * compose the matrix manually so click positions and scaling work in all
   * browsers.
   */
  private mapMatrix(): DOMMatrix {
    const t = this.mmpService.mapTransform();
    if (!t) return new DOMMatrix();
    try {
      return new DOMMatrix(t);
    } catch {
      const match = t.match(
        /translate\(([-0-9.]+)[ ,]([-0-9.]+)\)\s*scale\(([-0-9.]+)\)/
      );
      if (match) {
        const [, tx, ty, k] = match;
        return new DOMMatrix()
          .translateSelf(parseFloat(tx), parseFloat(ty))
          .scaleSelf(parseFloat(k));
      }
      return new DOMMatrix();
    }
  }
}
