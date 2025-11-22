import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthApiService } from '../api-services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div
      class="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-4"
    >
      <div
        class="w-full max-w-md bg-white/95 backdrop-blur-sm shadow-2xl p-8 sm:p-12 rounded-[15%] transition-all duration-300 hover:shadow-indigo-500/20"
      >
        <div class="text-center mb-10">
          <h2 class="text-3xl font-extrabold text-gray-800 tracking-tight">
            Welcome Back
          </h2>
          <p class="text-gray-500 mt-2 text-sm font-medium">
            Please enter your details
          </p>
        </div>

        <form
          [formGroup]="loginForm"
          (ngSubmit)="onSubmit()"
          class="flex flex-col gap-6"
        >
          <div class="space-y-2">
            <label
              for="username"
              class="block text-sm font-semibold text-gray-700 ml-1"
              >Username</label
            >
            <input
              id="username"
              type="text"
              formControlName="username"
              class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 ease-in-out shadow-sm"
              placeholder="admin"
            />
          </div>

          <div class="space-y-2">
            <label
              for="password"
              class="block text-sm font-semibold text-gray-700 ml-1"
              >Password</label
            >
            <input
              id="password"
              type="password"
              formControlName="password"
              class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 ease-in-out shadow-sm"
              placeholder="••••••"
            />
          </div>

          <div class="flex items-center justify-between px-1">
            <div class="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
              />
              <label
                for="remember-me"
                class="ml-2 block text-sm text-gray-600 cursor-pointer select-none"
              >
                Remember me
              </label>
            </div>
            <a
              href="#"
              class="text-sm font-medium text-indigo-600 hover:text-indigo-500"
              >Forgot password?</a
            >
          </div>

          <button
            type="submit"
            [disabled]="isLoading() || loginForm.invalid"
            class="w-full flex justify-center items-center py-3.5 px-4 mt-2 border border-transparent rounded-xl shadow-lg shadow-indigo-500/30 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200 transform hover:-translate-y-0.5"
          >
            <ng-container *ngIf="isLoading()">
              <svg
                class="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
              Signing in...
            </ng-container>
            <span *ngIf="!isLoading()">Sign in</span>
          </button>
        </form>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private api = inject(AuthApiService);
  private router = inject(Router);

  loginForm = this.fb.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

  isLoading = signal(false);
  error = signal<string | null>(null);

  onSubmit() {
    if (this.loginForm.invalid) return;

    const { username, password } = this.loginForm.value;

    this.isLoading.set(true);
    this.error.set(null);

    this.api.login(username!, password!).subscribe({
      next: (response) => {
        console.log('Login Success, Token:', response.token);

        const d = new Date();
        d.setTime(d.getTime() + 1 * 24 * 60 * 60 * 1000);
        const expires = 'expires=' + d.toUTCString();
        document.cookie = `token=${response.token};${expires};path=/`;

        console.log('Redirecting to login');
        this.router.navigate(['/dashboard']);
        this.isLoading.set(false);
      },
      error: (err) => {
        const msg = err.error?.message || 'Server unavailable';
        this.error.set(msg);
        this.isLoading.set(false);

        setTimeout(() => this.error.set(null), 3000);
      },
    });
  }
}
