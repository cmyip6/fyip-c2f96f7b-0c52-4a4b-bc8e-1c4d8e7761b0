import {
  Component,
  inject,
  signal,
  computed,
  effect,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  DragDropModule,
  CdkDragDrop,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { TaskApiService } from '../api-services/task-api.service';
import { SessionService } from '../services/session.service';
import { TaskCardComponent } from '../components/task-card.component';
import { TopBarComponent } from '../components/topBar/top-bar.component';
import { ConfirmationModalComponent } from '../components/modals/confirmation-modal.component';
import { GetTaskResponseInterface } from '@libs/data/type/get-task-response.interface';
import { OrganizationApiService } from '../api-services/organization-api.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DragDropModule,
    TaskCardComponent,
    TopBarComponent,
    ConfirmationModalComponent,
  ],
  template: `
    <div
      class="min-h-screen bg-[#1a1d21] font-sans relative selection:bg-amber-900 selection:text-white"
    >
      <div
        class="fixed inset-0 opacity-5 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"
      ></div>

      <app-top-bar></app-top-bar>

      <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <!-- Dashboard Header -->
        <div
          class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 border-b border-white/5 pb-6"
        >
          <div>
            <h1
              class="text-2xl font-bold text-gray-200 uppercase tracking-widest font-mono flex items-center gap-3"
            >
              <span class="w-2 h-8 bg-amber-600 block"></span>
              Active Operations
            </h1>
            <p class="text-gray-500 text-xs font-mono mt-2 tracking-wider ml-5">
              SECTOR: {{ session.currentOrg()?.name || 'UNKNOWN' }} // TASK
              ALLOCATION
            </p>
          </div>

          <div class="flex items-center gap-3">
            <!-- Conditional Search Input (Moved Here) -->
            <div
              *ngIf="showSearch()"
              class="relative w-64 animate-in fade-in slide-in-from-right-8 duration-300 origin-right"
            >
              <div
                class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
              >
                <span class="text-amber-500 font-mono text-xs animate-pulse"
                  >>_</span
                >
              </div>
              <input
                type="text"
                (input)="onSearchInput($event)"
                class="w-full bg-black/30 border border-amber-900/30 text-gray-300 text-xs font-mono py-2.5 pl-8 pr-8 rounded-sm focus:border-amber-600/50 focus:ring-1 focus:ring-amber-900/50 outline-none placeholder-gray-700 transition-all"
                placeholder="SEARCH..."
                autofocus
              />
              <!-- Loading Indicator -->
              <div
                *ngIf="isSearching()"
                class="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <svg
                  class="animate-spin h-3 w-3 text-amber-500"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="4"
                  ></circle>
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              </div>
            </div>

            <!-- Search Toggle Button -->
            <button
              (click)="toggleSearch()"
              [class.text-amber-500]="showSearch()"
              [class.bg-amber-900/20]="showSearch()"
              [class.border-amber-600/50]="showSearch()"
              class="p-2.5 text-gray-400 hover:text-amber-500 bg-black/20 border border-white/10 hover:border-amber-600/50 rounded-sm transition-all"
              title="Toggle Search Protocol"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="w-4 h-4"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                />
              </svg>
            </button>

            <button
              (click)="showCreateModal = true"
              class="group flex items-center gap-2 px-5 py-2.5 bg-amber-700/10 hover:bg-amber-700/20 border border-amber-600/50 text-amber-500 hover:text-amber-400 transition-all rounded-sm uppercase text-xs font-bold tracking-widest shadow-[0_0_10px_rgba(245,158,11,0.1)] hover:shadow-[0_0_20px_rgba(245,158,11,0.2)]"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                class="w-4 h-4 group-hover:rotate-90 transition-transform"
              >
                <path
                  d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z"
                />
              </svg>
              Initialize Task
            </button>
          </div>
        </div>

        <!-- Task Grid with Drag & Drop -->
        <div
          cdkDropList
          cdkDropListOrientation="mixed"
          (cdkDropListDropped)="drop($event)"
          class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8"
        >
          <!-- Wrapped in cdkDrag -->
          <div
            *ngFor="let task of tasks()"
            cdkDrag
            class="relative group cursor-move"
          >
            <div *cdkDragPlaceholder class="opacity-0"></div>

            <div
              class="absolute -top-1 -left-1 w-2 h-2 border-t border-l border-gray-600/30 group-hover:border-amber-600/50 transition-colors z-0"
            ></div>
            <div
              class="absolute -bottom-1 -right-1 w-2 h-2 border-b border-r border-gray-600/30 group-hover:border-amber-600/50 transition-colors z-0"
            ></div>

            <app-task-card
              class="relative z-10 block h-full"
              [task]="task"
              (statusChange)="updateStatus(task.id, $event)"
              (delete)="initiateDelete(task.id)"
            >
            </app-task-card>
          </div>
        </div>

        <!-- Empty State -->
        <div
          *ngIf="tasks().length === 0"
          class="py-20 text-center border-2 border-dashed border-white/5 rounded-sm bg-black/20 mb-8"
        >
          <div class="inline-block p-4 rounded-full bg-white/5 mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="w-8 h-8 text-gray-600"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z"
              />
            </svg>
          </div>
          <h3
            class="text-gray-400 font-mono text-sm uppercase tracking-widest"
          >
            No Active Directives
          </h3>
          <p class="text-gray-600 text-xs mt-1">
            {{
              searchQuery()
                ? 'No matches found for search criteria'
                : "Unit '" + session.currentOrg()?.name + "' awaiting input"
            }}
          </p>
        </div>

        <!-- Pagination Controls -->
        <div
          *ngIf="tasks().length > 0 || pageNumber() > 1"
          class="flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-white/5 pt-6 font-mono"
        >
          <div class="text-[10px] uppercase tracking-widest text-gray-500">
            Displaying page
            <span class="text-amber-500 font-bold">{{ pageNumber() }}</span> of
            <span class="text-gray-400">{{ totalPages() }}</span>
            <span class="mx-2">|</span>
            Total Records:
            <span class="text-gray-400">{{ totalRecords() }}</span>
          </div>

          <div class="flex items-center gap-2">
            <button
              (click)="changePage(pageNumber() - 1)"
              [disabled]="pageNumber() <= 1"
              class="px-4 py-2 bg-black/20 border border-white/10 hover:border-amber-600/50 text-gray-400 hover:text-amber-500 disabled:opacity-30 disabled:cursor-not-allowed rounded-sm text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="2"
                stroke="currentColor"
                class="w-3 h-3"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M15.75 19.5 8.25 12l7.5-7.5"
                />
              </svg>
              PREV
            </button>

            <button
              (click)="changePage(pageNumber() + 1)"
              [disabled]="pageNumber() >= totalPages()"
              class="px-4 py-2 bg-black/20 border border-white/10 hover:border-amber-600/50 text-gray-400 hover:text-amber-500 disabled:opacity-30 disabled:cursor-not-allowed rounded-sm text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2"
            >
              NEXT
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="2"
                stroke="currentColor"
                class="w-3 h-3"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="m8.25 4.5 7.5 7.5-7.5 7.5"
                />
              </svg>
            </button>
          </div>
        </div>
      </main>

      <!-- Create Task Modal -->
      <div
        *ngIf="showCreateModal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div
          class="absolute inset-0 bg-black/80 backdrop-blur-sm"
          (click)="showCreateModal = false"
        ></div>

        <div
          class="bg-[#2A2F35] border border-white/10 w-full max-w-md relative z-10 shadow-2xl rounded-sm"
        >
          <div
            class="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-black/20"
          >
            <h3
              class="text-amber-500 font-bold uppercase tracking-widest text-sm font-mono"
            >
              New Directive
            </h3>
            <button
              (click)="showCreateModal = false"
              class="text-gray-500 hover:text-gray-300"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="w-5 h-5"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M6 18 18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div class="p-6 space-y-5">
            <div class="space-y-2">
              <label
                class="text-[10px] uppercase font-bold text-gray-500 tracking-widest"
                >Operation Title</label
              >
              <input
                [(ngModel)]="newTask.title"
                class="w-full bg-black/30 border border-white/10 text-gray-200 text-sm p-3 rounded-sm focus:border-amber-600/50 outline-none font-mono placeholder-gray-700"
                placeholder="ENTER TITLE"
              />
            </div>

            <div class="space-y-2">
              <label
                class="text-[10px] uppercase font-bold text-gray-500 tracking-widest"
                >Mission Details</label
              >
              <textarea
                [(ngModel)]="newTask.description"
                rows="3"
                class="w-full bg-black/30 border border-white/10 text-gray-200 text-sm p-3 rounded-sm focus:border-amber-600/50 outline-none font-mono placeholder-gray-700"
                placeholder="ENTER DESCRIPTION"
              ></textarea>
            </div>
          </div>

          <div
            class="px-6 py-4 border-t border-white/10 flex justify-end gap-3 bg-black/20"
          >
            <button
              (click)="showCreateModal = false"
              class="px-4 py-2 text-xs font-bold uppercase text-gray-500 hover:text-gray-300 tracking-wider"
            >
              Cancel
            </button>
            <button
              (click)="createTask()"
              class="px-6 py-2 bg-amber-700/20 hover:bg-amber-700/30 border border-amber-700/50 text-amber-500 text-xs font-bold uppercase tracking-widest rounded-sm transition-all"
            >
              Confirm
            </button>
          </div>
        </div>
      </div>

      <!-- DELETE CONFIRMATION MODAL -->
      <app-confirmation-modal
        *ngIf="pendingDeleteId()"
        title="Purge Warning"
        message="You are about to permanently delete this directive. This operation cannot be reversed."
        (confirm)="confirmDelete()"
        (cancel)="pendingDeleteId.set(null)"
      >
      </app-confirmation-modal>
    </div>
  `,
  styles: [
    `
      .cdk-drag-preview {
        box-sizing: border-box;
        border-radius: 0.125rem;
        box-shadow:
          0 20px 25px -5px rgba(0, 0, 0, 0.8),
          0 10px 10px -5px rgba(0, 0, 0, 0.8);
        opacity: 0.95;
      }
      .cdk-drag-placeholder {
        opacity: 0.3;
        background: rgba(255, 255, 255, 0.05);
        border: 1px dashed rgba(255, 255, 255, 0.2);
      }
      .cdk-drag-animating {
        transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
      }
      .grid.cdk-drop-list-dragging .group:not(.cdk-drag-placeholder) {
        transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
      }
    `,
  ],
})
export class DashboardComponent implements OnDestroy, OnInit {
  private api = inject(TaskApiService);
  private orgApi = inject(OrganizationApiService);
  private router = inject(Router);
  session = inject(SessionService);

  tasks = signal<GetTaskResponseInterface[]>([]);
  pageNumber = signal(1);
  pageSize = signal(9);
  totalRecords = signal(0);
  pendingDeleteId = signal<number | null>(null);
  totalPages = computed(() => Math.ceil(this.totalRecords() / this.pageSize()));

  // Search State
  showSearch = signal(false);
  searchQuery = signal('');
  isSearching = signal(false);
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  showCreateModal = false;
  newTask = { title: '', description: '' };

  constructor() {
    this.searchSubject
      .pipe(
        debounceTime(1000),
        distinctUntilChanged(),
        takeUntil(this.destroy$),
      )
      .subscribe((term) => {
        this.isSearching.set(false);
        this.pageNumber.set(1);
        this.searchQuery.set(term);
      });

    effect(() => {
      const orgId = this.session.selectedOrgId();
      const page = this.pageNumber();
      const size = this.pageSize();
      const search = this.searchQuery();

      if (orgId) {
        this.loadTasks(orgId, page, size, search);
      } else {
        this.tasks.set([]);
      }
    });
  }

  ngOnInit() {
    if (this.session.organizations().length === 0) {
      this.orgApi.getOrganizations().subscribe({
        next: (orgs) => {
          if (orgs.length > 0) {
            this.session.setOrganizations(orgs);
            this.session.selectOrganization(orgs[0].id);
          }
        },
        error: () => this.router.navigate(['/']),
      });
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleSearch() {
    this.showSearch.update((v) => !v);
    if (!this.showSearch()) {
      this.onSearchInput({ target: { value: '' } });
    }
  }

  onSearchInput(event: Event | { target: { value: string } }) {
    const val = (event.target as HTMLInputElement).value;
    this.isSearching.set(true);
    this.searchSubject.next(val);
  }

  loadTasks(orgId: number, page: number, size: number, search?: string) {
    this.api.getTasks(orgId, page, size, search).subscribe((res) => {
      this.tasks.set(res.data);
      this.totalRecords.set(res.metadata.totalRecords);
      if (page > 1 && res.data.length === 0) {
        this.pageNumber.set(page - 1);
      }
    });
  }

  changePage(newPage: number) {
    if (newPage >= 1 && newPage <= this.totalPages()) {
      this.pageNumber.set(newPage);
    }
  }

  createTask() {
    const orgId = this.session.selectedOrgId();
    if (!this.newTask.title || !orgId) return;

    this.api
      .createTask({
        ...this.newTask,
        organizationId: orgId,
      })
      .subscribe(() => {
        this.loadTasks(
          orgId,
          this.pageNumber(),
          this.pageSize(),
          this.searchQuery(),
        );
        this.showCreateModal = false;
        this.newTask = { title: '', description: '' };
      });
  }

  updateStatus(id: number, status: string) {
    const orgId = this.session.selectedOrgId();
    if (orgId) {
      this.api
        .updateTask(id, { status })
        .subscribe(() =>
          this.loadTasks(
            orgId,
            this.pageNumber(),
            this.pageSize(),
            this.searchQuery(),
          ),
        );
    }
  }

  initiateDelete(id: number) {
    this.pendingDeleteId.set(id);
  }

  confirmDelete() {
    const id = this.pendingDeleteId();
    const orgId = this.session.selectedOrgId();

    if (id && orgId) {
      this.api.deleteTask(id).subscribe(() => {
        this.loadTasks(
          orgId,
          this.pageNumber(),
          this.pageSize(),
          this.searchQuery(),
        );
        this.pendingDeleteId.set(null);
      });
    }
  }

  drop(event: CdkDragDrop<GetTaskResponseInterface[]>) {
    if (event.previousIndex === event.currentIndex) return;

    const currentTasks = [...this.tasks()];

    moveItemInArray(currentTasks, event.previousIndex, event.currentIndex);
    this.tasks.set(currentTasks);

    const movedTask = currentTasks[event.currentIndex];
    this.api.updateTask(movedTask.id, { index: event.currentIndex }).subscribe({
      error: () => {
        console.error('Failed to update task order');
      },
    });
  }
}
