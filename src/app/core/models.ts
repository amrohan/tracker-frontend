export type FieldType =
  | 'text' | 'longText' | 'number' | 'currency' | 'date' | 'dateTime' | 'boolean'
  | 'select' | 'multiSelect' | 'rating' | 'reference' | 'multiReference' | 'url';
export type AggregationType = 'none' | 'count' | 'sum' | 'average' | 'min' | 'max';
export type CoverType = 'none' | 'gradient' | 'color' | 'image';
export type ValueKind = 'text' | 'number' | 'date' | 'dateTime' | 'boolean' | 'choice' | 'multiChoice';
export type FilterOperator =
  | 'contains' | 'notContains' | 'equal' | 'notEqual' | 'startsWith'
  | 'greaterThan' | 'greaterThanOrEqual' | 'lessThan' | 'lessThanOrEqual'
  | 'between' | 'before' | 'after' | 'isEmpty' | 'isNotEmpty';

export interface User { id: string; email: string; displayName: string; }
export interface AuthResponse { accessToken: string; expiresAt: string; user: User; }

export interface Cover { type: CoverType; value?: string | null; version?: number | null; }

export interface FieldConfig {
  options?: string[] | null;
  targetCollectionId?: string | null;
  currency?: string | null;
  min?: number | null;
  max?: number | null;
}

export interface Field {
  id: string;
  collectionId: string;
  name: string;
  key: string;
  description?: string | null;
  type: FieldType;
  required: boolean;
  sortOrder: number;
  config: FieldConfig;
  aggregation: AggregationType;
  isTitle: boolean;
  showInList: boolean;
}

export interface CollectionSummary {
  id: string; name: string; description?: string | null; icon: string; cover: Cover;
  recordCount: number; fieldCount: number; lastActivityAt?: string | null;
  createdAt: string; updatedAt: string;
}

export interface CollectionDetail {
  id: string; name: string; description?: string | null; icon: string; cover: Cover;
  recordCount: number; lastActivityAt?: string | null; createdAt: string; updatedAt: string;
  fields: Field[];
}

export interface FieldTypeInfo {
  type: FieldType; label: string; kind: ValueKind;
  operators: FilterOperator[]; aggregations: AggregationType[];
  sortable: boolean; convertibleTo: FieldType[];
}

export interface TrackerRecord {
  id: string; collectionId: string; values: Record<string, unknown>;
  createdAt: string; updatedAt: string; version: number;
}
export interface RecordReference { id: string; collectionId: string; label: string; }
export interface RecordList {
  items: TrackerRecord[]; total: number; page: number; pageSize: number;
  references: Record<string, RecordReference>;
}
export interface RecordDetail { record: TrackerRecord; references: Record<string, RecordReference>; }
export interface LookupItem { id: string; label: string; }

export interface SummaryMetric {
  fieldId: string; fieldName: string; fieldType: FieldType; aggregation: AggregationType;
  currency?: string | null; value?: number | string | null;
}
export interface SummaryReport { recordCount: number; lastActivityAt?: string | null; metrics: SummaryMetric[]; }

export interface ApiFilter { fieldId: string; operator: FilterOperator; value?: unknown; value2?: unknown; }

export interface FieldInput {
  name: string; type: FieldType; required: boolean; config: FieldConfig | null;
  aggregation: AggregationType; isTitle: boolean; showInList: boolean; description: string | null;
}

/** What the cover picker returns. */
export type CoverSelection =
  | { type: 'none' }
  | { type: 'gradient' | 'color'; value: string }
  | { type: 'image'; blob: Blob };
