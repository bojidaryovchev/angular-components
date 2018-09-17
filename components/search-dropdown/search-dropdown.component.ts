import {
  Component,
  Input,
  OnInit,
  EventEmitter,
  Output,
  ViewChild,
  ElementRef,
  ChangeDetectorRef
} from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

interface IItem {
  [key: string]: string;
}

@Component({
  selector: 'app-search-dropdown',
  styleUrls: ['./search-dropdown.component.scss'],
  templateUrl: './search-dropdown.component.html'
})
export class SearchDropdownComponent implements OnInit {
  @Input() items: IItem[];
  @Input() bindProperty: string;
  @Input() bindValue: string;
  @Input() bindItem: IItem;
  @Input() label: string = 'Project';
  @Input() currentlySelectedItem: IItem;
  @Input() typeahead: Subject<string>;

  @Output() itemSelected: EventEmitter<IItem> = new EventEmitter();

  @ViewChild('wrapper') wrapper: ElementRef<HTMLDivElement>;
  @ViewChild('input') input: ElementRef<HTMLInputElement>;
  @ViewChild('dropdown') dropdown: ElementRef<HTMLDivElement>;

  // debounce time in miliseconds (ms)
  private _inputDebounceTime: number = 350;

  inputDisabled: boolean = true;
  initialItems: IItem[];
  filteredItems: IItem[];
  lastlySelectedItem: IItem;
  subscriptions: Subscription[] = [];
  currentlySelectedParagraphItem: HTMLParagraphElement;
  lastlySearchedForValue: string;

  searchValueSubject: Subject<string> = new Subject();

  constructor (
    private readonly changeDetector: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.filteredItems = this.items.slice();
    this.initialItems = this.items.slice();

    if (this.bindValue && this.bindItem) {
      const selectedItem = this.items.find(i => i[this.bindValue] === this.bindItem[this.bindValue]);
      
      if (selectedItem) {
        this.currentlySelectedItem = selectedItem;
        this.input.nativeElement.value = selectedItem[this.bindProperty];
      }
    }

    this.subscriptions.push(
      this.searchValueSubject.pipe(
        debounceTime(this._inputDebounceTime)
      ).subscribe((value: string) => {
        if (this.input.nativeElement.value) {
          if (this.typeahead) {
            this.lastlySearchedForValue = value;
            this.typeahead.next(value);
          } else {
            this.filteredItems = this.getFilteredItemsBySearchValue(value);
            this.changeDetector.markForCheck();
          }
        }
      })
    );
  }
  
  ngAfterViewInit() {
    if (!this.currentlySelectedItem) {
      return;
    }

    const paragraphs: HTMLParagraphElement[] = Array.from(
      document.querySelectorAll('.dropdown-content > p')
    );

    this.currentlySelectedParagraphItem = paragraphs.find(
      p => p.innerText === this.currentlySelectedItem[this.bindProperty]
    );
  }

  ngOnChanges() {
    this.filteredItems = this.items.slice();

    // if a bindItem is provided
    if (this.bindItem) {
      // see if there is an item which bindProperty value equals to the bindItem's
      const item = this.items.find(i => i[this.bindProperty] === this.bindItem[this.bindProperty]);

      if (item) {
        // if there is such item, we need to clear its value and assign it as
        // our currently selected one
        const modifiedItem: {[key: string]: string} = {};

        // clear the value by removing any html tags
        modifiedItem[this.bindProperty] = this.removeHTMLTags(item[this.bindProperty]);

        // assign the item as the currently selected one
        this.currentlySelectedItem = Object.assign({}, item, modifiedItem);
        // set the input value to that item's value
        this.input.nativeElement.value = this.currentlySelectedItem[this.bindProperty];
      }
    }

    // we need to clear the input value in case the
    // selected item has gone from being something to being nothing
    if (!this.currentlySelectedItem && this.lastlySelectedItem) {
      this.input.nativeElement.value = null;
    }

    if (this.lastlySearchedForValue) {
      this.filteredItems = this.getFilteredItemsBySearchValue(this.lastlySearchedForValue);
    }
  }

  ngOnDestroy() {
    this.subscriptions.forEach(s => s.unsubscribe());
  }

  toggleDropdown(e: Event) {
    e.stopPropagation();

    this.inputDisabled = !this.inputDisabled;

    if (!this.inputDisabled) {
      setTimeout(() => {
        this.input.nativeElement.focus();

        if (this.currentlySelectedParagraphItem) {
          this.dropdown.nativeElement.scrollTop = this.currentlySelectedParagraphItem.offsetTop;
        }
      }, 0);
    }

    this.dropdown.nativeElement.classList.toggle('opened');
    this.input.nativeElement.classList.toggle('opened');

    const arrowSelector = '.arrow';
    const arrow = this.wrapper.nativeElement.querySelector(arrowSelector);

    arrow.classList.toggle('expanded');
  }

  clear(e: MouseEvent) {
    e.stopPropagation();

    setTimeout(() => this.input.nativeElement.focus(), 0);

    this.input.nativeElement.value = null;
    this.currentlySelectedItem = null;
    this.currentlySelectedParagraphItem = null;
    this.filteredItems = this.items.slice();
  }

  onItemSelected(item: IItem, pItem: HTMLParagraphElement) {
    // check if an item has already been selected
    if (this.currentlySelectedItem) {
      // check if the newly selected item is the same as the previous one
      if (item[this.bindProperty] === this.currentlySelectedItem[this.bindProperty]) {
        // return if its the same
        return;
      }
    }

    // remove the wrapping html span tags
    const itemBindPropertyValue = this.removeHTMLTags(item[this.bindProperty]);
    // set the input value to the item's clean value
    this.input.nativeElement.value = itemBindPropertyValue;

    // create an object to wrap the value in
    const modifiedItem: {[key: string]: string} = {};
    // save the value on the this.bindProperty key
    modifiedItem[this.bindProperty] = itemBindPropertyValue;
    // assign the newly selected object as our currently selected one
    this.currentlySelectedItem = Object.assign({}, item, modifiedItem);
    // keep track of the lastly selected item to react in ngOnChanges()
    this.lastlySelectedItem = Object.assign({}, this.currentlySelectedItem);
    // save the currently selected item's paragraph tag
    // so later we can scroll the dropdown to that item's coordinates
    this.currentlySelectedParagraphItem = pItem;

    // emit the selected item
    this.itemSelected.emit(this.currentlySelectedItem);
    // reinstantiate the filteredItems so the search is clear
    this.filteredItems = this.items.slice();
  }

  onInput(input: HTMLInputElement) {
    const value = input.value.toLowerCase();

    if (!value) {
      if (this.typeahead) {
        this.filteredItems = this.initialItems.slice();
      } else {
        this.filteredItems = this.items.slice();
      }

      return;
    }

    this.searchValueSubject.next(value);
  }

  private removeHTMLTags(text: string): string {
    const tagRegex: RegExp = /\<.+?\>/g;

    return text.replace(tagRegex, '');
  }

  private getFilteredItemsBySearchValue(value: string): IItem[] {
    const valueStartIndicesBySearchWordByWordByText: {[key: string]: {[key: string]: {[key: string]: number[]}}} = {};
    const searchWords = value.split(/\s+/g).filter(w => w);

    return this.items.filter(i => {
      const words = i[this.bindProperty].split(/\s+/g)
        .filter(w => w)
        .map(w => w.toLowerCase());

      let valueStartIndicesBySearchWordByWord: {[key: string]: {[key: string]: number[]}} = {};
      let anyWordContainsTheValue = false;
      
      words.forEach(w => {
        searchWords.forEach(sw => {
          const indices = this.getIndices(w, sw);

          if (indices.length) {
            if (valueStartIndicesBySearchWordByWord[w]) {
              if (valueStartIndicesBySearchWordByWord[w][sw]) {
                const indicesArray = valueStartIndicesBySearchWordByWord[w][sw];
                const uniqueIndices = indices.filter(
                  inx => indicesArray.indexOf(inx) === -1
                );
  
                valueStartIndicesBySearchWordByWord[w][sw] = indicesArray.concat(uniqueIndices);
              } else {
                valueStartIndicesBySearchWordByWord[w][sw] = indices;
              }
            } else {
              const valueStartIndicesBySearchWord: {[key: string]: number[]} = {};

              valueStartIndicesBySearchWord[sw] = indices;

              valueStartIndicesBySearchWordByWord[w] = valueStartIndicesBySearchWord;
            }

            anyWordContainsTheValue = true;
          }
        });
      });

      if (anyWordContainsTheValue) {
        valueStartIndicesBySearchWordByWordByText[i[this.bindProperty]] = valueStartIndicesBySearchWordByWord;
      }

      return anyWordContainsTheValue;
    })
    .map(i => {
      const valueStartIndicesBySearchWordByWord = valueStartIndicesBySearchWordByWordByText[i[this.bindProperty]];

      if (valueStartIndicesBySearchWordByWord) {
        const words = i[this.bindProperty].split(/\s+/g).filter(w => w);
        const wordStartIndicesByWord: {[key: string]: number[]} = {};

        words.forEach(w => {
          const indices = this.getIndices(i[this.bindProperty], w);
  
          if (indices.length) {
            wordStartIndicesByWord[w.toLowerCase()] = indices;
          }
        });

        const characters = i[this.bindProperty].split('');
        
        words.map(w => w.toLowerCase()).forEach(w => {
          if (valueStartIndicesBySearchWordByWord[w]) {
            searchWords.forEach(sw => {
              if (valueStartIndicesBySearchWordByWord[w][sw]) {
                wordStartIndicesByWord[w].forEach(wordStartIndex => {
                  valueStartIndicesBySearchWordByWord[w][sw].forEach(valueStartIndex => {
                    const startIndex = wordStartIndex + valueStartIndex;
                    const endIndex = startIndex + sw.length - 1;
    
                    characters[startIndex] = `<span class="highlighted">${characters[startIndex]}`;
                    characters[endIndex] = `${characters[endIndex]}</span>`;
                  });
                });
              }
            });
          }
        });

        const item: IItem = {};

        item[this.bindProperty] = characters.join('');

        return Object.assign({}, i, item);
      }
      
      return i;
    });
  }

  // the provided values must not contain whitespaces
  private getIndices(text: string, value: string) {
    const characters = Array.from(text);

    let indices = [];
    let index = text.indexOf(value);

    while (index > -1) {
      indices.push(index);
      
      for (let i = index, limit = i + value.length; i < limit; i++) {
        // we can safely mark with a space since we are expecting
        // parameters which do not contain whitespaces
        characters[i] = ' ';
      }

      index = characters.join('').indexOf(value);
    }

    return indices;
  };
}
