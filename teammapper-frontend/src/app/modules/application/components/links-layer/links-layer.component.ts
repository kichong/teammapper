import { Component, Input, ElementRef } from '@angular/core';
import { Link } from 'src/app/core/models/link.model';
import { LinksService } from 'src/app/core/services/links/links.service';

// Find a node element using safe attribute lookups.
function getNodeEl(id: string): HTMLElement | null {
  const sel = `[data-node-id="${id}"], [data-id="${id}"], [id="${id}"]`;
  return document.querySelector(sel) as HTMLElement | null;
}

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
  public links: Link[] = []; // all saved links
  @Input() selectedNodeId: string | null = null; // node chosen first
  @Input() cursor: { x: number; y: number } | null = null; // cursor while linking

  public hovered: string | null = null; // id of hovered link

  constructor(
    private elementRef: ElementRef<HTMLElement>,
    private linksService: LinksService
  ) {
    // Update list of links and drop ones whose nodes are missing.
    this.linksService.links$.subscribe(links => {
      this.links = links.filter(
        l => this.getPos(l.from).ok && this.getPos(l.to).ok
      );
    });
  }

  /** Get the center position of a node on screen relative to map. */
  public getPos(id: string): { x: number; y: number; ok: boolean } {
    const el = getNodeEl(id);
    if (!el) return { x: 0, y: 0, ok: false };

    const rect = el.getBoundingClientRect();
    const hostRect = (this.elementRef.nativeElement.parentElement as HTMLElement).getBoundingClientRect();
    // Compute center of the node and adjust to the SVG's coordinate space.
    const x = rect.left + rect.width / 2 + window.scrollX;
    const y = rect.top + rect.height / 2 + window.scrollY;
    const hostX = hostRect.left + window.scrollX;
    const hostY = hostRect.top + window.scrollY;
    return { x: x - hostX, y: y - hostY, ok: true };
  }

  /** Position of the mouse relative to the map wrapper. */
  public get cursorPos() {
    if (!this.cursor) return { x: 0, y: 0 };
    const hostRect = (this.elementRef.nativeElement.parentElement as HTMLElement).getBoundingClientRect();
    return { x: this.cursor.x - hostRect.left, y: this.cursor.y - hostRect.top };
  }

  /** Remove link when user clicks the small x. */
  public delete(id: string) {
    this.linksService.remove(id);
  }
}
