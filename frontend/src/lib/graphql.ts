import { gql } from "@apollo/client";

export const START_IMPORT = gql`
  mutation StartImport($schoolId: ID!, $studentFile: Upload!, $classFile: Upload!) {
    startImport(schoolId: $schoolId, studentFile: $studentFile, classFile: $classFile) {
      id
      status
      totalRows
    }
  }
`;

export const GET_JOB = gql`
  query GetJob($id: ID!) {
    importJob(id: $id) {
      id
      status
      totalRows
      processedRows
      failedRows
    }
  }
`;

export const GET_PROBLEM_ROWS = gql`
  query GetProblemRows($jobId: ID!) {
    problemRows(jobId: $jobId) {
      id
      rowNumber
      entityType
      rawData
      status
      errors
      conflictType
    }
  }
`;

export const EDIT_ROW = gql`
  mutation EditRow($rowId: ID!, $data: JSON!) {
    editStagingRow(rowId: $rowId, data: $data) {
      id
      status
    }
  }
`;

export const RESOLVE_CONFLICT = gql`
  mutation ResolveConflict($rowId: ID!, $action: String!) {
    resolveConflict(rowId: $rowId, action: $action) {
      id
      status
    }
  }
`;

export const REVALIDATE_JOB = gql`
  mutation RevalidateJob($jobId: ID!, $schoolId: ID!) {
    revalidateJob(jobId: $jobId, schoolId: $schoolId) {
      id
      status
    }
  }
`;

export const CONFIRM_AND_QUEUE = gql`
  mutation ConfirmAndQueue($jobId: ID!, $schoolId: ID!) {
    confirmAndQueue(jobId: $jobId, schoolId: $schoolId) {
      id
      status
    }
  }
`;
