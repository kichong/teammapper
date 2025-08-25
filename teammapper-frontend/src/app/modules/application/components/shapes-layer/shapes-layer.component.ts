import {
  Component,
  ElementRef,
  HostBinding,
  HostListener,
  AfterViewInit,
  OnDestroy,
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
export class ShapesLayerComponent implements AfterViewInit, OnDestroy {
  public shapes: Shape[] = [];
  public selectedId: string | null = null;
  public drawMode = false;

  public scale = 1;
  public translateX = 0;
  public translateY = 0;

  private resizingId: string | null = null;
  private startRadius = 0;
  private startX = 0;
  private startY = 0;

  private movingId: string | null = null;
  private moveStartX = 0;
  private moveStartY = 0;
  private shapeStartX = 0;
  private shapeStartY = 0;

  private transformObserver: MutationObserver | null = null;

  constructor(
    private elementRef: ElementRef<HTMLElement>,
    public shapesService: ShapesService
  ) {
    this.shapesService.shapes$.subscribe(s => (this.shapes = s));
    this.shapesService.selected$.subscribe(id => (this.selectedId = id));
    this.shapesService.drawMode$.subscribe(mode => (this.drawMode = mode));
  }

  ngAfterViewInit(): void {
    const initObserver = () => {
      const g = document.querySelector('#map_1 svg g');
      if (g) {
        this.updateTransform((g as SVGGElement).getAttribute('transform'));
        this.transformObserver = new MutationObserver(mutations => {
          mutations.forEach(m => {
            if (m.attributeName === 'transform') {
              const target = m.target as SVGGElement;
              this.updateTransform(target.getAttribute('transform'));
            }
          });
        });
        this.transformObserver.observe(g, { attributes: true });
      } else {
        setTimeout(initObserver, 100);
      }
    };
    initObserver();
  }

  ngOnDestroy(): void {
    this.transformObserver?.disconnect();
  }

  private updateTransform(value: string | null) {
    const match =
      /translate\(([-\d.]+),\s*([-\d.]+)\)\s*scale\(([-\d.]+)\)/.exec(
        value || ''
      );
    if (match) {
      this.translateX = parseFloat(match[1]);
      this.translateY = parseFloat(match[2]);
      this.scale = parseFloat(match[3]);
    } else {
      this.translateX = 0;
      this.translateY = 0;
      this.scale = 1;
    }
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
    const sx = event.clientX - rect.left;
    const sy = event.clientY - rect.top;
    const x = (sx - this.translateX) / this.scale;
    const y = (sy - this.translateY) / this.scale;
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
    const dx = (event.clientX - this.startX) / this.scale;
    const dy = (event.clientY - this.startY) / this.scale;
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
    const dx = (event.clientX - this.moveStartX) / this.scale;
    const dy = (event.clientY - this.moveStartY) / this.scale;
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
}
