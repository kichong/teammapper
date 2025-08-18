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

// Initialization process of a map:
// 1) Render the wrapper element inside the map angular html component
// 2) Wait for data fetching completion (triggered within application component)
// 3) Init mmp library and fill map with data when available
// 4) Register to server events
@Component({
  selector: 'teammapper-application',
  templateUrl: './application.component.html',
  styleUrls: ['./application.component.scss'],
  standalone: false,
})
export class ApplicationComponent implements OnInit, OnDestroy {
  public node: Observable<ExportNodeProperties>;
  public editMode: Observable<boolean>;
  public links: Link[] = []; // stored links
  public linkingFrom: string | null = null; // first selected node
  public cursor: { x: number; y: number } | null = null; // cursor while linking

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

    // keep links updated
    this.linksService.links$.subscribe(links => (this.links = links));
    // reset selection when link mode is turned off
    this.linksService.linkMode$.subscribe(active => {
      if (!active) {
        this.linkingFrom = null;
        this.cursor = null;
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

  // Initializes the map by either loading an existing one or creating a new one
  private async initMap() {
    const givenId: string = this.route.snapshot.paramMap.get('id');
    const modificationSecret: string = this.route.snapshot.fragment;
    const map: ServerMap = await this.loadAndPrepareWithMap(
      givenId,
      modificationSecret
    );

    // If the map cannot be loaded, go to the main editor
    if (!map) {
      this.router.navigate(['/map']);
      return;
    }

    // load saved links for this map
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

  // Listen to clicks when link mode is active
  @HostListener('document:click', ['$event'])
  public onDocumentClick(event: MouseEvent) {
    if (!this.linksService.isLinkModeActive()) return;
    const nodeId = this.findNodeId(event.target as HTMLElement);
    if (!nodeId) return;
    if (!this.linkingFrom) {
      this.linkingFrom = nodeId;
    } else if (this.linkingFrom !== nodeId) {
      this.linksService.addLink(this.linkingFrom, nodeId);
      this.linkingFrom = null;
      this.cursor = null;
    }
  }

  // Track the cursor for the temporary line
  @HostListener('document:mousemove', ['$event'])
  public onDocumentMove(event: MouseEvent) {
    if (this.linkingFrom) {
      this.cursor = { x: event.clientX, y: event.clientY };
    }
  }

  // Try to find a node id from the clicked element
  private findNodeId(element: HTMLElement): string | null {
    let el: HTMLElement | null = element;
    while (el && el !== document.body) {
      const id =
        el.getAttribute('data-node-id') ||
        el.getAttribute('data-id') ||
        el.id;
      if (id) return id;
      el = el.parentElement;
    }
    return null;
  }
}
