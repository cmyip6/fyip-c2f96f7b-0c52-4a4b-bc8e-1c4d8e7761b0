import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GetTaskResponseInterface } from '../../../libs/data/type';

@Component({
  selector: 'app-task-card',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white p-4 rounded shadow border border-gray-200">
      <div class="flex justify-between mb-2">
        <span
          class="px-2 py-1 rounded text-xs font-bold"
          [ngClass]="{
            'bg-green-100 text-green-800': task.status === 'DONE',
            'bg-blue-100 text-blue-800': task.status === 'IN_PROGRESS',
            'bg-gray-100 text-gray-800': task.status === 'OPEN',
          }"
        >
          {{ task.status }}
        </span>
        <button
          (click)="delete.emit(task.id)"
          class="text-red-500 hover:text-red-700"
        >
          &times;
        </button>
      </div>
      <h3 class="font-bold">{{ task.title }}</h3>
      <p class="text-sm text-gray-600 mb-4">{{ task.description }}</p>

      <select
        [ngModel]="task.status"
        (ngModelChange)="statusChange.emit($event)"
        class="text-xs bg-gray-50 border-none rounded cursor-pointer"
      >
        <option value="OPEN">Open</option>
        <option value="IN_PROGRESS">In Progress</option>
        <option value="DONE">Done</option>
      </select>
    </div>
  `,
})
export class TaskCardComponent {
  @Input() task!: GetTaskResponseInterface;
  @Output() statusChange = new EventEmitter<any>();
  @Output() delete = new EventEmitter<number>();
}
