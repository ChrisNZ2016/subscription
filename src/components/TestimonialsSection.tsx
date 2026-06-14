// Dog avatar images from Unsplash — swap with real customer photos
const testimonials = [
  {
    dogName: 'Bella',
    breed: 'French Bulldog',
    ownerName: 'Sarah M.',
    stars: 5,
    quote:
      'Bella used to scratch constantly. After two weeks on Little Green Dog, the itching stopped completely. Her coat is shinier than ever.',
    avatarSrc: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=160&q=75',
    accentColor: '#e8f5c8',
    accentBorder: '#ACD45C',
  },
  {
    dogName: 'Max',
    breed: 'Labrador',
    ownerName: 'James T.',
    stars: 5,
    quote:
      "We tried everything for Max's sensitive stomach. This is the first food he can eat without any digestive issues. Game changer.",
    avatarSrc: 'https://images.unsplash.com/photo-1561037404-61cd46aa615b?w=160&q=75',
    accentColor: '#eef0f9',
    accentBorder: '#5465A3',
  },
  {
    dogName: 'Luna',
    breed: 'Border Collie',
    ownerName: 'Olivia R.',
    stars: 5,
    quote:
      "Luna's energy levels are through the roof and her coat is so soft. Plus the subscription means we never run out. Love it.",
    avatarSrc: 'https://images.unsplash.com/photo-1503256207526-0d5523284d6a?w=160&q=75',
    accentColor: '#fdf8ee',
    accentBorder: '#d4a839',
  },
];

export function TestimonialsSection() {
  return (
    <section className="testimonials-section">
      <div className="testimonials-inner">
        <span className="section-label" style={{ display: 'block', textAlign: 'center' }}>
          Testimonials
        </span>
        <h2>Dogs (and their humans) love it</h2>
        <div className="testimonial-cards">
          {testimonials.map((t) => (
            <div
              className="testimonial-card"
              key={t.dogName}
              style={{
                '--card-accent': t.accentColor,
                '--card-border': t.accentBorder,
              } as React.CSSProperties}
            >
              <div className="testimonial-card-top">
                <div className="testimonial-avatar-wrap">
                  <img
                    src={t.avatarSrc}
                    alt={`${t.dogName} the ${t.breed}`}
                    className="testimonial-avatar-img"
                    loading="lazy"
                  />
                </div>
                <div className="testimonial-meta">
                  <div className="testimonial-stars" aria-label={`${t.stars} out of 5 stars`}>
                    {Array.from({ length: t.stars }, (_, i) => (
                      <span key={i} aria-hidden="true">★</span>
                    ))}
                  </div>
                  <strong className="testimonial-owner">{t.ownerName}</strong>
                  <span className="testimonial-dog">{t.dogName} the {t.breed}</span>
                </div>
              </div>
              <blockquote className="testimonial-quote">
                "{t.quote}"
              </blockquote>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
