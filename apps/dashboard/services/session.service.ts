import { Injectable, computed, signal } from '@angular/core';
import { GetOrganizationResponseInterface } from '@libs/data/type/get-organization-response.interface';
import { AuthUserInterface } from '@libs/data/type/auth-user.interface';

@Injectable({ providedIn: 'root' })
export class SessionService {
  readonly user = signal<AuthUserInterface | null>(null);
  readonly organizations = signal<GetOrganizationResponseInterface[]>([]);
  readonly selectedOrgId = signal<number>(null);

  readonly currentOrg = computed(
    () =>
      this.organizations().find(
        (org) => String(org.id) === String(this.selectedOrgId()),
      ) || null,
  );

  readonly currentRole = computed(() => this.currentOrg()?.role || 'Guest');

  setUser(user: AuthUserInterface) {
    this.user.set(user);
  }

  setOrganizations(orgs: GetOrganizationResponseInterface[]) {
    this.organizations.set(orgs);
  }

  selectOrganization(orgId: number) {
    this.selectedOrgId.set(orgId);
  }

  clearSession() {
    this.user.set(null);
    this.organizations.set([]);
    this.selectedOrgId.set(null);
  }
}
