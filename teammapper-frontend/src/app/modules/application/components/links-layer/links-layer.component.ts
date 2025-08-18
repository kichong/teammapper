import { Component, Input, ElementRef } from '@angular/core';
import { Link } from 'src/app/core/models/link.model';
import { LinksService } from 'src/app/core/services/links/links.service';

/**
 * Renders SVG lines between nodes and handles hover/delete actions.
 */
@Component({
  selector: 'teammapper-links-layer',
  templateUrl: './links-layer.component.html',
  styleUrls: ['./links-layer.component.scss'],
  standalone: false,
})
export class LinksLayerComponent {
  @Input() links: Link[] = []; // all saved links
  @Input() linkingFrom: string | null = null; // node chosen first
  @Input() cursor: { x: number; y: number } | null = null; // cursor while linking

  public hovered: string | null = null; // id of hovered link

  constructor(
    private elementRef: ElementRef<HTMLElement>,
    private linksService: LinksService
  ) {}

  /** Get the center position of a node on screen relative to map. */
  public getPos(id: string): { x: number; y: number } {
    const element = document.querySelector(
      `[data-node-id='${id}'], [data-id='${id}'], #${id}`
    ) as HTMLElement;
    if (!element) return { x: 0, y: 0 };

    const rect = element.getBoundingClientRect();
    const hostRect = (this.elementRef.nativeElement.parentElement as HTMLElement).getBoundingClientRect();
    return {
      x: rect.left - hostRect.left + rect.width / 2,
      y: rect.top - hostRect.top + rect.height / 2,
    };
  }

  /** Position of the mouse relative to the map wrapper. */
  public get cursorPos() {
    if (!this.cursor) return { x: 0, y: 0 };
    const hostRect = (this.elementRef.nativeElement.parentElement as HTMLElement).getBoundingClientRect();
    return { x: this.cursor.x - hostRect.left, y: this.cursor.y - hostRect.top };
  }

  /** Remove link when user clicks the small x. */
  public delete(id: string) {
    this.linksService.removeLink(id);
  }
}
