import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AggregationType, CollectionDetail, Cover, CoverSelection, Field, FieldConfig, FieldInput, FieldType } from './models';

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

  create(body: CreateCollectionBody) { return firstValueFrom(this.http.post<CollectionDetail>('/api/collections', body)); }
  update(id: string, body: { name?: string; description?: string; icon?: string }) {
    return firstValueFrom(this.http.patch<CollectionDetail>(`/api/collections/${id}`, body));
  }
  remove(id: string) { return firstValueFrom(this.http.delete<void>(`/api/collections/${id}`)); }

  addField(collectionId: string, body: FieldInput) {
    return firstValueFrom(this.http.post<Field>(`/api/collections/${collectionId}/fields`, body));
  }
  updateField(fieldId: string, body: FieldPatch) { return firstValueFrom(this.http.patch<Field>(`/api/fields/${fieldId}`, body)); }
  removeField(fieldId: string) { return firstValueFrom(this.http.delete<void>(`/api/fields/${fieldId}`)); }
  reorderFields(collectionId: string, fieldIds: string[]) {
    return firstValueFrom(this.http.put<Field[]>(`/api/collections/${collectionId}/fields/order`, { fieldIds }));
  }

  /** Applies a cover chosen in the picker. Images are uploaded as multipart. */
  applyCover(collectionId: string, selection: CoverSelection): Promise<Cover> {
    if (selection.type === 'image') {
      const form = new FormData();
      form.append('file', selection.blob, selection.blob.type === 'image/webp' ? 'cover.webp' : 'cover.jpg');
      return firstValueFrom(this.http.post<Cover>(`/api/collections/${collectionId}/cover/image`, form));
    }
    const body = selection.type === 'none' ? { type: 'none', value: null } : { type: selection.type, value: selection.value };
    return firstValueFrom(this.http.put<Cover>(`/api/collections/${collectionId}/cover`, body));
  }
}
