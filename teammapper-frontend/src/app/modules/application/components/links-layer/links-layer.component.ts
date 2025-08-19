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
  private readonly padding = 6; // small gap so lines avoid text

  constructor(
    private elementRef: ElementRef<HTMLElement>,
    private linksService: LinksService
  ) {
    // Update list of links and drop ones whose nodes are missing.
    this.linksService.links$.subscribe(links => {
      // keep only links whose nodes still exist in the DOM
      this.links = links.filter(
        l => getNodeEl(l.fromNodeId) && getNodeEl(l.toNodeId)
      );
    });
  }

  /**
   * Find two points where the line between nodes touches their edges.
   * The rectangles are slightly inflated so the line stops before text.
   */
  public getEdgePos(
    fromId: string,
    toId: string
  ): { p1: { x: number; y: number }; p2: { x: number; y: number } } | null {
    const fromEl = getNodeEl(fromId);
    const toEl = getNodeEl(toId);
    if (!fromEl || !toEl) return null;

    const hostRect = (this.elementRef.nativeElement.parentElement as HTMLElement).getBoundingClientRect();
    const hostX = hostRect.left + window.scrollX;
    const hostY = hostRect.top + window.scrollY;

    const pad = this.padding;
    const makeRect = (el: HTMLElement) => {
      const r = el.getBoundingClientRect();
      return {
        left: r.left + window.scrollX - hostX - pad,
        right: r.right + window.scrollX - hostX + pad,
        top: r.top + window.scrollY - hostY - pad,
        bottom: r.bottom + window.scrollY - hostY + pad,
      };
    };

    const r1 = makeRect(fromEl);
    const r2 = makeRect(toEl);
    const c1 = { x: (r1.left + r1.right) / 2, y: (r1.top + r1.bottom) / 2 };
    const c2 = { x: (r2.left + r2.right) / 2, y: (r2.top + r2.bottom) / 2 };

    const dx = c2.x - c1.x;
    const dy = c2.y - c1.y;

    const t1x = dx > 0 ? (r1.right - c1.x) / dx : (r1.left - c1.x) / dx;
    const t1y = dy > 0 ? (r1.bottom - c1.y) / dy : (r1.top - c1.y) / dy;
    const t1 = Math.min(t1x, t1y);
    const p1 = { x: c1.x + dx * t1, y: c1.y + dy * t1 };

    const dx2 = -dx;
    const dy2 = -dy;
    const t2x = dx2 > 0 ? (r2.right - c2.x) / dx2 : (r2.left - c2.x) / dx2;
    const t2y = dy2 > 0 ? (r2.bottom - c2.y) / dy2 : (r2.top - c2.y) / dy2;
    const t2 = Math.min(t2x, t2y);
    const p2 = { x: c2.x + dx2 * t2, y: c2.y + dy2 * t2 };

    return { p1, p2 };
  }

  /** Edge point from a node towards an arbitrary point (used for temp line). */
  public edgeFromNodeToPoint(
    id: string,
    point: { x: number; y: number }
  ): { x: number; y: number } | null {
    const el = getNodeEl(id);
    if (!el) return null;

    const hostRect = (this.elementRef.nativeElement.parentElement as HTMLElement).getBoundingClientRect();
    const hostX = hostRect.left + window.scrollX;
    const hostY = hostRect.top + window.scrollY;
    const r = el.getBoundingClientRect();
    const rect = {
      left: r.left + window.scrollX - hostX - this.padding,
      right: r.right + window.scrollX - hostX + this.padding,
      top: r.top + window.scrollY - hostY - this.padding,
      bottom: r.bottom + window.scrollY - hostY + this.padding,
    };
    const c = { x: (rect.left + rect.right) / 2, y: (rect.top + rect.bottom) / 2 };
    const dx = point.x - c.x;
    const dy = point.y - c.y;
    const tX = dx > 0 ? (rect.right - c.x) / dx : (rect.left - c.x) / dx;
    const tY = dy > 0 ? (rect.bottom - c.y) / dy : (rect.top - c.y) / dy;
    const t = Math.min(tX, tY);
    return { x: c.x + dx * t, y: c.y + dy * t };
  }

  /** Build a smooth curve between two points. */
  public buildCurve(
    p1: { x: number; y: number },
    p2: { x: number; y: number }
  ): string {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const offset = len * 0.2; // amount of curve
    const cx1 = p1.x + dx / 3 + nx * offset;
    const cy1 = p1.y + dy / 3 + ny * offset;
    const cx2 = p1.x + (2 * dx) / 3 + nx * offset;
    const cy2 = p1.y + (2 * dy) / 3 + ny * offset;
    return `M ${p1.x} ${p1.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${p2.x} ${p2.y}`;
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
