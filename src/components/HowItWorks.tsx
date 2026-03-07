const steps = [
  {
    number: '1',
    title: 'Try your sample',
    description: 'Get a 2kg box at 50% off to see if your dog loves it.',
  },
  {
    number: '2',
    title: 'We set up your plan',
    description:
      'After the sample, your subscription auto-transitions to your chosen bag size and delivery frequency.',
  },
  {
    number: '3',
    title: 'Delivered to your door',
    description:
      'Fresh kibble arrives on schedule. Skip, pause, or cancel anytime — no lock-in.',
  },
];

export function HowItWorks() {
  return (
    <section className="how-it-works-section">
      <div className="how-it-works-inner">
        <span className="section-label">How it works</span>
        <h2>Three steps to happier mealtimes</h2>
        <div className="how-it-works-steps">
          {steps.map((s) => (
            <div className="how-it-works-step" key={s.number}>
              <div className="step-number" aria-hidden="true">{s.number}</div>
              <div>
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
