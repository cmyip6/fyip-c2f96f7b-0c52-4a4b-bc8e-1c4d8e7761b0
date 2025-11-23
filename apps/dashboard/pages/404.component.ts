import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthUserInterface } from '@libs/data/type/auth-user.interface';

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
            VERIFYING TOKEN...
          </span>
        </div>
      </div>
    </div>
  `,
})
export class NotFoundComponent implements OnInit {
  private router = inject(Router);

  ngOnInit() {
    const token = this.getCookie('token');

    if (!token) {
      this.redirectToLogin();
      return;
    }

    const payload = this.decodeJwt(token);

    if (!payload) {
      this.redirectToLogin();
      return;
    }

    const expiry = payload.tokenExpiry;

    if (!expiry) {
      this.redirectToLogin();
      return;
    }

    const currentTime = Math.floor(Date.now() / 1000);

    const normalizedExpiry =
      expiry.toString().length > 10 ? Math.floor(expiry / 1000) : expiry;

    if (normalizedExpiry > currentTime) {
      this.router.navigate(['/dashboard']);
    } else {
      this.redirectToLogin();
    }
  }

  private redirectToLogin() {
    document.cookie = 'token=; Max-Age=0; path=/;';
    this.router.navigate(['/login']);
  }

  private getCookie(name: string): string | null {
    const match = document.cookie.match(
      new RegExp('(^| )' + name + '=([^;]+)'),
    );
    return match ? match[2] : null;
  }

  private decodeJwt(token: string): AuthUserInterface {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        window
          .atob(base64)
          .split('')
          .map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          })
          .join(''),
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  }
}
