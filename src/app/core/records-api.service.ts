import { HttpClient, HttpParams } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LookupItem, RecordDetail } from './models';
import { HttpCacheService } from './http-cache.service';

@Service()
export class RecordsApi {
  private readonly http = inject(HttpClient);
  private readonly cache = inject(HttpCacheService);

  async create(collectionId: string, values: Record<string, unknown>) {
    const res = await firstValueFrom(this.http.post<RecordDetail>(`/api/collections/${collectionId}/records`, { values }));
    this.cache.invalidateCollection(collectionId);
    return res;
  }

  async update(recordId: string, values: Record<string, unknown>, version: number) {
    const res = await firstValueFrom(this.http.patch<RecordDetail>(`/api/records/${recordId}`, { values, version }));
    if (res?.record?.collectionId) {
      this.cache.invalidateCollection(res.record.collectionId);
    }
    this.cache.invalidate(`/api/records/${recordId}`);
    return res;
  }

  async remove(recordId: string, force: boolean) {
    const res = await firstValueFrom(this.http.delete<void>(`/api/records/${recordId}`, { params: force ? { force: 'true' } : {} }));
    this.cache.invalidate(`/api/records/${recordId}`);
    this.cache.invalidate('/records');
    this.cache.invalidate('/summary');
    this.cache.invalidate('/api/collections');
    return res;
  }

  lookup(collectionId: string, q: string) {
    return firstValueFrom(this.http.get<LookupItem[]>(`/api/collections/${collectionId}/records/lookup`, { params: { q, limit: 20 } }));
  }

  /** Downloads the (filtered) view as CSV. */
  async exportCsv(collectionId: string, params: Record<string, string | number>, fallbackName: string): Promise<void> {
    let httpParams = new HttpParams();
    for (const [k, v] of Object.entries(params)) httpParams = httpParams.set(k, String(v));
    const response = await firstValueFrom(this.http.get(`/api/collections/${collectionId}/records/export`, {
      params: httpParams, responseType: 'blob', observe: 'response',
    }));
    const blob = response.body;
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fallbackName}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
