export function BenefitsBar() {
  const metrics = [
    { value: '2,000', accent: '+', label: 'Happy dogs' },
    { value: '20', accent: '+', label: 'Superfoods per bag' },
    { value: '50', accent: '%', label: 'Off first box' },
    { value: '100', accent: '%', label: 'Money-back guarantee' },
  ];

  return (
    <section className="benefits-bar" aria-label="Key metrics">
      <div className="benefits-inner">
        {metrics.map((m) => (
          <div className="benefit-item" key={m.label}>
            <div className="benefit-icon">
              {m.value}<span>{m.accent}</span>
            </div>
            <span className="benefit-label">{m.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
