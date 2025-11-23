import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AvatarProfileComponent } from './avatar-profile.component';
import { SessionService } from '../../services/session.service';

@Component({
  selector: 'app-top-bar',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, AvatarProfileComponent],
  template: `
    <header
      class="bg-[#2A2F35] border-b-4 border-amber-900/50 shadow-lg relative z-30 font-mono"
    >
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16 items-center">
          <div class="flex items-center gap-8">
            <!-- Logo -->
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
                >Task<span class="text-gray-500">Management</span></span
              >
            </div>

            <!-- Organization Switcher (Dropdown) -->
            <div class="relative group">
              <div
                class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                  class="w-4 h-4 text-amber-600"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z"
                  />
                </svg>
              </div>

              <select
                [ngModel]="session.selectedOrgId()"
                (ngModelChange)="onOrgChange($event)"
                class="appearance-none bg-black/30 border border-amber-900/30 hover:border-amber-600 text-amber-500 text-xs font-bold uppercase tracking-wider rounded-sm py-2 pl-9 pr-8 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer transition-colors w-48 sm:w-64"
              >
                <option
                  *ngFor="let org of session.organizations()"
                  [value]="org.id"
                >
                  {{ org.name }}
                </option>
              </select>

              <!-- Custom Arrow -->
              <div
                class="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none"
              >
                <svg
                  class="w-4 h-4 text-amber-600"
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

          <!-- Right: Actions -->
          <div class="flex items-center gap-6">
            <div
              class="text-right hidden sm:block pr-4 border-r border-white/10"
            >
              <div class="text-[10px] text-gray-500 uppercase tracking-widest">
                Role
              </div>
              <div
                class="text-amber-500 font-bold text-xs tracking-wide uppercase"
              >
                {{ session.currentRole() }}
              </div>
            </div>

            <app-avatar-profile></app-avatar-profile>
          </div>
        </div>
      </div>
    </header>
  `,
})
export class TopBarComponent {
  session = inject(SessionService);

  onOrgChange(orgId: number) {
    this.session.selectOrganization(orgId);
  }
}
