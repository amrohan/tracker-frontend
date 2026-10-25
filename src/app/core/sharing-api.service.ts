import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  ShareLink,
  CreateShareLinkRequest,
  Collaborator,
  InviteCollaboratorRequest,
  PublicCollection,
  PublicRecordList,
} from './models';

@Injectable({ providedIn: 'root' })
export class SharingApi {
  private readonly http = inject(HttpClient);

  // ─── Share Links ────────────────────────────────────────────────────────────

  listShareLinks(collectionId: string): Observable<ShareLink[]> {
    return this.http.get<ShareLink[]>(
      `/api/collections/${collectionId}/share-links`,
    );
  }

  createShareLink(
    collectionId: string,
    req: CreateShareLinkRequest,
  ): Observable<ShareLink> {
    return this.http.post<ShareLink>(
      `/api/collections/${collectionId}/share-links`,
      req,
    );
  }

  revokeShareLink(collectionId: string, linkId: string): Observable<ShareLink> {
    return this.http.patch<ShareLink>(
      `/api/collections/${collectionId}/share-links/${linkId}/revoke`,
      {},
    );
  }

  deleteShareLink(collectionId: string, linkId: string): Observable<void> {
    return this.http.delete<void>(
      `/api/collections/${collectionId}/share-links/${linkId}`,
    );
  }

  // ─── Collaborators ──────────────────────────────────────────────────────────

  listCollaborators(collectionId: string): Observable<Collaborator[]> {
    return this.http.get<Collaborator[]>(
      `/api/collections/${collectionId}/collaborators`,
    );
  }

  inviteCollaborator(
    collectionId: string,
    req: InviteCollaboratorRequest,
  ): Observable<Collaborator> {
    return this.http.post<Collaborator>(
      `/api/collections/${collectionId}/collaborators`,
      req,
    );
  }

  updateCollaboratorRole(
    collectionId: string,
    collaboratorId: string,
    role: 'viewer' | 'editor',
  ): Observable<Collaborator> {
    return this.http.patch<Collaborator>(
      `/api/collections/${collectionId}/collaborators/${collaboratorId}/role`,
      { role },
    );
  }

  removeCollaborator(
    collectionId: string,
    collaboratorId: string,
  ): Observable<void> {
    return this.http.delete<void>(
      `/api/collections/${collectionId}/collaborators/${collaboratorId}`,
    );
  }

  acceptInvite(inviteToken: string): Observable<Collaborator> {
    return this.http.post<Collaborator>(
      `/api/invites/${inviteToken}/accept`,
      {},
    );
  }

  // ─── Public (no auth) ───────────────────────────────────────────────────────

  getPublicCollection(token: string): Observable<PublicCollection> {
    return this.http.get<PublicCollection>(`/api/public/share/${token}`);
  }

  getPublicRecords(
    token: string,
    page = 1,
    pageSize = 50,
  ): Observable<PublicRecordList> {
    return this.http.get<PublicRecordList>(
      `/api/public/share/${token}/records`,
      { params: { page, pageSize } },
    );
  }
}
