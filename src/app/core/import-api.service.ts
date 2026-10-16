import { HttpClient } from "@angular/common/http";
import { Service, inject } from "@angular/core";
import { firstValueFrom } from "rxjs";
import { ImportRequest, ImportResult } from "./models";
import { HttpCacheService } from "./http-cache.service";

@Service()
export class ImportApi {
  private readonly http = inject(HttpClient);
  private readonly cache = inject(HttpCacheService);

  async run(collectionId: string, body: ImportRequest): Promise<ImportResult> {
    const res = await firstValueFrom(
      this.http.post<ImportResult>(
        `/api/collections/${collectionId}/import`,
        body,
      ),
    );
    this.cache.invalidateCollection(collectionId);
    return res;
  }
}
