import { ParityMarkConceptA } from '@/components/brand/concepts/ParityMarkConceptA';
import { ParityMarkConceptB } from '@/components/brand/concepts/ParityMarkConceptB';
import { ParityMarkConceptC } from '@/components/brand/concepts/ParityMarkConceptC';
import { ParityLogo } from '@/components/brand/ParityLogo';

const CONCEPTS = [
  {
    id: 'A',
    name: 'Equator',
    tagline: 'Full iso skeleton · equals cuts the mid-plane',
    Mark: ParityMarkConceptA,
  },
  {
    id: 'B',
    name: 'Meridian',
    tagline: 'Equals as structural spine · cube frames above & below',
    Mark: ParityMarkConceptB,
  },
  {
    id: 'C',
    name: 'Hollow',
    tagline: 'Airy corner frame · soft equals in negative space',
    Mark: ParityMarkConceptC,
  },
] as const;

export default function BrandConceptsPage() {
  return (
    <div className="container page-container brand-concepts">
      <header className="brand-concepts-header">
        <p className="brand-concepts-eyebrow">Logo exploration</p>
        <h1>Parity mark — 3 concepts</h1>
        <p className="brand-concepts-sub">
          3D dice skeleton + equals. Same blue→mint palette. Pick a direction and we&apos;ll refine.
        </p>
      </header>

      <div className="brand-concepts-current">
        <span className="brand-concepts-label">Current</span>
        <ParityLogo wordmarkClassName="landing-brand-wordmark" />
      </div>

      <div className="brand-concepts-grid">
        {CONCEPTS.map(({ id, name, tagline, Mark }) => (
          <article key={id} className="brand-concept-card">
            <div className="brand-concept-preview">
              <Mark size={96} />
            </div>
            <div className="brand-concept-meta">
              <span className="brand-concept-id">{id}</span>
              <h2>{name}</h2>
              <p>{tagline}</p>
            </div>
            <div className="brand-concept-lockup">
              <Mark size={36} />
              <span className="parity-wordmark">Parity</span>
            </div>
            <div className="brand-concept-sizes">
              <Mark size={28} />
              <Mark size={20} />
              <Mark size={16} />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
