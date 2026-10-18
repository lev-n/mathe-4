import { StarIcon } from './icons';

/**
 * 0–3 mastery stars. Filled vs outlined stars differ in shape fill, not only colour,
 * and the accessible name says the number in words.
 */
export function Stars({ count }: { count: 0 | 1 | 2 | 3 }) {
  return (
    <span className="stars" role="img" aria-label={`${count} von 3 Sternen`}>
      {[0, 1, 2].map((i) => (
        <StarIcon key={i} filled={i < count} />
      ))}
    </span>
  );
}

/** Legend that explains what the stars mean (stars always come with a legend). */
export function StarLegend() {
  return (
    <ul className="star-legend" aria-label="So sind die Sterne gemeint">
      <li>
        <Stars count={1} /> Geübt
      </li>
      <li>
        <Stars count={2} /> Sicher
      </li>
      <li>
        <Stars count={3} /> Gemeistert
      </li>
    </ul>
  );
}
