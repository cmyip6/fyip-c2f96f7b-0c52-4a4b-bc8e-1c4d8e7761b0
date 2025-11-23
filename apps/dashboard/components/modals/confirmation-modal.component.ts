import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirmation-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="fixed inset-0 z-[100] flex items-center justify-center p-4 font-sans"
    >
      <!-- Backdrop with heavy blur for focus -->
      <div
        class="absolute inset-0 bg-black/90 backdrop-blur-sm transition-opacity"
        (click)="cancel.emit()"
      ></div>

      <!-- Modal Card -->
      <div
        class="bg-[#1a1d21] border-2 border-red-900/60 w-full max-w-sm relative z-10 shadow-[0_0_50px_rgba(220,38,38,0.15)] rounded-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        <!-- Animated Scanline -->
        <div
          class="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,rgba(220,38,38,0.05)_50%,transparent_100%)] h-full w-full animate-scan pointer-events-none"
        ></div>

        <!-- Header -->
        <div
          class="bg-red-950/30 px-6 py-4 border-b border-red-900/30 flex items-center gap-3 relative"
        >
          <div
            class="p-1.5 bg-red-900/20 rounded-sm border border-red-500/30 animate-pulse"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="2"
              stroke="currentColor"
              class="w-5 h-5 text-red-500"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
              />
            </svg>
          </div>
          <h3
            class="text-red-500 font-bold font-mono tracking-widest uppercase text-sm drop-shadow-[0_0_5px_rgba(220,38,38,0.5)]"
          >
            {{ title }}
          </h3>
        </div>

        <!-- Body -->
        <div class="p-6 relative">
          <!-- Corner Accents -->
          <div
            class="absolute top-0 left-0 w-2 h-2 border-t border-l border-red-600/50"
          ></div>
          <div
            class="absolute top-0 right-0 w-2 h-2 border-t border-r border-red-600/50"
          ></div>
          <div
            class="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-red-600/50"
          ></div>
          <div
            class="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-red-600/50"
          ></div>

          <p
            class="text-gray-300 font-mono text-xs leading-relaxed tracking-wide text-center uppercase"
          >
            {{ message }}
          </p>
          <p
            class="text-red-800/80 text-[10px] font-mono mt-4 text-center uppercase tracking-widest font-bold"
          >
            ** This action cannot be undone **
          </p>
        </div>

        <!-- Footer -->
        <div
          class="px-6 py-4 bg-black/40 border-t border-red-900/30 flex justify-center gap-4"
        >
          <button
            (click)="cancel.emit()"
            class="px-6 py-2 border border-gray-700 hover:border-gray-500 text-gray-500 hover:text-gray-300 text-[10px] font-bold uppercase tracking-widest rounded-sm transition-all focus:outline-none focus:ring-1 focus:ring-gray-500"
          >
            Abort
          </button>

          <button
            (click)="confirm.emit()"
            class="group relative px-6 py-2 bg-red-900/20 border border-red-600/50 hover:bg-red-900/40 hover:border-red-500 text-red-500 hover:text-red-400 text-[10px] font-bold uppercase tracking-widest rounded-sm transition-all shadow-[0_0_15px_rgba(220,38,38,0.15)] hover:shadow-[0_0_25px_rgba(220,38,38,0.3)] focus:outline-none focus:ring-1 focus:ring-red-500"
          >
            <span class="relative z-10 group-hover:animate-pulse"
              >Confirm Purge</span
            >
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      @keyframes scan {
        0% {
          transform: translateY(-100%);
        }
        100% {
          transform: translateY(100%);
        }
      }
      .animate-scan {
        animation: scan 3s linear infinite;
      }
    `,
  ],
})
export class ConfirmationModalComponent {
  @Input() title = 'System Warning';
  @Input() message = 'Are you sure you want to proceed?';
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
}
