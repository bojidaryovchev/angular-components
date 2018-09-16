import { Component, OnInit, Input, OnChanges, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-pagination',
  templateUrl: './pagination.component.html',
  styleUrls: ['./pagination.component.scss']
})
export class PaginationComponent implements OnInit, OnChanges {
  @Input() totalPages: number = 4;
  @Input() total: number;
  @Input() limit: number;
  @Input() currentPage: number = 0;
  @Output() pageChange: EventEmitter<number> = new EventEmitter();

  pages: number[] = [];

  constructor() { }

  ngOnInit() {
    this.initPages();
  }

  ngOnChanges() {
    this.initPages();
  }

  navigate(page: number) {
    this.pageChange.emit(page);
    this.currentPage = page;
    this.initPages();
  }

  navigateToStart() {
    this.navigate(0);
  }

  navigateToEnd() {
    const totalPages = Math.ceil(this.total / this.limit);

    this.navigate(totalPages ? totalPages - 1 : 0);
  }

  private initPages() {
    if (!this.total || !this.limit) {
      return;
    }
    
    this.pages = [];

    const pagesCount = Math.ceil(this.total / this.limit);

    let i = this.currentPage ? this.currentPage - 1 : 0;

    if (pagesCount - this.currentPage < this.totalPages) {
      i = pagesCount - this.totalPages; 
      i = i < 0 ? 0 : i;
    }

    for (let pages = 0; pages < this.totalPages && i < pagesCount; i++, pages++) {
      this.pages.push(i);
    }
  }
}
