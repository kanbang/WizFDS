import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';

import { Main } from '@services/main/main';
import { Fds } from '@services/fds-object/fds-object';
import { UiState } from '@services/ui-state/ui-state';
import { Library } from '@services/library/library';
import { Spec } from '@services/fds-object/specie/spec';
import { MainService } from '@services/main/main.service';
import { UiStateService } from '@services/ui-state/ui-state.service';
import { LibraryService } from '@services/library/library.service';
import { IdGeneratorService } from '@services/id-generator/id-generator.service';
import { species } from '@enums/fds/enums/fds-enums-species';

import { PerfectScrollbarComponent } from 'ngx-perfect-scrollbar';
import { find, findIndex, cloneDeep, set, map, filter } from 'lodash';
import { FdsEnums } from '@enums/fds/enums/fds-enums';

@Component({
  selector: 'app-spec',
  templateUrl: './spec.component.html',
  styleUrls: ['./spec.component.scss']
})
export class SpecComponent implements OnInit, OnDestroy {

  // Global objects
  main: Main;
  fds: Fds;
  ui: UiState;
  lib: Library;

  // Component objects
  specs: Spec[];
  libSpecs: Spec[];
  spec: Spec;
  specOld: Spec;
  objectType: string = 'current'; // Lib or current
  lumpedSpecs: Spec[];

  // Enums
  SPECIES: Spec[];
  ENUMS_SPEC = FdsEnums.SPEC;

  mainSub;
  uiSub;
  libSub;

  // Scrolbars containers
  @ViewChild('specScrollbar', {static: false}) specScrollbar: PerfectScrollbarComponent;
  @ViewChild('libSpecScrollbar', {static: false}) libSpecScrollbar: PerfectScrollbarComponent;

  constructor(
    private mainService: MainService,
    private uiStateService: UiStateService,
    private libraryService: LibraryService
  ) { }

  ngOnInit() {
    console.clear();
    // Subscribe main object
    this.mainSub = this.mainService.getMain().subscribe(main => this.main = main);
    this.uiSub = this.uiStateService.uiObservable.subscribe(uiObservable => this.ui = uiObservable);
    this.libSub = this.libraryService.getLibrary().subscribe(lib => this.lib = lib);

    // Assign to local variables
    this.fds = this.main.currentFdsScenario.fdsObject;
    this.specs = this.main.currentFdsScenario.fdsObject.specie.specs;
    this.libSpecs = this.lib.specs;

    // Activate last element
    this.specs.length > 0 ? this.spec = this.specs[this.ui.specie['spec'].elementIndex] : this.spec = undefined;

    this.SPECIES = map(species, function (o) { return new Spec(JSON.stringify(o)) });
    this.lumpedSpecs = this.getLumpedSpecies();
  }

  ngAfterViewInit() {
    // Set scrollbars position y after view rendering and set last selected element
    this.specScrollbar.directiveRef.scrollToY(this.ui.specie['spec'].scrollPosition);
    this.specs.length > 0 && this.activate(this.specs[this.ui.specie['spec'].elementIndex].id);
  }

  ngOnDestroy() {
    this.mainSub.unsubscribe();
    this.uiSub.unsubscribe();
    this.libSub.unsubscribe();
  }

  /** Activate element on click */
  public activate(id: string, library?: boolean) {
    if (!library) {
      this.objectType = 'current';
      this.spec = find(this.fds.specie.specs, function (o) { return o.id == id; });
      this.ui.specie['spec'].elementIndex = findIndex(this.specs, { id: id });
      this.specOld = cloneDeep(this.spec);
    }
    else {
      this.objectType = 'library';
      this.spec = find(this.lib.specs, function (o) { return o.id == id; });
      this.ui.specie['libSpec'].elementIndex = findIndex(this.libSpecs, { id: id });
      this.specOld = cloneDeep(this.spec);
    }
    this.lumpedSpecs = this.getLumpedSpecies();
  }

  /** Push new element */
  public add(library?: boolean) {
    // Create new fire object with unique id
    if (!library) {
      let element = { id: 'SPEC' + this.mainService.getListId(this.specs, 'spec') };
      this.specs.push(new Spec(JSON.stringify(element)));
      this.activate(element.id);
    }
    else {
      let element = { id: 'SPEC' + this.mainService.getListId(this.libSpecs, 'spec') };
      this.libSpecs.push(new Spec(JSON.stringify(element)));
      this.activate(element.id, true);
    }
  }

  /** Delete element */
  public delete(id: string, library?: boolean) {
    if (!library) {
      let index = findIndex(this.specs, { id: id });
      this.specs.splice(index, 1);
      if (index != 0) {
        this.specs.length == 0 ? this.spec = undefined : this.activate(this.specs[index - 1].id);
      }
      else {
        this.specs.length == 0 ? this.spec = undefined : this.activate(this.specs[index].id);
      }
    }
    else {
      let index = findIndex(this.libSpecs, { id: id });
      this.libSpecs.splice(index, 1);
      if (index != 0) {
        this.libSpecs.length == 0 ? this.spec = undefined : this.activate(this.libSpecs[index - 1].id, true);
      }
      else {
        this.libSpecs.length == 0 ? this.spec = undefined : this.activate(this.libSpecs[index].id, true);
      }
    }
  }

  /** Update scroll position */
  public scrollbarUpdate(element: string) {
    set(this.ui.specie, element + '.scrollPosition', this[element + 'Scrollbar'].directiveRef.geometry().y);
  }

  /** Toggle library */
  public toggleLibrary() {
    this.ui.specie['spec'].lib == 'closed' ? this.ui.specie['spec'].lib = 'opened' : this.ui.specie['spec'].lib = 'closed';
  }

  /** Import from library */
  public importLibraryItem(id: string) {
    let idGeneratorService = new IdGeneratorService;
    let libSpec = find(this.lib.specs, function (o) { return o.id == id; });
    let spec = cloneDeep(libSpec);
    spec.uuid = idGeneratorService.genUUID()
    this.specs.push(spec);
  }

  // COMPONENT METHODS
  public getLumpedSpecies(): Spec[] {
    let lumpedSpecs = [];
    if (this.objectType == 'current') {
      lumpedSpecs = filter(this.specs, function (o: Spec) {
        return o.lumped_component_only;
      });
    }
    else if (this.objectType == 'library') {
      lumpedSpecs = filter(this.libSpecs, function (o: Spec) {
        return o.lumped_component_only;
      });
    }

    return lumpedSpecs;
  }
  /**
   * Add specie
   */
  public addSpecie() {
    this.spec.lumpedSpecs.push({ spec: undefined, mass_fraction: 0, volume_fraction: 0 });
  }

  /**
   * Delete specie
   * @param index Array index
   */
  public deleteSpecie(index: number) {
    this.spec.lumpedSpecs.splice(index, 1);
  }

}
