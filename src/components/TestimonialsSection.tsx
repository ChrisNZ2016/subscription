const testimonials = [
  {
    dogName: 'Hudson',
    breed: 'Huntaway',
    ownerName: 'Sam',
    stars: 5,
    quote:
      "One thing that's important to us is Hudson's joint health after his luxating patella surgeries. It's great knowing that there's things like salmon oil in there and that it's also supporting his joint mobility as well as his coat.",
    avatarSrc: '/testimonials/sam.jpg',
    instagramUrl: 'https://www.instagram.com/hudson_thehuntaway/',
    accentColor: '#e8f5c8',
    accentBorder: '#ACD45C',
  },
  {
    dogName: 'Kronk & Yzma',
    breed: 'Golden Doodles',
    ownerName: 'Pauli',
    stars: 5,
    quote:
      'Kronk & Yzma love the food, their tummies are so healthy and I can see the difference in their energy and poop.',
    avatarSrc: '/testimonials/pauli.jpg',
    instagramUrl: 'https://www.instagram.com/goldenduonz/',
    accentColor: '#eef0f9',
    accentBorder: '#5465A3',
  },
  {
    dogName: 'Max & Charlie',
    ownerName: 'Ryan',
    stars: 5,
    quote:
      'We were so happy to find a food that Max and Charlie loved and that was so good for them.',
    avatarSrc: '/testimonials/ryan.jpg',
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
              key={`${t.ownerName}-${t.dogName}`}
              style={{
                '--card-accent': t.accentColor,
                '--card-border': t.accentBorder,
              } as React.CSSProperties}
            >
              <div className="testimonial-card-top">
                <div className="testimonial-avatar-wrap">
                  {t.instagramUrl ? (
                    <a
                      href={t.instagramUrl}
                      className="testimonial-avatar-link"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Visit ${t.dogName}'s Instagram`}
                    >
                      <img
                        src={t.avatarSrc}
                        alt={t.breed ? `${t.dogName} the ${t.breed}` : t.dogName}
                        className="testimonial-avatar-img"
                        loading="lazy"
                      />
                    </a>
                  ) : (
                    <img
                      src={t.avatarSrc}
                      alt={t.breed ? `${t.dogName} the ${t.breed}` : t.dogName}
                      className="testimonial-avatar-img"
                      loading="lazy"
                    />
                  )}
                </div>
                <div className="testimonial-meta">
                  <div className="testimonial-stars" aria-label={`${t.stars} out of 5 stars`}>
                    {Array.from({ length: t.stars }, (_, i) => (
                      <span key={i} aria-hidden="true">★</span>
                    ))}
                  </div>
                  {t.instagramUrl ? (
                    <a
                      href={t.instagramUrl}
                      className="testimonial-owner testimonial-owner-link"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t.ownerName}
                    </a>
                  ) : (
                    <strong className="testimonial-owner">{t.ownerName}</strong>
                  )}
                  <span className="testimonial-dog">
                    {t.breed ? `${t.dogName} the ${t.breed}` : t.dogName}
                  </span>
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
