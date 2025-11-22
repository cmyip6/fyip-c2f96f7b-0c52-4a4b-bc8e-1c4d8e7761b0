import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskApiService } from '../api-services/task.service';
import { TaskCardComponent } from '../components/task-card.component';
import { TopBarComponent } from '../components/top-bar.component';
import { GetTaskResponseInterface } from '../../../libs/data/type/get-task-response.interface';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, TaskCardComponent, TopBarComponent],
  template: `
    <div
      class="min-h-screen bg-[#1a1d21] font-sans relative selection:bg-amber-900 selection:text-white"
    >
      <!-- Background Texture -->
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
              SECTOR 7 // TASK ALLOCATION
            </p>
          </div>

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

        <!-- Task Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div *ngFor="let task of tasks()" class="relative group">
            <!-- Decorative Corner Markers for Grid Items -->
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
              (delete)="deleteTask(task.id)"
            >
            </app-task-card>
          </div>
        </div>

        <!-- Empty State -->
        <div
          *ngIf="tasks().length === 0"
          class="py-20 text-center border-2 border-dashed border-white/5 rounded-sm bg-black/20"
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
          <h3 class="text-gray-400 font-mono text-sm uppercase tracking-widest">
            No Active Directives
          </h3>
          <p class="text-gray-600 text-xs mt-1">System awaiting input</p>
        </div>
      </main>

      <!-- Create Task Modal -->
      <div
        *ngIf="showCreateModal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-black/80 backdrop-blur-sm"
          (click)="showCreateModal = false"
        ></div>

        <!-- Modal Content -->
        <div
          class="bg-[#2A2F35] border border-white/10 w-full max-w-md relative z-10 shadow-2xl rounded-sm"
        >
          <!-- Modal Header -->
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

          <!-- Modal Body -->
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

          <!-- Modal Footer -->
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
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  private api = inject(TaskApiService);
  tasks = signal<GetTaskResponseInterface[]>([]);

  // Modal State
  showCreateModal = false;
  newTask = { title: '', description: '' };

  ngOnInit() {
    this.loadTasks();
  }

  loadTasks() {
    this.api.getTasks().subscribe((tasks) => this.tasks.set(tasks));
  }

  createTask() {
    if (!this.newTask.title) return;

    this.api.createTask(this.newTask).subscribe(() => {
      this.loadTasks();
      this.showCreateModal = false;
      this.newTask = { title: '', description: '' };
    });
  }

  updateStatus(id: number, status: any) {
    this.api.updateTaskStatus(id, status).subscribe(() => this.loadTasks());
  }

  deleteTask(id: number) {
    if (confirm('Are you sure you want to purge this directive?')) {
      this.api.deleteTask(id).subscribe(() => this.loadTasks());
    }
  }
}
