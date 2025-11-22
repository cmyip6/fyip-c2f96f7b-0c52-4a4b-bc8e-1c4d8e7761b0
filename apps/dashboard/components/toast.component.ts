import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ToastType = 'error' | 'success' | 'info';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed top-6 right-6 z-[100] animate-slide-in font-sans">
      <div
        [ngClass]="{
          'border-red-900/80': type === 'error',
          'border-lime-900/80': type === 'success',
          'border-slate-600/80': type === 'info',
        }"
        class="bg-[#2A2F35] border-l-[6px] shadow-[0_8px_20px_rgba(0,0,0,0.8)] rounded-sm ring-1 ring-white/5 p-4 max-w-sm w-80 flex items-start gap-4 transition-all relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/5 before:to-transparent before:pointer-events-none"
      >
        <div
          class="shrink-0 mt-0.5 relative z-10"
          [ngClass]="{
            'text-red-500/90': type === 'error',
            'text-lime-500/90': type === 'success',
            'text-slate-400': type === 'info',
          }"
        >
          <svg
            *ngIf="type === 'error'"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            class="w-6 h-6"
          >
            <path
              fill-rule="evenodd"
              d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z"
              clip-rule="evenodd"
            />
          </svg>

          <svg
            *ngIf="type === 'success'"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            class="w-6 h-6"
          >
            <path
              fill-rule="evenodd"
              d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
              clip-rule="evenodd"
            />
          </svg>

          <svg
            *ngIf="type === 'info'"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            class="w-6 h-6"
          >
            <path
              fill-rule="evenodd"
              d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 01.67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 01-.671-1.34l.041-.022zM12 9a.75.75 0 100-1.5.75.75 0 000 1.5z"
              clip-rule="evenodd"
            />
          </svg>
        </div>

        <div class="flex-1 min-w-0 relative z-10">
          <!-- Title: Uppercase, aged brass color, mono/stencil font style -->
          <h3
            class="font-bold text-amber-50/90 text-sm uppercase tracking-wider font-mono"
          >
            {{ title }}
          </h3>
          <!-- Body: Muted gray -->
          <p
            class="text-sm text-gray-400 mt-2 break-words leading-snug font-medium"
          >
            {{ message }}
          </p>
        </div>

        <button
          (click)="close.emit()"
          class="text-gray-500 hover:text-amber-50/80 transition-colors relative z-10"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
            class="w-5 h-5"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      .animate-slide-in {
        animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
    `,
  ],
})
export class ToastComponent {
  @Input() type: ToastType = 'info';
  @Input() title = '';
  @Input() message = '';
  @Output() close = new EventEmitter<void>();
}
