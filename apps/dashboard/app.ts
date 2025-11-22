import { Component } from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';
import { GlobalErrorComponent } from './components/global-error.component';

@Component({
  imports: [GlobalErrorComponent, RouterOutlet, RouterModule],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected title = 'task-management';
}
