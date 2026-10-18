import { OPERATOR, OPERATOR_PLACEHOLDER } from '../../config/operator';
import type { OperatorDetails } from '../../config/operator';

/** Clearly marked placeholder for missing operator data (never invented). */
export function Placeholder() {
  return <span className="placeholder">{OPERATOR_PLACEHOLDER}</span>;
}

function line(value: string) {
  return value.trim() ? value : null;
}

/** Name and postal address as an <address> block; placeholders for missing parts. */
export function OperatorAddress({ op = OPERATOR }: { op?: OperatorDetails }) {
  const name = line(op.name);
  const street = line(op.street);
  const city = [op.postalCode, op.city].map((v) => v.trim()).filter(Boolean).join(' ');
  const country = line(op.country);
  if (!name && !street && !city) {
    return (
      <address className="operator">
        <Placeholder />
      </address>
    );
  }
  return (
    <address className="operator">
      {name ?? <Placeholder />}
      <br />
      {street ?? <Placeholder />}
      <br />
      {city || <Placeholder />}
      {country && (
        <>
          <br />
          {country}
        </>
      )}
    </address>
  );
}

/** E-mail (mailto link for adults) and phone, with placeholders. */
export function OperatorContact({ op = OPERATOR }: { op?: OperatorDetails }) {
  const email = line(op.email);
  const phone = line(op.phone);
  return (
    <dl className="contact-list">
      <dt>E-Mail</dt>
      <dd>{email ? <a href={`mailto:${email}`}>{email}</a> : <Placeholder />}</dd>
      <dt>Telefon</dt>
      <dd>{phone ? <a href={`tel:${phone.replace(/[^\d+]/g, '')}`}>{phone}</a> : <Placeholder />}</dd>
    </dl>
  );
}
