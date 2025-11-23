import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthApiService } from '../api-services/auth-api.service';
import { ErrorService } from '../services/error.service';
import { SessionService } from '../services/session.service';
import { switchMap, tap } from 'rxjs';
import { OrganizationApiService } from '../api-services/organization-api.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div
      class="min-h-screen flex items-center justify-center bg-[#1a1d21] p-4 font-sans relative overflow-hidden"
    >
      <div
        class="absolute inset-0 opacity-5 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"
      ></div>

      <!-- Display API Errors -->
      <div *ngIf="error()" class="fixed top-5 right-5 z-50 animate-bounce">
        <div
          class="bg-[#2A2F35] border-l-[6px] border-red-900/80 shadow-[0_8px_20px_rgba(0,0,0,0.8)] rounded-sm ring-1 ring-white/5 p-4 flex items-center gap-3"
        >
          <span
            class="text-red-500 font-bold font-mono uppercase tracking-wider text-sm"
            >Error:</span
          >
          <span class="text-gray-400 text-sm font-mono">{{ error() }}</span>
        </div>
      </div>

      <div
        class="w-full max-w-md bg-[#2A2F35] relative z-10 shadow-[0_20px_50px_rgba(0,0,0,0.9)] rounded-sm ring-1 ring-white/10 p-8 sm:p-12 overflow-hidden border-t-4 border-amber-700/50"
      >
        <!-- Decorative Rivets -->
        <div
          class="absolute top-3 left-3 w-1.5 h-1.5 rounded-full bg-zinc-700 shadow-[inset_0_1px_1px_rgba(0,0,0,1)]"
        ></div>
        <div
          class="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-zinc-700 shadow-[inset_0_1px_1px_rgba(0,0,0,1)]"
        ></div>
        <div
          class="absolute bottom-3 left-3 w-1.5 h-1.5 rounded-full bg-zinc-700 shadow-[inset_0_1px_1px_rgba(0,0,0,1)]"
        ></div>
        <div
          class="absolute bottom-3 right-3 w-1.5 h-1.5 rounded-full bg-zinc-700 shadow-[inset_0_1px_1px_rgba(0,0,0,1)]"
        ></div>

        <div class="text-center mb-10">
          <div
            class="inline-flex items-center justify-center mb-4 p-3 bg-black/20 rounded-sm ring-1 ring-white/5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="w-8 h-8 text-amber-600/80"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
              />
            </svg>
          </div>
          <h2
            class="text-2xl font-bold text-amber-50/90 tracking-widest uppercase font-mono"
          >
            System Access
          </h2>
          <p
            class="text-gray-500 mt-2 text-[10px] uppercase tracking-[0.2em] font-bold"
          >
            Authorized Personnel Only
          </p>
        </div>

        <form
          [formGroup]="loginForm"
          (ngSubmit)="onSubmit()"
          class="flex flex-col gap-6"
        >
          <!-- Username -->
          <div class="space-y-2 group">
            <label
              for="username"
              class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1 group-focus-within:text-amber-600 transition-colors"
              >Identity</label
            >
            <div class="relative">
              <input
                id="username"
                type="text"
                formControlName="username"
                class="w-full px-4 py-3 bg-black/20 border border-white/5 rounded-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-amber-600/50 focus:bg-black/30 transition-all duration-200 font-mono text-sm"
                placeholder="ENTER ID"
              />
              <div
                class="absolute top-0 left-0 w-2 h-2 border-t border-l border-transparent group-focus-within:border-amber-600/50 transition-colors"
              ></div>
              <div
                class="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-transparent group-focus-within:border-amber-600/50 transition-colors"
              ></div>
            </div>
          </div>

          <!-- Password -->
          <div class="space-y-2 group">
            <label
              for="password"
              class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1 group-focus-within:text-amber-600 transition-colors"
              >Access Code</label
            >
            <div class="relative">
              <input
                id="password"
                type="password"
                formControlName="password"
                class="w-full px-4 py-3 bg-black/20 border border-white/5 rounded-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-amber-600/50 focus:bg-black/30 transition-all duration-200 font-mono text-sm"
                placeholder="••••••"
              />
              <div
                class="absolute top-0 left-0 w-2 h-2 border-t border-l border-transparent group-focus-within:border-amber-600/50 transition-colors"
              ></div>
              <div
                class="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-transparent group-focus-within:border-amber-600/50 transition-colors"
              ></div>
            </div>
          </div>

          <div class="flex items-center justify-between px-1 mt-1">
            <div class="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                class="h-4 w-4 rounded-sm border-gray-600 bg-black/20 text-amber-600 focus:ring-amber-600/30 cursor-pointer"
              />
              <label
                for="remember-me"
                class="ml-2 block text-[10px] font-bold text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:text-gray-400"
              >
                Maintain Session
              </label>
            </div>
            <a
              href="#"
              class="text-[10px] font-bold text-amber-700/80 hover:text-amber-600 uppercase tracking-wide transition-colors"
              >Reset Key?</a
            >
          </div>

          <button
            type="submit"
            [disabled]="isLoading() || loginForm.invalid"
            class="group relative w-full flex justify-center items-center py-4 px-4 mt-4 bg-amber-900/20 hover:bg-amber-800/30 border border-amber-700/30 text-amber-500 font-bold uppercase tracking-[0.25em] text-xs transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden rounded-sm"
          >
            <div
              class="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent transition-transform duration-700 ease-in-out"
            ></div>

            <ng-container *ngIf="isLoading()">
              <svg
                class="animate-spin -ml-1 mr-3 h-4 w-4 text-amber-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Authenticating...
            </ng-container>
            <span *ngIf="!isLoading()">Initiate Session</span>
          </button>
        </form>
      </div>

      <div
        class="absolute bottom-4 text-[10px] text-gray-700 font-mono tracking-widest uppercase"
      >
        Demo Protocal Established • v0.0.0 • Welcome
      </div>
    </div>
  `,
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authApi = inject(AuthApiService);
  private orgApi = inject(OrganizationApiService);
  private router = inject(Router);
  private errorService = inject(ErrorService);
  private session = inject(SessionService);

  loginForm = this.fb.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

  isLoading = signal(false);
  error = signal<string | null>(null);

  onSubmit() {
    if (this.loginForm.invalid) return;
    this.isLoading.set(true);
    this.error.set(null);

    const { username, password } = this.loginForm.value;

    this.authApi
      .login(username!, password!)
      .pipe(
        tap((response) => {
          const d = new Date();
          d.setTime(d.getTime() + 1 * 24 * 60 * 60 * 1000);
          document.cookie = `token=${response.token};expires=${d.toUTCString()};path=/`;
          this.session.setUser(response.user);
        }),
        switchMap(() => this.orgApi.getOrganizations()),
      )
      .subscribe({
        next: (orgs) => {
          if (orgs.length === 0) {
            this.errorService.showError(
              403,
              'No organizations found. Contact your admin.',
            );
            this.isLoading.set(false);
            return;
          }

          this.session.setOrganizations(orgs);
          this.session.selectOrganization(orgs[0].id);
          this.router.navigate(['/dashboard']);
          this.isLoading.set(false);
        },
        error: (err) => {
          const msg = err.error?.message || 'Authentication Failed';
          this.error.set(msg);
          this.isLoading.set(false);
          setTimeout(() => this.error.set(null), 3000);
        },
      });
  }
}
