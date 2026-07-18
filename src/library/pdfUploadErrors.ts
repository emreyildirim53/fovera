export type PdfImportErrorCode =
  | 'unsupported_file_type'
  | 'file_too_large'
  | 'invalid_pdf_signature'
  | 'password_protected'
  | 'too_many_pages'
  | 'javascript_actions'
  | 'attachments_present'
  | 'xfa_document'
  | 'no_extractable_text'
  | 'empty_text'
  | 'parse_failed';

export interface PdfImportErrorDetails {
  limit?: number;
  pages?: number;
  size?: number;
}

export class PdfImportError extends Error {
  readonly code: PdfImportErrorCode;
  readonly details: PdfImportErrorDetails;

  constructor(code: PdfImportErrorCode, details: PdfImportErrorDetails = {}, message?: string) {
    super(message ?? code);
    this.name = 'PdfImportError';
    this.code = code;
    this.details = details;
  }
}
