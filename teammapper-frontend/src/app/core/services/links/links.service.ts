import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Link } from '../../models/link.model';
import { StorageService } from '../storage/storage.service';

/**
 * Keeps links between nodes in memory and in the browser storage.
 */
@Injectable({
  providedIn: 'root',
})
export class LinksService {
  private mapId: string; // id of the current map

  // current list of links
  private linksSubject = new BehaviorSubject<Link[]>([]);
  public links$: Observable<Link[]> = this.linksSubject.asObservable();

  // true when user is in "link mode"
  private linkModeSubject = new BehaviorSubject<boolean>(false);
  public linkMode$ = this.linkModeSubject.asObservable();

  constructor(private storage: StorageService) {}

  /** Set the map id and load stored links for this map. */
  public async setMapId(id: string): Promise<void> {
    this.mapId = id;
    const stored = (await this.storage.get(this.storageKey())) as Link[];
    this.linksSubject.next(stored || []);
  }

  /** Toggle link mode on or off. */
  public toggleLinkMode(): void {
    const current = this.linkModeSubject.getValue();
    this.linkModeSubject.next(!current);
  }

  /** Quick check if link mode is active. */
  public isLinkModeActive(): boolean {
    return this.linkModeSubject.getValue();
  }

  /** Add a link from one node to another. */
  public add(link: Link): void {
    const links = this.linksSubject.getValue();
    if (links.find(l => l.id === link.id)) return; // avoid duplicates

    const newLinks = [...links, link];
    this.linksSubject.next(newLinks);
    this.save(newLinks);
  }

  /** Remove a link by its id. */
  public remove(id: string): void {
    const newLinks = this.linksSubject.getValue().filter(l => l.id !== id);
    this.linksSubject.next(newLinks);
    this.save(newLinks);
  }

  /** Save links to storage using map id. */
  private async save(links: Link[]): Promise<void> {
    if (!this.mapId) return;
    await this.storage.set(this.storageKey(), links);
  }

  private storageKey(): string {
    return `links-${this.mapId}`;
  }
}
