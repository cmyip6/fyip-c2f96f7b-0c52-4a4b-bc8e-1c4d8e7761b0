import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthApiService } from '../api-services/auth-api.service';
import { ErrorService } from '../services/error.service';
import { SessionService } from '../services/session.service';
import { switchMap, tap } from 'rxjs';
import { OrganizationApiService } from '../api-services/organization-api.service';
import { UserApiService } from '../api-services/user-api.service';
import { GetOrganizationResponseInterface } from '@libs/data/type/get-organization-response.interface';
import { LockIcon } from '../components/icons/lock.components';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LockIcon],
  template: `
    <div class="login-page">
      <div
        class="absolute inset-0 opacity-5 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"
      ></div>

      <div class="login-card">
        <!-- Decorative Rivets -->
        <div class="decorative-rivet top-3 left-3"></div>
        <div class="decorative-rivet top-3 right-3"></div>
        <div class="decorative-rivet bottom-3 left-3"></div>
        <div class="decorative-rivet bottom-3 right-3"></div>

        <div class="login-header">
          <div class="login-icon-wrapper">
            <lock-icon />
          </div>
          <h2 class="login-title">System Access</h2>
          <p class="login-subtitle">Authorized Personnel Only</p>
        </div>

        <form
          [formGroup]="loginForm"
          (ngSubmit)="onSubmit()"
          class="flex flex-col gap-6"
        >
          <!-- Username -->
          <div class="form-group group">
            <label for="username" class="form-label form-label-focus"
              >Identity</label
            >
            <div class="relative">
              <input
                id="username"
                type="text"
                formControlName="username"
                class="form-input"
                placeholder="ENTER ID"
              />
              <div class="form-input-decor form-input-decor-top-left"></div>
              <div class="form-input-decor form-input-decor-bottom-right"></div>
            </div>
          </div>

          <!-- Password -->
          <div class="form-group group">
            <label for="password" class="form-label form-label-focus"
              >Access Code</label
            >
            <div class="relative">
              <input
                id="password"
                type="password"
                formControlName="password"
                class="form-input"
                placeholder="••••••"
              />
              <div class="form-input-decor form-input-decor-top-left"></div>
              <div class="form-input-decor form-input-decor-bottom-right"></div>
            </div>
          </div>

          <!-- Checkbox and Link -->
          <div class="flex items-center justify-between px-1 mt-1">
            <div class="flex items-center">
              <input
                id="remember-me"
                type="checkbox"
                formControlName="rememberMe"
                class="checkbox-input"
              />
              <label for="remember-me" class="checkbox-label"
                >Maintain Session</label
              >
            </div>
            <a href="#" class="link-reset">Reset Key?</a>
          </div>

          <!-- Button -->
          <button
            type="submit"
            [disabled]="isLoading() || loginForm.invalid"
            class="btn-primary group"
          >
            <div class="btn-primary-gradient"></div>
            <ng-container *ngIf="isLoading()">
              <!-- Loading Spinner SVG -->
            </ng-container>
            <span *ngIf="!isLoading()">Initiate Session</span>
          </button>
        </form>
      </div>

      <div class="login-footer">
        Demo Protocal Established • v0.0.0 • Welcome
      </div>
    </div>
  `,
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authApi = inject(AuthApiService);
  private orgApi = inject(OrganizationApiService);
  private userApi = inject(UserApiService);
  private router = inject(Router);
  private errorService = inject(ErrorService);
  private session = inject(SessionService);

  loginForm = this.fb.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
    rememberMe: false,
  });

  isLoading = signal(false);
  isAutoLogin = signal(false);

  ngOnInit() {
    this.isAutoLogin.set(true);
    this.isLoading.set(true);

    this.userApi
      .getCurrentUser()
      .pipe(
        tap((user) => this.session.setUser(user)),
        switchMap(() => this.orgApi.getOrganizations()),
      )
      .subscribe({
        next: (orgs) => this.finalizeLogin(orgs),
        error: () => {
          this.isLoading.set(false);
          this.isAutoLogin.set(false);
        },
      });
  }

  onSubmit() {
    if (this.loginForm.invalid) return;
    this.isLoading.set(true);

    const { username, password, rememberMe } = this.loginForm.value;

    this.authApi
      .login(username!, password!, rememberMe)
      .pipe(
        tap((response) => {
          this.session.setUser(response.user);
        }),
        switchMap(() => this.orgApi.getOrganizations()),
      )
      .subscribe({
        next: (orgs) => this.finalizeLogin(orgs),
        error: () => {
          this.isLoading.set(false);
        },
      });
  }

  private finalizeLogin(orgs: GetOrganizationResponseInterface[]) {
    if (orgs.length === 0) {
      this.errorService.showError(
        403,
        'No organizations found. Please contact your admin.',
      );
      this.isLoading.set(false);
      return;
    }

    this.session.setOrganizations(orgs);
    this.session.selectOrganization(orgs[0].id);

    this.router.navigate(['/dashboard']);
    this.isLoading.set(false);
  }
}
