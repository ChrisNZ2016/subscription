const testimonials = [
  {
    dogName: 'Bella',
    breed: 'French Bulldog',
    ownerName: 'Sarah M.',
    stars: 5,
    quote:
      'Bella used to scratch constantly. After two weeks on Little Green Dog, the itching stopped completely. Her coat is shinier than ever.',
  },
  {
    dogName: 'Max',
    breed: 'Labrador',
    ownerName: 'James T.',
    stars: 5,
    quote:
      'We tried everything for Max\'s sensitive stomach. This is the first food he can eat without any digestive issues. Game changer.',
  },
  {
    dogName: 'Luna',
    breed: 'Border Collie',
    ownerName: 'Olivia R.',
    stars: 5,
    quote:
      'Luna\'s energy levels are through the roof and her coat is so soft. Plus the subscription means we never run out. Love it.',
  },
];

export function TestimonialsSection() {
  return (
    <section className="testimonials-section">
      <div className="testimonials-inner">
        <span className="section-label">Testimonials</span>
        <h2>Dogs (and their humans) love it</h2>
        <div className="testimonial-cards">
          {testimonials.map((t) => (
            <div className="testimonial-card" key={t.dogName}>
              <div className="testimonial-stars" aria-label={`${t.stars} out of 5 stars`}>
                {Array.from({ length: t.stars }, (_, i) => (
                  <span key={i} aria-hidden="true">{'\u2605'}</span>
                ))}
              </div>
              <blockquote className="testimonial-quote">
                "{t.quote}"
              </blockquote>
              <div className="testimonial-footer">
                <div className="testimonial-attribution">
                  <strong>{t.ownerName}</strong>
                  <span>{t.dogName} the {t.breed}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
