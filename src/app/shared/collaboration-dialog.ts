import {
  Component,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { firstValueFrom } from "rxjs";

import { NzButtonModule } from "ng-zorro-antd/button";
import { NzIconModule } from "ng-zorro-antd/icon";
import { NzInputModule } from "ng-zorro-antd/input";
import { NzModalModule, NzModalRef, NZ_MODAL_DATA } from "ng-zorro-antd/modal";
import { NzSelectModule } from "ng-zorro-antd/select";
import { NzSpinModule } from "ng-zorro-antd/spin";
import { NzTagModule } from "ng-zorro-antd/tag";
import { NzTabsModule } from "ng-zorro-antd/tabs";
import { NzPopconfirmModule } from "ng-zorro-antd/popconfirm";
import { NzTooltipModule } from "ng-zorro-antd/tooltip";

import { SharingApi } from "../core/sharing-api.service";
import { Notify } from "../core/notify.service";
import { ShareLink, Collaborator } from "../core/models";

export interface CollaborationDialogData {
  collectionId: string;
  collectionName: string;
  collectionIcon?: string;
}

@Component({
  selector: "app-collaboration-dialog",
  imports: [
    FormsModule,
    NzButtonModule,
    NzIconModule,
    NzInputModule,
    NzModalModule,
    NzSelectModule,
    NzSpinModule,
    NzTagModule,
    NzTabsModule,
    NzPopconfirmModule,
    NzTooltipModule,
  ],
  template: `
    <div *nzModalTitle class="flex items-center gap-2.5">
      <div
        class="w-8 h-8 rounded-lg bg-(--app-primary-container) text-(--app-primary) flex items-center justify-center flex-none"
      >
        <nz-icon nzType="team" class="text-base" />
      </div>
      <div>
        <h3 class="text-base font-bold text-(--app-text) leading-tight m-0">
          Share & Collaborate
        </h3>
        <p class="text-xs text-(--app-text-muted) m-0">
          {{ data.collectionIcon }} {{ data.collectionName }}
        </p>
      </div>
    </div>

    <nz-tabs [nzSelectedIndex]="0" nzSize="small">
      <!--─── TAB 1: Share Links ─────────────────────────── -->
      <nz-tab nzTitle="Public Links">
        <div class="flex flex-col gap-4 pt-3">
          <!-- Create new link form -->
          <div
            class="p-3.5 rounded-xl border border-(--app-outline-variant) bg-(--app-surface-container) flex flex-col gap-3"
          >
            <p
              class="text-xs font-semibold text-(--app-text-muted) uppercase tracking-wider m-0"
            >
              Generate a read-only public link
            </p>
            <div class="flex flex-col sm:flex-row gap-2">
              <input
                nz-input
                placeholder="Link label (e.g., Client view, Portfolio)"
                [(ngModel)]="newLinkLabel"
                class="rounded-lg! flex-1 text-sm"
              />
              <nz-select
                [(ngModel)]="newLinkExpiry"
                class="w-full sm:w-36!"
                nzSize="default"
              >
                <nz-option nzValue="never" nzLabel="Never expires" />
                <nz-option nzValue="1" nzLabel="Expires in 1 day" />
                <nz-option nzValue="7" nzLabel="Expires in 7 days" />
                <nz-option nzValue="30" nzLabel="Expires in 30 days" />
                <nz-option nzValue="90" nzLabel="Expires in 90 days" />
              </nz-select>
              <button
                nz-button
                nzType="primary"
                [nzLoading]="creatingLink()"
                (click)="createLink()"
              >
                <nz-icon nzType="plus" />
                Create Link
              </button>
            </div>
          </div>

          <!-- Link list -->
          @if (loadingLinks()) {
            <div class="flex justify-center py-6">
              <nz-spin nzSimple />
            </div>
          } @else if (links().length === 0) {
            <div class="text-center py-8 text-(--app-text-muted) text-sm">
              <nz-icon nzType="link" class="text-3xl mb-2 block opacity-40" />
              No share links yet. Create one above.
            </div>
          } @else {
            <div class="flex flex-col gap-2">
              @for (link of links(); track link.id) {
                <div
                  class="flex items-start gap-3 p-3 rounded-xl border border-(--app-outline-variant) bg-(--app-surface)"
                  [class.opacity-50]="!link.isActive"
                >
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1">
                      <span
                        class="text-sm font-semibold text-(--app-text) truncate"
                      >
                        {{ link.label || "Untitled link" }}
                      </span>
                      @if (!link.isActive) {
                        <nz-tag nzColor="error" class="text-xs!"
                          >Revoked</nz-tag
                        >
                      } @else if (isLinkExpired(link)) {
                        <nz-tag nzColor="warning" class="text-xs!"
                          >Expired</nz-tag
                        >
                      } @else {
                        <nz-tag nzColor="success" class="text-xs!"
                          >Active</nz-tag
                        >
                      }
                    </div>
                    <div
                      class="flex items-center gap-1.5 bg-(--app-surface-container) rounded-lg px-2.5 py-1.5 border border-(--app-outline-variant)"
                    >
                      <nz-icon
                        nzType="link"
                        class="text-xs text-(--app-text-muted)"
                      />
                      <code
                        class="text-xs text-(--app-text-muted) truncate flex-1 font-mono"
                      >
                        {{ publicUrl(link.token) }}
                      </code>
                      @if (link.isActive && !isLinkExpired(link)) {
                        <a
                          [href]="publicUrl(link.token)"
                          target="_blank"
                          rel="noopener noreferrer"
                          nz-button
                          nzType="text"
                          nzSize="small"
                          class="p-0! h-auto! text-(--app-text-muted)! hover:text-(--app-primary)!"
                          nz-tooltip
                          nzTooltipTitle="Open in new tab"
                        >
                          <nz-icon nzType="export" class="text-xs" />
                        </a>
                        <button
                          nz-button
                          nzType="text"
                          nzSize="small"
                          class="p-0! h-auto! text-(--app-primary)!"
                          nz-tooltip
                          nzTooltipTitle="Copy link"
                          (click)="copyLink(link.token)"
                        >
                          <nz-icon
                            [nzType]="
                              copiedToken() === link.token ? 'check' : 'copy'
                            "
                            class="text-xs"
                          />
                        </button>
                      }
                    </div>
                    @if (link.expiresAt) {
                      <p class="text-xs text-(--app-text-muted) mt-1 m-0">
                        {{ isLinkExpired(link) ? "Expired" : "Expires" }}
                        {{ formatDate(link.expiresAt) }}
                      </p>
                    }
                  </div>
                  <div class="flex items-center gap-1 shrink-0">
                    @if (link.isActive) {
                      <button
                        nz-button
                        nzType="text"
                        nzSize="small"
                        nz-tooltip
                        nzTooltipTitle="Revoke link"
                        (click)="revokeLink(link)"
                      >
                        <nz-icon nzType="stop" class="text-(--app-warning)" />
                      </button>
                    }
                    <button
                      nz-button
                      nzType="text"
                      nzSize="small"
                      nz-popconfirm
                      nzPopconfirmTitle="Delete this link permanently?"
                      (nzOnConfirm)="deleteLink(link)"
                    >
                      <nz-icon nzType="delete" class="text-red-500" />
                    </button>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      </nz-tab>

      <!-- ─── TAB 2: Collaborators ───────────────────────── -->
      <nz-tab nzTitle="Collaborators">
        <div class="flex flex-col gap-4 pt-3">
          <!-- Invite form -->
          <div
            class="p-3.5 rounded-xl border border-(--app-outline-variant) bg-(--app-surface-container) flex flex-col gap-2.5"
          >
            <p
              class="text-xs font-semibold text-(--app-text-muted) uppercase tracking-wider m-0"
            >
              Invite a collaborator by email
            </p>
            <div class="flex flex-col sm:flex-row gap-2">
              <input
                nz-input
                type="email"
                placeholder="colleague@example.com"
                [(ngModel)]="inviteEmail"
                (keydown.enter)="inviteCollaborator()"
                class="rounded-lg! flex-1 text-sm"
              />
              <nz-select
                [(ngModel)]="inviteRole"
                class="w-full sm:w-28!"
                nzSize="default"
              >
                <nz-option nzValue="viewer" nzLabel="Viewer" />
                <nz-option nzValue="editor" nzLabel="Editor" />
              </nz-select>
              <button
                nz-button
                nzType="primary"
                [nzLoading]="inviting()"
                (click)="inviteCollaborator()"
              >
                <nz-icon nzType="user-add" />
                Invite
              </button>
            </div>
            <p class="text-xs text-(--app-text-muted) m-0">
              Collaborators can view or edit this tracker. Generate an invite
              and share the link with them.
            </p>
          </div>

          <!-- Collaborator list -->
          @if (loadingCollabs()) {
            <div class="flex justify-center py-6">
              <nz-spin nzSimple />
            </div>
          } @else if (collaborators().length === 0) {
            <div class="text-center py-8 text-(--app-text-muted) text-sm">
              <nz-icon nzType="team" class="text-3xl mb-2 block opacity-40" />
              No collaborators yet. Invite someone above.
            </div>
          } @else {
            <div class="flex flex-col gap-2">
              @for (c of collaborators(); track c.id) {
                <div
                  class="flex items-center gap-3 p-3 rounded-xl border border-(--app-outline-variant) bg-(--app-surface)"
                >
                  <!-- Avatar -->
                  <div
                    class="w-9 h-9 rounded-full bg-(--app-primary-container) text-(--app-primary) flex items-center justify-center font-bold text-sm shrink-0"
                  >
                    {{
                      (c.collaboratorDisplayName || c.inviteEmail)
                        .charAt(0)
                        .toUpperCase()
                    }}
                  </div>

                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="text-sm font-semibold text-(--app-text)">
                        {{ c.collaboratorDisplayName || c.inviteEmail }}
                      </span>
                      @if (!c.accepted) {
                        <nz-tag class="text-xs!" nzColor="warning"
                          >Pending</nz-tag
                        >
                      } @else {
                        <nz-tag class="text-xs!" nzColor="success"
                          >Accepted</nz-tag
                        >
                      }
                    </div>
                    @if (c.collaboratorDisplayName) {
                      <p class="text-xs text-(--app-text-muted) m-0">
                        {{ c.inviteEmail }}
                      </p>
                    }
                  </div>

                  <div class="flex items-center gap-2 shrink-0">
                    <nz-select
                      [ngModel]="c.role"
                      (ngModelChange)="updateRole(c, $event)"
                      nzSize="small"
                      class="w-24!"
                    >
                      <nz-option nzValue="viewer" nzLabel="Viewer" />
                      <nz-option nzValue="editor" nzLabel="Editor" />
                    </nz-select>

                    @if (!c.accepted) {
                      <button
                        nz-button
                        nzType="text"
                        nzSize="small"
                        nz-tooltip
                        nzTooltipTitle="Copy invite link"
                        (click)="copyInviteLink(c)"
                      >
                        <nz-icon nzType="copy" class="text-(--app-primary)" />
                      </button>
                    }

                    <button
                      nz-button
                      nzType="text"
                      nzSize="small"
                      nz-popconfirm
                      nzPopconfirmTitle="Remove this collaborator?"
                      (nzOnConfirm)="removeCollaborator(c)"
                    >
                      <nz-icon nzType="user-delete" class="text-red-500" />
                    </button>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      </nz-tab>
    </nz-tabs>

    <div *nzModalFooter>
      <button nz-button nzType="default" (click)="close()">Close</button>
    </div>
  `,
})
export class CollaborationDialog implements OnInit {
  protected readonly data = inject<CollaborationDialogData>(NZ_MODAL_DATA);
  private readonly modalRef = inject(NzModalRef);
  private readonly api = inject(SharingApi);
  private readonly notify = inject(Notify);

  // Links tab
  readonly links = signal<ShareLink[]>([]);
  readonly loadingLinks = signal(true);
  readonly creatingLink = signal(false);
  readonly copiedToken = signal<string | null>(null);
  newLinkLabel = "";
  newLinkExpiry = "never";

  // Collaborators tab
  readonly collaborators = signal<Collaborator[]>([]);
  readonly loadingCollabs = signal(true);
  readonly inviting = signal(false);
  inviteEmail = "";
  inviteRole: "viewer" | "editor" = "viewer";

  async ngOnInit(): Promise<void> {
    await Promise.all([this.loadLinks(), this.loadCollaborators()]);
  }

  // ─── Share Links ────────────────────────────────────────────────────────────

  async loadLinks(): Promise<void> {
    this.loadingLinks.set(true);
    try {
      const list = await firstValueFrom(
        this.api.listShareLinks(this.data.collectionId),
      );
      this.links.set(list);
    } catch {
      this.notify.error("Failed to load share links.");
    } finally {
      this.loadingLinks.set(false);
    }
  }

  async createLink(): Promise<void> {
    this.creatingLink.set(true);
    try {
      let expiresAt: string | null = null;
      if (this.newLinkExpiry !== "never") {
        const days = parseInt(this.newLinkExpiry, 10);
        expiresAt = new Date(Date.now() + days * 86400000).toISOString();
      }

      const link = await firstValueFrom(
        this.api.createShareLink(this.data.collectionId, {
          label: this.newLinkLabel.trim() || null,
          expiresAt,
        }),
      );
      this.links.update((list) => [link, ...list]);
      this.newLinkLabel = "";
      this.newLinkExpiry = "never";

      // Auto-copy the created link
      try {
        await navigator.clipboard.writeText(this.publicUrl(link.token));
        this.copiedToken.set(link.token);
        this.notify.success("Share link created and copied to clipboard!");
        setTimeout(() => this.copiedToken.set(null), 2000);
      } catch {
        this.notify.success("Share link created!");
      }
    } catch {
      this.notify.error("Failed to create share link.");
    } finally {
      this.creatingLink.set(false);
    }
  }

  isLinkExpired(link: ShareLink): boolean {
    if (!link.expiresAt) return false;
    return new Date(link.expiresAt).getTime() < Date.now();
  }

  async revokeLink(link: ShareLink): Promise<void> {
    try {
      const updated = await firstValueFrom(
        this.api.revokeShareLink(this.data.collectionId, link.id),
      );
      this.links.update((list) =>
        list.map((l) => (l.id === updated.id ? updated : l)),
      );
      this.notify.info("Link revoked — it can no longer be used.");
    } catch {
      this.notify.error("Failed to revoke link.");
    }
  }

  async deleteLink(link: ShareLink): Promise<void> {
    try {
      await firstValueFrom(
        this.api.deleteShareLink(this.data.collectionId, link.id),
      );
      this.links.update((list) => list.filter((l) => l.id !== link.id));
      this.notify.success("Link deleted.");
    } catch {
      this.notify.error("Failed to delete link.");
    }
  }

  async copyLink(token: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.publicUrl(token));
      this.copiedToken.set(token);
      this.notify.success("Public link copied to clipboard!");
      setTimeout(() => this.copiedToken.set(null), 2000);
    } catch {
      this.notify.error("Could not copy to clipboard.");
    }
  }

  publicUrl(token: string): string {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    return `${base}/view/${token}`;
  }

  // ─── Collaborators ──────────────────────────────────────────────────────────

  async loadCollaborators(): Promise<void> {
    this.loadingCollabs.set(true);
    try {
      const list = await firstValueFrom(
        this.api.listCollaborators(this.data.collectionId),
      );
      this.collaborators.set(list);
    } catch {
      this.notify.error("Failed to load collaborators.");
    } finally {
      this.loadingCollabs.set(false);
    }
  }

  async inviteCollaborator(): Promise<void> {
    const email = this.inviteEmail.trim();
    if (!email) return;
    this.inviting.set(true);
    try {
      const collab = await firstValueFrom(
        this.api.inviteCollaborator(this.data.collectionId, {
          email,
          role: this.inviteRole,
        }),
      );
      this.collaborators.update((list) => {
        const existing = list.findIndex((c) => c.id === collab.id);
        return existing >= 0
          ? list.map((c) => (c.id === collab.id ? collab : c))
          : [collab, ...list];
      });
      this.inviteEmail = "";

      if (collab.inviteToken) {
        const base =
          typeof window !== "undefined" ? window.location.origin : "";
        const url = `${base}/invite/accept?token=${encodeURIComponent(collab.inviteToken)}`;
        try {
          await navigator.clipboard.writeText(url);
          this.notify.success(`Invite created! Link copied to clipboard.`);
        } catch {
          this.notify.success(`Invite created for ${email}!`);
        }
      } else {
        this.notify.success(`Invite sent to ${email}!`);
      }
    } catch {
      this.notify.error("Failed to send invite.");
    } finally {
      this.inviting.set(false);
    }
  }

  async updateRole(
    collab: Collaborator,
    role: "viewer" | "editor",
  ): Promise<void> {
    try {
      const updated = await firstValueFrom(
        this.api.updateCollaboratorRole(
          this.data.collectionId,
          collab.id,
          role,
        ),
      );
      this.collaborators.update((list) =>
        list.map((c) => (c.id === updated.id ? updated : c)),
      );
    } catch {
      this.notify.error("Failed to update role.");
    }
  }

  async removeCollaborator(collab: Collaborator): Promise<void> {
    try {
      await firstValueFrom(
        this.api.removeCollaborator(this.data.collectionId, collab.id),
      );
      this.collaborators.update((list) =>
        list.filter((c) => c.id !== collab.id),
      );
      this.notify.success("Collaborator removed.");
    } catch {
      this.notify.error("Failed to remove collaborator.");
    }
  }

  async copyInviteLink(collab: Collaborator): Promise<void> {
    if (!collab.inviteToken) {
      this.notify.info(
        `Invite for ${collab.inviteEmail} has already been accepted or is unavailable.`,
      );
      return;
    }
    const base = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${base}/invite/accept?token=${encodeURIComponent(collab.inviteToken)}`;
    try {
      await navigator.clipboard.writeText(url);
      this.notify.success(
        `Invite link for ${collab.inviteEmail} copied to clipboard!`,
      );
    } catch {
      this.notify.error("Could not copy to clipboard.");
    }
  }

  formatDate(iso: string): string {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
      new Date(iso),
    );
  }

  close(): void {
    this.modalRef.close();
  }
}
