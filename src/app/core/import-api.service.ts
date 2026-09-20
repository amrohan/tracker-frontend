import { HttpClient } from "@angular/common/http";
import { Service, inject } from "@angular/core";
import { firstValueFrom } from "rxjs";
import { ImportRequest, ImportResult } from "./models";

@Service()
export class ImportApi {
  private readonly http = inject(HttpClient);

  run(collectionId: string, body: ImportRequest): Promise<ImportResult> {
    return firstValueFrom(
      this.http.post<ImportResult>(
        `/api/collections/${collectionId}/import`,
        body,
      ),
    );
  }
}
