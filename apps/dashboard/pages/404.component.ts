import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UserApiService } from '../api-services/user-api.service';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-4"
    >
      <div
        class="w-full max-w-md bg-white/95 backdrop-blur-sm shadow-2xl p-12 rounded-[15%] text-center transition-transform hover:scale-105 duration-300"
      >
        <h1
          class="text-8xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-pink-600 mb-2 animate-pulse"
        >
          404
        </h1>

        <h2 class="text-2xl font-bold text-gray-800 mb-4">Page Not Found</h2>

        <p class="text-gray-500 mb-8 font-medium">
          We're analyzing your session to get you back on track...
        </p>

        <div class="flex flex-col items-center justify-center space-y-3">
          <div class="relative">
            <div
              class="w-12 h-12 border-4 border-indigo-200 rounded-full animate-spin"
            ></div>
            <div
              class="w-12 h-12 border-4 border-indigo-600 rounded-full animate-spin absolute top-0 left-0 border-t-transparent"
            ></div>
          </div>
          <span
            class="text-sm font-semibold text-indigo-600 tracking-wide animate-pulse"
          >
            VERIFYING SESSION...
          </span>
        </div>
      </div>
    </div>
  `,
})
export class NotFoundComponent implements OnInit {
  private router = inject(Router);
  private api = inject(UserApiService);

  ngOnInit() {
    setTimeout(() => {
      this.api.getCurrentUser().subscribe({
        next: () => {
          this.router.navigate(['/dashboard']);
        },
        error: () => {
          this.redirectToLogin();
        },
      });
    }, 1500);
  }

  private redirectToLogin() {
    this.router.navigate(['/login']);
  }
}
