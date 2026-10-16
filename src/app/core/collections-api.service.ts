import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AggregationType, CollectionDetail, Cover, CoverSelection, Field, FieldConfig, FieldInput, FieldType } from './models';
import { HttpCacheService } from './http-cache.service';

export interface CreateCollectionBody {
  name: string; description: string | null; icon: string;
  cover: { type: 'none' | 'gradient' | 'color'; value: string | null } | null;
  fields: FieldInput[];
}

export interface FieldPatch {
  name?: string; type?: FieldType; required?: boolean; config?: FieldConfig;
  aggregation?: AggregationType; isTitle?: boolean; showInList?: boolean; description?: string;
}

@Service()
export class CollectionsApi {
  private readonly http = inject(HttpClient);
  private readonly cache = inject(HttpCacheService);

  async create(body: CreateCollectionBody) {
    const res = await firstValueFrom(this.http.post<CollectionDetail>('/api/collections', body));
    this.cache.invalidate('/api/collections');
    return res;
  }

  async update(id: string, body: { name?: string; description?: string; icon?: string }) {
    const res = await firstValueFrom(this.http.patch<CollectionDetail>(`/api/collections/${id}`, body));
    this.cache.invalidateCollection(id);
    return res;
  }

  async remove(id: string) {
    const res = await firstValueFrom(this.http.delete<void>(`/api/collections/${id}`));
    this.cache.invalidateCollection(id);
    return res;
  }

  async addField(collectionId: string, body: FieldInput) {
    const res = await firstValueFrom(this.http.post<Field>(`/api/collections/${collectionId}/fields`, body));
    this.cache.invalidateCollection(collectionId);
    return res;
  }

  async updateField(fieldId: string, body: FieldPatch) {
    const res = await firstValueFrom(this.http.patch<Field>(`/api/fields/${fieldId}`, body));
    this.cache.invalidate('/api/collections');
    return res;
  }

  async removeField(fieldId: string) {
    const res = await firstValueFrom(this.http.delete<void>(`/api/fields/${fieldId}`));
    this.cache.invalidate('/api/collections');
    return res;
  }

  async reorderFields(collectionId: string, fieldIds: string[]) {
    const res = await firstValueFrom(this.http.put<Field[]>(`/api/collections/${collectionId}/fields/order`, { fieldIds }));
    this.cache.invalidateCollection(collectionId);
    return res;
  }

  /** Applies a cover chosen in the picker. Images are uploaded as multipart. */
  async applyCover(collectionId: string, selection: CoverSelection): Promise<Cover> {
    let res: Cover;
    if (selection.type === 'image') {
      const form = new FormData();
      form.append('file', selection.blob, selection.blob.type === 'image/webp' ? 'cover.webp' : 'cover.jpg');
      res = await firstValueFrom(this.http.post<Cover>(`/api/collections/${collectionId}/cover/image`, form));
    } else {
      const body = selection.type === 'none' ? { type: 'none', value: null } : { type: selection.type, value: selection.value };
      res = await firstValueFrom(this.http.put<Cover>(`/api/collections/${collectionId}/cover`, body));
    }
    this.cache.invalidateCollection(collectionId);
    return res;
  }
}
