import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Subscription, Observable } from 'rxjs';
import {
  ConnectionStatus,
  MapSyncService,
} from '../../../../core/services/map-sync/map-sync.service';
import { MmpService } from '../../../../core/services/mmp/mmp.service';
import { SettingsService } from '../../../../core/services/settings/settings.service';
import { UtilsService } from '../../../../core/services/utils/utils.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ExportNodeProperties } from '@mmp/map/types';
import { StorageService } from 'src/app/core/services/storage/storage.service';
import { ServerMap } from 'src/app/core/services/map-sync/server-types';
import { DialogService } from 'src/app/core/services/dialog/dialog.service';
import { Link } from '../../../../core/models/link.model';
import { LinksService } from '../../../../core/services/links/links.service';

// Find a node element on the page using stable attributes.
function getNodeEl(id: string): HTMLElement | null {
  const sel = `[data-node-id="${id}"], [data-id="${id}"], [id="${id}"]`;
  return document.querySelector(sel) as HTMLElement | null;
}

@Component({
  selector: 'teammapper-application',
  templateUrl: './application.component.html',
  styleUrls: ['./application.component.scss'],
  standalone: false,
})
export class ApplicationComponent implements OnInit, OnDestroy {
  public node: Observable<ExportNodeProperties>;
  public editMode: Observable<boolean>;
  public selectedNodeId: string | null = null;
  public cursor: { x: number; y: number } | null = null;

  private highlightedEl: HTMLElement | null = null;

  private imageDropSubscription: Subscription;
  private connectionStatusSubscription: Subscription;

  constructor(
    private mmpService: MmpService,
    private settingsService: SettingsService,
    private mapSyncService: MapSyncService,
    private storageService: StorageService,
    private dialogService: DialogService,
    private utilsService: UtilsService,
    private route: ActivatedRoute,
    private router: Router,
    private linksService: LinksService
  ) {}

  async ngOnInit() {
    this.storageService.cleanExpired();

    this.initMap();

    this.handleImageDropObservable();

    this.node = this.mapSyncService.getAttachedNodeObservable();
    this.connectionStatusSubscription = this.mapSyncService
      .getConnectionStatusObservable()
      .subscribe((status: ConnectionStatus) => {
        if (status === 'connected') this.dialogService.closeDisconnectDialog();
        if (status === 'disconnected')
          this.dialogService.openDisconnectDialog();
      });
    this.editMode = this.settingsService.getEditModeObservable();

    this.linksService.linkMode$.subscribe(active => {
      if (!active) {
        this.clearSelection();
      }
    });
  }

  ngOnDestroy() {
    this.imageDropSubscription.unsubscribe();
    this.connectionStatusSubscription.unsubscribe();
  }

  public handleImageDropObservable() {
    this.imageDropSubscription =
      UtilsService.observableDroppedImages().subscribe((image: string) => {
        this.mmpService.updateNode('imageSrc', image);
      });
  }

  private async initMap() {
    const givenId: string = this.route.snapshot.paramMap.get('id');
    const modificationSecret: string = this.route.snapshot.fragment;
    const map: ServerMap = await this.loadAndPrepareWithMap(
      givenId,
      modificationSecret
    );

    if (!map) {
      this.router.navigate(['/map']);
      return;
    }

    await this.linksService.setMapId(map.uuid);
  }

  private async loadAndPrepareWithMap(
    mapId: string,
    modificationSecret: string
  ): Promise<ServerMap> {
    if (mapId) {
      const existingMap = await this.mapSyncService.prepareExistingMap(
        mapId,
        modificationSecret
      );

      if (!existingMap) {
        const errorMessage = await this.utilsService.translate(
          'TOASTS.ERRORS.MAP_COULD_NOT_BE_FOUND'
        );

        this.router.navigate(['/map'], {
          queryParams: {
            toastMessage: errorMessage,
            toastIsError: 1,
          },
        });
      }

      return existingMap;
    } else {
      const privateServerMap = await this.mapSyncService.prepareNewMap();
      this.router.navigate([`map/${privateServerMap.map.uuid}`], {
        fragment: privateServerMap.modificationSecret,
      });
      return privateServerMap.map;
    }
  }

  @HostListener('document:click', ['$event'])
  public onDocumentClick(event: MouseEvent) {
    if (!this.linksService.isLinkModeActive()) return;

    const nodeId = this.findNodeId(event.target as HTMLElement);
    if (!nodeId) return;

    const targetEl = getNodeEl(nodeId);
    if (!targetEl) return;

    if (!this.selectedNodeId) {
      this.selectedNodeId = nodeId;
      this.highlight(nodeId);
    } else {
      if (this.selectedNodeId !== nodeId) {
        const fromEl = getNodeEl(this.selectedNodeId);
        if (fromEl) {
          let from = this.selectedNodeId;
          let to = nodeId;
          if (from > to) [from, to] = [to, from];
          const link: Link = { id: `${from}-${to}`, from, to };
          this.linksService.add(link);
        }
      }
      this.clearSelection();
    }
  }

  @HostListener('document:mousemove', ['$event'])
  public onDocumentMove(event: MouseEvent) {
    if (this.selectedNodeId) {
      this.cursor = { x: event.clientX, y: event.clientY };
    }
  }

  @HostListener('document:keydown', ['$event'])
  public onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      this.clearSelection();
    }
  }

  private findNodeId(element: HTMLElement): string | null {
    let el: HTMLElement | null = element;
    while (el && el !== document.body) {
      const id =
        el.getAttribute('data-node-id') || el.getAttribute('data-id') || el.id;
      if (id) return id;
      el = el.parentElement;
    }
    return null;
  }

  private highlight(id: string) {
    this.clearHighlight();
    const el = getNodeEl(id);
    if (!el) return;
    this.highlightedEl = el;
    el.style.outline = '2px solid #1976d2';
  }

  private clearSelection() {
    this.clearHighlight();
    this.selectedNodeId = null;
    this.cursor = null;
  }

  private clearHighlight() {
    if (this.highlightedEl) {
      this.highlightedEl.style.outline = '';
      this.highlightedEl = null;
    }
  }
}
