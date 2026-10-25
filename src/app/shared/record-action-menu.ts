import { Component, input, output } from "@angular/core";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzDropdownModule } from "ng-zorro-antd/dropdown";
import { NzIconModule } from "ng-zorro-antd/icon";
import { NzMenuModule } from "ng-zorro-antd/menu";

/** The View / Edit / Delete menu for a record. Reused by the desktop row and the mobile card. */
@Component({
  selector: "app-record-action-menu",
  imports: [
    NzButtonModule,
    NzIconModule,
    NzDropdownModule,
    NzMenuModule,
  ],
  template: `
    <button
      nz-button
      nzType="text"
      nzShape="circle"
      type="button"
      nz-dropdown
      [nzDropdownMenu]="menu"
      [attr.aria-label]="'Actions for ' + label()"
      (click)="$event.stopPropagation()"
    >
      <nz-icon nzType="more" />
    </button>

    <nz-dropdown-menu #menu="nzDropdownMenu">
      <ul nz-menu>
        <li nz-menu-item (click)="view.emit()">
          <nz-icon nzType="eye" />
          <span class="action-text">View</span>
        </li>
        @if (canEdit()) {
          <li nz-menu-item (click)="edit.emit()">
            <nz-icon nzType="edit" />
            <span class="action-text">Edit</span>
          </li>
        }
        <li nz-menu-item (click)="share.emit()">
          <nz-icon nzType="share-alt" />
          <span class="action-text">Share</span>
        </li>
        @if (canEdit()) {
          <li nz-menu-divider></li>
          <li nz-menu-item nzDanger (click)="delete.emit()">
            <nz-icon nzType="delete" />
            <span class="action-text">Delete</span>
          </li>
        }
      </ul>
    </nz-dropdown-menu>
  `,
  styles: `
    :host {
      display: inline-block;
    }
    .action-text {
      margin-left: 8px;
    }
  `,
})
export class RecordActionMenu {
  readonly collectionId = input.required<string>();
  readonly recordId = input.required<string>();
  readonly label = input("this record");
  readonly canEdit = input(true);

  readonly view = output<void>();
  readonly edit = output<void>();
  readonly share = output<void>();
  readonly delete = output<void>();
}
