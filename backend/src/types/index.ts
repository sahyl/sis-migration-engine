export type EntityType = "student" | "class";

export interface RawRecord {
  rowNumber: number;
  entityType: EntityType;
  data: Record<string, string>;
}

export type RowStatus =
  | "pending"
  | "valid"
  | "schema_error"
  | "reference_error"
  | "conflict"
  | "committed"
  | "commit_failed";

export type ConflictType = "prod_collision" | "intra_batch_duplicate";

export type ConflictAction = "delete_row" | "edit_row" | "overwrite_existing" | "skip";

export interface StagingRow {
  id: number;
  job_id: string;
  row_number: number;
  entity_type: EntityType;
  raw_data: Record<string, string>;
  edited_data: Record<string, string> | null;
  status: RowStatus;
  errors: { field: string; message: string }[];
  conflict_type: ConflictType | null;
  matched_entity_id: string | null;
}

export interface ImportJob {
  id: string;
  school_id: string;
  source_system: string;
  status: "pending" | "validating" | "needs_review" | "queued" | "processing" | "completed" | "failed";
  file_url: string;
  total_rows: number;
  processed_rows: number;
  failed_rows: number;
}
