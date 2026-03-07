const features = [
  {
    number: 1,
    title: 'Hypoallergenic Formula',
    description:
      'No beef, dairy, gluten, or wheat — designed from the ground up for dogs with food sensitivities.',
  },
  {
    number: 2,
    title: 'Grain-Free Nutrition',
    description:
      'Sweet potato and chickpea-based carbs deliver sustained energy without triggering grain allergies.',
  },
  {
    number: 3,
    title: 'Superfoods Inside',
    description:
      'Blueberries, spinach, kelp, and cranberries provide antioxidants and immune support in every bite.',
  },
  {
    number: 4,
    title: 'Gut Health First',
    description:
      'Prebiotics, probiotics, and pumpkin promote smooth digestion and a healthy microbiome.',
  },
  {
    number: 5,
    title: 'Premium Proteins',
    description:
      'Turkey, salmon, and duck — easy-to-digest protein sources that minimise allergic reactions.',
  },
  {
    number: 6,
    title: 'Coat & Joint Support',
    description:
      'Salmon oil, flaxseed, and omega fatty acids keep coats shiny and joints flexible.',
  },
];

export function WhyYoullLoveIt() {
  return (
    <section className="why-love-section">
      <div className="why-love-inner">
        <div className="why-love-content">
          <span className="section-label">Why You'll Love It</span>
          <h2>Built different — for dogs that need different</h2>
          <div className="why-love-features">
            {features.map((f) => (
              <div className="why-love-feature" key={f.number}>
                <div className="why-love-number" aria-hidden="true">
                  {f.number}
                </div>
                <div className="why-love-text">
                  <h3>{f.title}</h3>
                  <p>{f.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="why-love-image">
          <div
            className="why-love-image-placeholder"
            role="img"
            aria-label="Little Green Dog kibble product"
          >
            {features.map((f) => (
              <span
                className={`annotation-dot annotation-dot-${f.number}`}
                key={f.number}
                aria-hidden="true"
              >
                {f.number}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
