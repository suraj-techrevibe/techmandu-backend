import { Component } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { DataService } from '@vendure/admin-ui/core';

@Component({
  standalone: true,
  template: '',
})
export class StoreDynamicRedirectComponent {
  constructor(private dataService: DataService) {
    this.redirect();
  }

  async redirect() {
    try {
      const currentUserResult = this.dataService.auth.currentUser();
      const user = await firstValueFrom(
        currentUserResult.mapSingle(data => data.me)
      );
      const id = user?.channels[0].id;

      if (id) {
        window.location.href = `/admin/settings/channels/${id}`;
      } else {
        console.error('User ID not found');
      }
    } catch (err) {
      console.error('Failed to get current user', err);
    }
  }
}
