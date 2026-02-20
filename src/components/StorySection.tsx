export function StorySection() {
  return (
    <section className="story-section">
      <div className="story-inner">
        <div className="story-image">
          <div className="story-image-placeholder" role="img" aria-label="Chloe the dog who inspired Little Green Dog" />
        </div>
        <div className="story-content">
          <span className="section-label">Our Story</span>
          <h2>Created for Chloe</h2>
          <p>
            Chloe had lifelong food sensitivities. Every commercial kibble we tried
            left her with itchy skin, digestive issues, and low energy. We spent years
            searching for the right food — and when we couldn't find it, we made it.
          </p>
          <p>
            Little Green Dog was born from a simple belief: every dog deserves food
            that doesn't make them feel terrible. Our hypoallergenic, grain-free
            formula is built from the ground up for sensitive stomachs — no beef,
            no dairy, no gluten, no wheat, no fillers.
          </p>
          <div className="sensitivity-promise">
            <strong>The Sensitivity Promise</strong>
            <p>
              If it's not the right fit for your dog, we'll refund you — just reach out.
              No hoops, no hassle.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
