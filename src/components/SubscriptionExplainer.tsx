const steps = [
  {
    number: '1',
    title: 'Sample delivered right away',
    description:
      'Your 2kg sample box ships immediately. Try it risk-free at 50% off the regular price.',
  },
  {
    number: '2',
    title: 'Not a fit? Cancel for free',
    description:
      'If your dog doesn\'t love it, simply let us know before your next delivery. No charges, no lock-in, no awkward questions.',
  },
  {
    number: '3',
    title: 'Love it? We\'ll keep it coming',
    description:
      'If it\'s a hit, your next order ships automatically in 1 month — then every month after that. The perfect amount, on time, every time.',
  },
  {
    number: '4',
    title: 'Cancel anytime',
    description:
      'Your subscription is completely flexible. Pause, skip, or cancel anytime from your account — no hoops, no hassle.',
  },
];

export function SubscriptionExplainer() {
  return (
    <section className="subscription-explainer">
      <div className="subscription-explainer-inner">
        <span className="section-label">How subscriptions work</span>
        <h2>Simple, flexible, and always yours to control</h2>
        <p className="subscription-explainer-intro">
          We believe in earning your trust with every delivery — not locking you in from day one.
        </p>
        <div className="sub-steps">
          {steps.map((s) => (
            <div className="sub-step" key={s.number}>
              <div className="sub-step-number" aria-hidden="true">{s.number}</div>
              <div className="sub-step-content">
                <h3>{s.title}</h3>
                <p>{s.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
