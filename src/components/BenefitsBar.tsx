export function BenefitsBar() {
  const benefits = [
    { icon: '\u2714', label: 'Healthy Digestion' },
    { icon: '\u2728', label: 'Shiny Coat' },
    { icon: '\u26A1', label: 'Joint Support' },
    { icon: '\u2764', label: 'Immune Support' },
    { icon: '\u2705', label: 'Odour Control' },
    { icon: '\u2B50', label: 'Superfoods' },
  ];

  return (
    <section className="benefits-bar" aria-label="Product benefits">
      <div className="benefits-inner">
        {benefits.map((b) => (
          <div className="benefit-item" key={b.label}>
            <span className="benefit-icon" aria-hidden="true">{b.icon}</span>
            <span className="benefit-label">{b.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
