/**
 * Operator ("Diensteanbieter" / "Verantwortlicher") details for the Impressum (§ 5 DDG, § 18 Abs. 2 MStV)
 * and the Datenschutzerklärung (Art. 13 DSGVO).
 *
 * TODO(operator): Fill in ALL fields with the real data of the person or organisation running this site
 * BEFORE deploying. Never invent or guess these values. A postal address must be a street address
 * (no PO box); the fragFINN whitelist additionally asks for a phone number.
 *
 * While a field is empty, the pages show the clearly marked placeholder '[Angaben zum Betreiber folgen]'.
 */
export interface OperatorDetails {
  /** Full name of the natural person or organisation (incl. legal form). */
  name: string;
  /** Street and house number. */
  street: string;
  postalCode: string;
  city: string;
  /** e.g. 'Deutschland'. */
  country: string;
  email: string;
  phone: string;
  /** Person responsible for the content per § 18 Abs. 2 MStV (name). Leave empty if it is `name`. */
  contentResponsible: string;
  /** Address of the content-responsible person if different from the operator address (one line). */
  contentResponsibleAddress: string;
  /** Optional data protection officer contact (only if one is appointed). */
  dataProtectionOfficer: string;
}

export const OPERATOR: OperatorDetails = {
  name: '',
  street: '',
  postalCode: '',
  city: '',
  country: '',
  email: '',
  phone: '',
  contentResponsible: '',
  contentResponsibleAddress: '',
  dataProtectionOfficer: '',
};

/** Shown wherever operator data is still missing. */
export const OPERATOR_PLACEHOLDER = '[Angaben zum Betreiber folgen]';

/** true when the minimum for an Impressum (name, postal address, e-mail) is filled in. */
export function hasOperatorDetails(op: OperatorDetails = OPERATOR): boolean {
  return [op.name, op.street, op.postalCode, op.city, op.email].every((v) => v.trim() !== '');
}
