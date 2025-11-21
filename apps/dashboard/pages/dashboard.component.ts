import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskApiService } from '../api-services/task-service';
import { TaskCardComponent } from '../components/task-card.component';
import { GetTaskResponseInterface } from '../../../libs/data/type';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, TaskCardComponent],
  template: `
    <div class="p-6 bg-gray-50 min-h-screen">
      <h1 class="text-2xl font-bold mb-6">My Tasks</h1>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <app-task-card
          *ngFor="let task of tasks()"
          [task]="task"
          (statusChange)="updateStatus(task.id, $event)"
          (delete)="deleteTask(task.id)"
        >
        </app-task-card>
      </div>
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  private api = inject(TaskApiService);
  tasks = signal<GetTaskResponseInterface[]>([]);

  ngOnInit() {
    this.loadTasks();
  }

  loadTasks() {
    this.api.getTasks().subscribe((tasks) => this.tasks.set(tasks));
  }

  updateStatus(id: number, status: any) {
    this.api.updateTaskStatus(id, status).subscribe(() => this.loadTasks());
  }

  deleteTask(id: number) {
    if (confirm('Are you sure?')) {
      this.api.deleteTask(id).subscribe(() => this.loadTasks());
    }
  }
}
