import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { nanoid } from 'nanoid/non-secure';
import { Shape } from '../../models/shape.model';
import { StorageService } from '../storage/storage.service';

/**
 * Manages drawable shapes on top of the map and keeps them in local storage.
 */
@Injectable({
  providedIn: 'root',
})
export class ShapesService {
  private mapId: string;
  private shapesSubject = new BehaviorSubject<Shape[]>([]);
  public shapes$: Observable<Shape[]> = this.shapesSubject.asObservable();

  private selectedSubject = new BehaviorSubject<string | null>(null);
  public selected$ = this.selectedSubject.asObservable();

  private drawModeSubject = new BehaviorSubject<boolean>(false);
  public drawMode$ = this.drawModeSubject.asObservable();

  private history: Shape[][] = [];
  private redoStack: Shape[][] = [];

  constructor(private storage: StorageService) {}

  /** Load shapes for the current map id. */
  public async setMapId(id: string): Promise<void> {
    this.mapId = id;
    const stored = (await this.storage.get(this.storageKey())) as Shape[];
    const shapes = stored || [];
    this.shapesSubject.next(this.clone(shapes));
    this.history = [this.clone(shapes)];
    this.redoStack = [];
  }

  /** Return all shapes. */
  public getAll(): Shape[] {
    return this.shapesSubject.getValue();
  }

  /** Replace all shapes with a new set. */
  public setAll(shapes: Shape[]): void {
    this.setShapes(this.clone(shapes), true);
  }

  /** Add a new circle at position. */
  public add(shape: Partial<Shape>): Shape {
    const newShape: Shape = {
      id: shape.id || `sh_${nanoid()}`,
      type: 'circle',
      x: shape.x ?? 0,
      y: shape.y ?? 0,
      radius: shape.radius ?? 40,
      color: shape.color ?? '#1976d2',
    };
    const shapes = [...this.getAll(), newShape];
    this.setShapes(shapes, true);
    this.select(newShape.id);
    return newShape;
  }

  /** Update properties of a shape without recording history. */
  public update(id: string, patch: Partial<Shape>): void {
    const shapes = this.getAll().map(s =>
      s.id === id ? { ...s, ...patch } : s
    );
    this.setShapes(shapes, false);
  }

  /** Commit current shapes to history after updates (e.g., resize). */
  public commit(): void {
    this.history.push(this.clone(this.getAll()));
    this.redoStack = [];
    this.save();
  }

  /** Remove a shape by id. */
  public remove(id: string): void {
    const shapes = this.getAll().filter(s => s.id !== id);
    this.setShapes(shapes, true);
    if (this.selectedSubject.getValue() === id) {
      this.selectedSubject.next(null);
    }
  }

  /** Undo last change. */
  public undo(): void {
    if (this.history.length > 1) {
      const last = this.history.pop();
      this.redoStack.push(last);
      const prev = this.clone(this.history[this.history.length - 1]);
      this.shapesSubject.next(prev);
      this.save();
    }
  }

  /** Redo change. */
  public redo(): void {
    if (this.redoStack.length > 0) {
      const next = this.redoStack.pop();
      this.history.push(this.clone(next));
      this.shapesSubject.next(this.clone(next));
      this.save();
    }
  }

  /** Selection helpers */
  public select(id: string | null): void {
    this.selectedSubject.next(id);
  }

  public getSelected(): string | null {
    return this.selectedSubject.getValue();
  }

  public clearSelection(): void {
    this.selectedSubject.next(null);
  }

  /** Toggle draw mode */
  public toggleDrawMode(): void {
    const current = this.drawModeSubject.getValue();
    this.drawModeSubject.next(!current);
  }

  public isDrawModeActive(): boolean {
    return this.drawModeSubject.getValue();
  }

  /** Save shapes to storage */
  private save(shapes: Shape[] = this.getAll()): void {
    if (!this.mapId) return;
    this.storage.set(this.storageKey(), shapes);
  }

  private setShapes(shapes: Shape[], recordHistory: boolean): void {
    this.shapesSubject.next(this.clone(shapes));
    this.save(shapes);
    if (recordHistory) {
      this.history.push(this.clone(shapes));
      this.redoStack = [];
    }
  }

  private storageKey(): string {
    return `shapes-${this.mapId}`;
  }

  private clone(shapes: Shape[]): Shape[] {
    return JSON.parse(JSON.stringify(shapes));
  }
}
