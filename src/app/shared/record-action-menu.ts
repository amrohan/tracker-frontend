import { Component, input, output } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatMenuModule } from "@angular/material/menu";
import { RouterLink } from "@angular/router";

/** The View / Edit / Delete menu for a record. Reused by the desktop row and the mobile card. */
@Component({
  selector: "app-record-action-menu",
  imports: [RouterLink, MatButtonModule, MatIconModule, MatMenuModule],
  template: `
    <button
      mat-icon-button
      type="button"
      [matMenuTriggerFor]="menu"
      [attr.aria-label]="'Actions for ' + label()"
    >
      <mat-icon>more_vert</mat-icon>
    </button>
    <mat-menu #menu="matMenu">
      <a
        mat-menu-item
        [routerLink]="['/collections', collectionId(), 'records', recordId()]"
      >
        <mat-icon>visibility</mat-icon><span>View</span>
      </a>
      <a
        mat-menu-item
        [routerLink]="[
          '/collections',
          collectionId(),
          'records',
          recordId(),
          'edit',
        ]"
      >
        <mat-icon>edit</mat-icon><span>Edit</span>
      </a>
      <button
        mat-menu-item
        type="button"
        class="delete-item"
        (click)="delete.emit()"
      >
        <mat-icon>delete</mat-icon><span>Delete</span>
      </button>
    </mat-menu>
  `,
  styles: `
    .delete-item,
    .delete-item mat-icon {
      color: var(--mat-sys-error);
    }
  `,
})
export class RecordActionMenu {
  readonly collectionId = input.required<string>();
  readonly recordId = input.required<string>();
  readonly label = input("this record");
  readonly delete = output<void>();
}
