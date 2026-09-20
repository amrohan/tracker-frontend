import { HttpClient, HttpParams } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LookupItem, RecordDetail } from './models';

@Service()
export class RecordsApi {
  private readonly http = inject(HttpClient);

  create(collectionId: string, values: Record<string, unknown>) {
    return firstValueFrom(this.http.post<RecordDetail>(`/api/collections/${collectionId}/records`, { values }));
  }
  update(recordId: string, values: Record<string, unknown>, version: number) {
    return firstValueFrom(this.http.patch<RecordDetail>(`/api/records/${recordId}`, { values, version }));
  }
  remove(recordId: string, force: boolean) {
    return firstValueFrom(this.http.delete<void>(`/api/records/${recordId}`, { params: force ? { force: 'true' } : {} }));
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
