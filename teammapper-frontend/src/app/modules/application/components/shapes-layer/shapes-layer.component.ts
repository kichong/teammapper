import {
  Component,
  ElementRef,
  HostBinding,
  HostListener,
} from '@angular/core';
import { nanoid } from 'nanoid/non-secure';
import { Shape } from 'src/app/core/models/shape.model';
import { ShapesService } from 'src/app/core/services/shapes/shapes.service';

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

  constructor(
    private elementRef: ElementRef<HTMLElement>,
    public shapesService: ShapesService
  ) {
    this.shapesService.shapes$.subscribe(s => (this.shapes = s));
    this.shapesService.selected$.subscribe(id => (this.selectedId = id));
    this.shapesService.drawMode$.subscribe(mode => (this.drawMode = mode));
  }

  @HostBinding('class.drawing') get drawing() {
    return this.drawMode;
  }

  /** Handle clicks on empty layer to create a new circle. */
  @HostListener('click', ['$event'])
  onHostClick(event: MouseEvent) {
    if (!this.drawMode) return;
    if (event.target !== this.elementRef.nativeElement) return;
    const rect = this.elementRef.nativeElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
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
    const dx = event.clientX - this.startX;
    const dy = event.clientY - this.startY;
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
}
