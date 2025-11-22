import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-top-bar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <header
      class="bg-[#2A2F35] border-b-4 border-amber-900/50 shadow-lg relative z-30 font-mono"
    >
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16 items-center">
          <div class="flex items-center gap-8">
            <div class="flex items-center gap-2">
              <div
                class="p-1.5 bg-amber-900/20 border border-amber-700/50 rounded-sm"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                  class="w-6 h-6 text-amber-500"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                  />
                </svg>
              </div>
              <span
                class="text-amber-500 font-bold tracking-widest uppercase text-lg hidden md:block"
                >Task<span class="text-gray-500">Com</span></span
              >
            </div>
            <nav class="hidden md:flex gap-1">
              <a
                *ngFor="let item of navItems"
                [routerLink]="item.path"
                routerLinkActive="bg-amber-900/20 text-amber-500 border-amber-600"
                [routerLinkActiveOptions]="{ exact: true }"
                class="px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-amber-400 hover:bg-white/5 border border-transparent transition-all rounded-sm"
              >
                {{ item.label }}
              </a>
            </nav>
          </div>

          <div class="flex items-center gap-4">
            <div
              class="text-right hidden sm:block pr-4 border-r border-white/10"
            >
              <div class="text-[10px] text-gray-500 uppercase tracking-widest">
                Operator
              </div>
              <div class="text-amber-500 font-bold text-xs tracking-wide">
                COMMANDER
              </div>
            </div>

            <button
              (click)="logout()"
              class="group relative px-4 py-2 bg-black/30 border border-red-900/30 hover:border-red-500/50 text-red-800 hover:text-red-500 transition-all rounded-sm uppercase text-[10px] font-bold tracking-widest overflow-hidden"
            >
              <span class="relative z-10 group-hover:animate-pulse"
                >Abort Session</span
              >
              <div
                class="absolute inset-0 bg-red-900/10 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"
              ></div>
            </button>
          </div>
        </div>
      </div>
    </header>
  `,
})
export class TopBarComponent {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = environment.apiUrl;

  navItems = [
    { label: 'Mission Board', path: '/dashboard' },
    { label: 'Personnel', path: '/profile' },
    { label: 'Comms Log', path: '/logs' },
  ];

  logout() {
    this.http.post(`${this.apiUrl}/auth/logout`, {}).subscribe({
      next: () => this.finalizeLogout(),
      error: () => this.finalizeLogout(),
    });
  }

  private finalizeLogout() {
    document.cookie = 'token=; Max-Age=0; path=/;';
    this.router.navigate(['/login']);
  }
}
