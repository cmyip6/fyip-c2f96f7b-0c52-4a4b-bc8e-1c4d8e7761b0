import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ErrorService } from '../services/error.service';
import { ToastComponent } from './toast.component';

@Component({
  selector: 'app-global-error',
  standalone: true,
  imports: [CommonModule, ToastComponent],
  template: `
    <app-toast
      *ngIf="errorService.error() as error"
      type="error"
      [title]="'Error ' + error.statusCode"
      [message]="formatMessage(error.message)"
      (close)="errorService.clear()"
    >
    </app-toast>
  `,
})
export class GlobalErrorComponent {
  errorService = inject(ErrorService);

  formatMessage(msg: string | string[]): string {
    return Array.isArray(msg) ? msg.join(', ') : msg;
  }
}
