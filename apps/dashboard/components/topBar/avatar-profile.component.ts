import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SessionService } from '../../services/session.service';
import { AuthApiService } from 'apps/dashboard/api-services/auth-api.service';

@Component({
  selector: 'app-avatar-profile',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Avatar Badge -->
    <button
      (click)="showModal.set(true)"
      class="relative group flex items-center justify-center w-10 h-10 bg-amber-900/20 border border-amber-700/50 hover:bg-amber-900/40 hover:border-amber-500 rounded-sm transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500/50"
    >
      <!-- Initial -->
      <span
        class="font-mono font-bold text-amber-500 text-lg group-hover:text-amber-400"
      >
        {{ initial() }}
      </span>

      <!-- Corner Accents -->
      <div
        class="absolute top-0 right-0 w-1.5 h-1.5 border-t border-r border-amber-600/30 group-hover:border-amber-400"
      ></div>
      <div
        class="absolute bottom-0 left-0 w-1.5 h-1.5 border-b border-l border-amber-600/30 group-hover:border-amber-400"
      ></div>

      <!-- Status Indicator -->
      <div
        class="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-[#1a1d21] rounded-full flex items-center justify-center"
      >
        <div class="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
      </div>
    </button>

    <!-- Profile Modal -->
    <div
      *ngIf="showModal()"
      class="fixed inset-0 z-[100] flex items-center justify-center p-4 font-sans"
    >
      <!-- Backdrop -->
      <div
        class="absolute inset-0 bg-black/80 backdrop-blur-sm"
        (click)="showModal.set(false)"
      ></div>

      <!-- Modal Card -->
      <div
        class="relative w-full max-w-sm bg-[#2A2F35] shadow-[0_0_40px_rgba(0,0,0,0.8)] border border-white/10 rounded-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        <!-- Header -->
        <div
          class="px-6 py-4 bg-black/40 border-b border-white/5 flex justify-between items-center"
        >
          <h3
            class="text-amber-500 font-bold font-mono tracking-widest uppercase text-xs"
          >
            Personnel Record
          </h3>
          <button
            (click)="showModal.set(false)"
            class="text-gray-500 hover:text-amber-500 transition-colors"
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

        <!-- Body -->
        <div class="p-8 relative">
          <!-- ID Badge Decor -->
          <div class="absolute top-4 right-4 opacity-10">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="w-24 h-24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
              />
            </svg>
          </div>

          <div class="space-y-6 relative z-10">
            <!-- Name -->
            <div class="space-y-1">
              <label
                class="text-[10px] uppercase font-bold text-gray-500 tracking-widest block"
                >Identity</label
              >
              <div
                class="text-xl font-mono font-bold text-gray-200 border-b border-white/10 pb-1"
              >
                {{ session.user()?.name || 'UNKNOWN' }}
              </div>
            </div>

            <!-- Email -->
            <div class="space-y-1">
              <label
                class="text-[10px] uppercase font-bold text-gray-500 tracking-widest block"
                >Comm Link</label
              >
              <div class="font-mono text-sm text-amber-500/80">
                <a
                  *ngIf="session.user()?.email; else noEmail"
                  [href]="'mailto:' + session.user()?.email"
                  class="hover:text-amber-400 hover:underline decoration-amber-500/30 underline-offset-4"
                >
                  {{ session.user()?.email }}
                </a>
                <ng-template #noEmail>
                  <span class="text-gray-600 italic"
                    >No frequency established</span
                  >
                </ng-template>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <!-- Organization -->
              <div class="space-y-1">
                <label
                  class="text-[10px] uppercase font-bold text-gray-500 tracking-widest block"
                  >Unit / Org</label
                >
                <div class="font-mono text-sm font-bold text-gray-300">
                  {{ session.currentOrg()?.name || 'Free Agent' }}
                </div>
              </div>

              <!-- Role -->
              <div class="space-y-1">
                <label
                  class="text-[10px] uppercase font-bold text-gray-500 tracking-widest block"
                  >Clearance</label
                >
                <div
                  class="inline-block px-2 py-0.5 bg-amber-900/20 border border-amber-700/30 rounded-sm"
                >
                  <span
                    class="font-mono text-xs font-bold text-amber-500 uppercase"
                  >
                    {{ session.currentRole() }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div
          class="px-6 py-3 bg-black/20 border-t border-white/5 flex justify-between items-center text-[10px] font-mono uppercase tracking-wider"
        >
          <span class="text-gray-600"
            >ID: {{ session.user()?.id?.substring(0, 8) || 'N/A' }}</span
          >

          <div class="flex items-center gap-4">
            <!-- Moved Logout Button -->
            <button
              (click)="logout()"
              class="group px-3 py-1.5 bg-red-950/30 border border-red-900/50 hover:border-red-500 hover:bg-red-900/40 text-red-500 hover:text-red-400 transition-all rounded-sm font-bold cursor-pointer flex items-center gap-2 shadow-[0_0_10px_rgba(0,0,0,0.5)]"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="2"
                stroke="currentColor"
                class="w-3.5 h-3.5"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M5.636 5.636a9 9 0 1 0 12.728 0M12 3v9"
                />
              </svg>
              <span
                class="text-xs tracking-widest group-hover:underline decoration-red-500/30 underline-offset-4"
                >ABORT</span
              >
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class AvatarProfileComponent {
  session = inject(SessionService);
  private api = inject(AuthApiService);
  private router = inject(Router);

  showModal = signal(false);

  initial = computed(() => {
    const name = this.session.user()?.name;
    return name ? name.charAt(0).toUpperCase() : '?';
  });

  logout() {
    this.api.logout().subscribe({
      next: () => this.finalizeLogout(),
      error: () => this.finalizeLogout(),
    });
  }

  private finalizeLogout() {
    this.session.clearSession();
    document.cookie = 'token=; Max-Age=0; path=/;';
    this.router.navigate(['/login']);
  }
}
