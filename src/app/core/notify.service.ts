import { Service, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Service()
export class Notify {
  private readonly bar = inject(MatSnackBar);

  info(message: string): void { this.bar.open(message, 'OK', { duration: 3500 }); }
  error(message: string): void { this.bar.open(message, 'Dismiss', { duration: 7000 }); }
}
