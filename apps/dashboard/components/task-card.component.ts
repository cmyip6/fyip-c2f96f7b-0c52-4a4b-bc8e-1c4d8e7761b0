import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GetTaskResponseInterface } from '@libs/data/type/get-task-response.interface';

@Component({
  selector: 'app-task-card',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div
      class="h-full bg-[#2A2F35] border-l-4 border-white/5 relative p-5 shadow-lg group hover:border-amber-600/50 transition-all duration-300 flex flex-col justify-between"
    >
      <!-- Hover Scanline Effect -->
      <div
        class="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-500"
      ></div>

      <!-- Top Section -->
      <div>
        <div class="flex justify-between items-start mb-3 relative z-10">
          <!-- Status Badge (Tactical Style) -->
          <span
            class="px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest border"
            [ngClass]="{
              'bg-green-900/20 border-green-700/50 text-green-500':
                task.status === 'DONE',
              'bg-cyan-900/20 border-cyan-700/50 text-cyan-500':
                task.status === 'IN_PROGRESS',
              'bg-slate-700/20 border-slate-600/50 text-slate-400':
                task.status === 'OPEN',
            }"
          >
            [{{ task.status }}]
          </span>

          <!-- Delete Button -->
          <button
            (click)="delete.emit(task.id)"
            class="text-gray-600 hover:text-red-500 transition-colors focus:outline-none"
            title="Purge Directive"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="2"
              stroke="currentColor"
              class="w-4 h-4"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M6 18 18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <!-- Title & Description -->
        <h3
          class="text-gray-200 font-mono font-bold text-sm uppercase tracking-wide mb-2 group-hover:text-amber-500 transition-colors truncate"
        >
          {{ task.title }}
        </h3>
        <p
          class="text-xs text-gray-500 font-mono mb-4 leading-relaxed line-clamp-3"
        >
          {{ task.description || 'NO ADDITIONAL DATA' }}
        </p>
      </div>

      <!-- Bottom Section / Controls -->
      <div class="pt-4 border-t border-white/5 relative z-10">
        <label
          class="text-[8px] uppercase font-bold text-gray-600 tracking-widest block mb-1"
          >Update Status</label
        >

        <div class="relative">
          <select
            [ngModel]="task.status"
            (ngModelChange)="statusChange.emit($event)"
            class="w-full bg-black/30 border border-white/10 text-gray-400 text-xs font-mono py-2 pl-3 pr-8 rounded-sm focus:border-amber-600/50 focus:text-amber-500 outline-none appearance-none cursor-pointer hover:bg-black/50 transition-all"
          >
            <option value="OPEN">PENDING</option>
            <option value="IN_PROGRESS">ACTIVE</option>
            <option value="DONE">COMPLETE</option>
          </select>

          <!-- Custom Arrow -->
          <div
            class="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none"
          >
            <svg
              class="w-3 h-3 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 9l-7 7-7-7"
              ></path>
            </svg>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class TaskCardComponent {
  @Input() task!: GetTaskResponseInterface;
  @Output() statusChange = new EventEmitter<string>();
  @Output() delete = new EventEmitter<number>();
}
