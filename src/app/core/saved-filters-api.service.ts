import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { SavedFilter, SavedFilterRequest } from './models';

@Injectable({ providedIn: 'root' })
export class SavedFiltersApi {
  private readonly http = inject(HttpClient);

  list(collectionId: string): Promise<SavedFilter[]> {
    return firstValueFrom(
      this.http.get<SavedFilter[]>(`/api/collections/${collectionId}/saved-filters`)
    );
  }

  create(collectionId: string, request: SavedFilterRequest): Promise<SavedFilter> {
    return firstValueFrom(
      this.http.post<SavedFilter>(`/api/collections/${collectionId}/saved-filters`, request)
    );
  }

  update(collectionId: string, id: string, request: SavedFilterRequest): Promise<SavedFilter> {
    return firstValueFrom(
      this.http.put<SavedFilter>(`/api/collections/${collectionId}/saved-filters/${id}`, request)
    );
  }

  updateById(collectionId: string, id: string, request: SavedFilterRequest): Promise<SavedFilter> {
    return this.update(collectionId, id, request);
  }

  delete(collectionId: string, id: string): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(`/api/collections/${collectionId}/saved-filters/${id}`)
    );
  }
}
