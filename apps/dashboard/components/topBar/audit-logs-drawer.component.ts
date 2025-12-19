import {
  Component,
  inject,
  signal,
  OnChanges,
  SimpleChanges,
  Input,
  Output,
  EventEmitter,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AuditLog,
  AuditLogService,
} from '../../api-services/audit-log.service';

@Component({
  selector: 'app-audit-logs-drawer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Backdrop (Visible on all screens now to allow closing by clicking outside) -->
    <div
      *ngIf="isVisible"
      class="fixed inset-0 bg-transparent z-30"
      (click)="close.emit()"
    ></div>

    <!-- Drawer Panel -->
    <div
      class="fixed top-16 bottom-0 left-0 z-40 w-full lg:w-[600px] bg-[#1a1d21]/95 border-r border-amber-900/30 shadow-[10px_0_30px_rgba(0,0,0,0.5)] transform transition-transform duration-300 ease-out font-mono flex flex-col"
      [class.translate-x-0]="isVisible"
      [class.-translate-x-full]="!isVisible"
    >
      <!-- Decorative Scanline -->
      <div
        class="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,rgba(245,158,11,0.02)_50%,transparent_100%)] pointer-events-none animate-scan"
      ></div>

      <!-- Header -->
      <div
        class="p-6 border-b border-white/5 bg-black/20 flex justify-between items-center relative z-10"
      >
        <div class="flex items-center gap-3">
          <div
            class="p-2 bg-amber-900/20 rounded-sm border border-amber-600/30"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="w-5 h-5 text-amber-500"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
              />
            </svg>
          </div>
          <div>
            <h2
              class="text-amber-500 font-bold uppercase tracking-widest text-sm"
            >
              System Logs
            </h2>
            <p class="text-[10px] text-gray-500 uppercase tracking-wide">
              Audit Trail // Classified
            </p>
          </div>
        </div>

        <button
          (click)="refreshLogs()"
          class="p-2 text-gray-500 hover:text-amber-500 transition-colors"
          title="Refresh Data"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="w-4 h-4"
            [class.animate-spin]="isLoading()"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
            />
          </svg>
        </button>
      </div>

      <!-- Content Area -->
      <div class="flex-1 overflow-y-auto p-0 relative z-10 custom-scrollbar">
        <table class="w-full text-left border-collapse">
          <thead class="sticky top-0 bg-[#1a1d21] z-20 shadow-md">
            <tr>
              <th
                class="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-white/10"
              >
                Timestamp
              </th>
              <th
                class="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-white/10"
              >
                Action
              </th>
              <th
                class="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-white/10 hidden sm:table-cell"
              >
                Entity
              </th>
              <th
                class="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-white/10 hidden md:table-cell"
              >
                Status Code
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5">
            <tr
              *ngFor="let log of logs()"
              class="hover:bg-white/5 transition-colors group"
            >
              <!-- Time -->
              <td class="px-6 py-4">
                <div class="text-xs text-gray-300 font-mono">
                  {{ log.createdAt | date: 'HH:mm:ss' }}
                </div>
                <div class="text-[10px] text-gray-600">
                  {{ log.createdAt | date: 'MMM d' }}
                </div>
              </td>

              <!-- Action -->
              <td class="px-6 py-4">
                <div class="flex flex-col gap-1">
                  <span
                    class="inline-block px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-sm border w-fit"
                    [ngClass]="getActionClass(log.action)"
                  >
                    {{ log.action }}
                  </span>
                  <span
                    class="text-[10px] text-gray-500 truncate max-w-[120px] sm:hidden"
                  >
                    {{ log.entityType }}: {{ log.entityId }}
                  </span>
                </div>
              </td>

              <!-- Entity (Desktop) -->
              <td class="px-6 py-4 hidden sm:table-cell">
                <div class="text-xs text-gray-400">
                  <span class="text-amber-600/80">{{ log.entityType }}</span>
                  <span class="text-gray-600 mx-1">#</span>
                  <span>{{ log.entityId }}</span>
                </div>
              </td>

              <!-- User (Desktop) -->
              <td class="px-6 py-4 hidden md:table-cell">
                <div
                  class="text-xs text-gray-400 font-mono truncate max-w-[100px]"
                  title="{{ log.metadata?.status || 'unknown' }}"
                >
                  {{ log.metadata?.status || 'unknown' }}
                </div>
              </td>
            </tr>

            <!-- Empty State -->
            <tr *ngIf="logs().length === 0 && !isLoading()">
              <td colspan="4" class="px-6 py-12 text-center">
                <p class="text-gray-600 text-xs uppercase tracking-widest">
                  No audit records found
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Footer -->
      <div
        class="p-4 border-t border-white/5 bg-black/20 text-[10px] text-gray-600 flex justify-between uppercase tracking-wider"
      >
        <span>SYNC: ACTIVE</span>
        <span>REC: {{ logs().length }}</span>
      </div>
    </div>
  `,
  styles: [
    `
      .custom-scrollbar::-webkit-scrollbar {
        width: 4px;
      }
      .custom-scrollbar::-webkit-scrollbar-track {
        background: #111;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb {
        background: #333;
        border-radius: 2px;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: #555;
      }
      @keyframes scan {
        0% {
          transform: translateY(-100%);
        }
        100% {
          transform: translateY(100%);
        }
      }
      .animate-scan {
        animation: scan 4s linear infinite;
      }
    `,
  ],
})
export class AuditLogsDrawerComponent implements OnChanges {
  @Input() isVisible = false;
  @Output() close = new EventEmitter<void>();

  private auditService = inject(AuditLogService);

  logs = signal<AuditLog[]>([]);
  isLoading = signal(false);

  ngOnChanges(changes: SimpleChanges) {
    if (changes['isVisible']?.currentValue === true) {
      this.refreshLogs();
    }
  }

  refreshLogs() {
    this.isLoading.set(true);
    this.auditService.getLogs().subscribe({
      next: (data) => {
        this.logs.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  getActionClass(action: string): string {
    const act = action.toUpperCase();
    if (act.includes('CREATE'))
      return 'bg-green-900/20 border-green-700/50 text-green-500';
    if (act.includes('DELETE'))
      return 'bg-red-900/20 border-red-700/50 text-red-500';
    if (act.includes('UPDATE'))
      return 'bg-blue-900/20 border-blue-700/50 text-blue-500';
    return 'bg-gray-800 border-gray-600 text-gray-400';
  }
}
