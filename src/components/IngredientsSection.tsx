const ingredientCategories = [
  {
    name: 'Hypoallergenic Proteins',
    why: 'Easy-to-digest protein sources that minimise allergic reactions',
    what: 'Turkey, salmon, duck',
  },
  {
    name: 'Grain-Free Carbs',
    why: 'Sustained energy without common grain allergens',
    what: 'Sweet potato, chickpeas, peas',
  },
  {
    name: 'Functional Fats & Omegas',
    why: 'Support coat health, brain function, and reduce inflammation',
    what: 'Salmon oil, flaxseed, coconut oil',
  },
  {
    name: 'Digestive & Gut Health',
    why: 'Promote healthy gut flora and smooth digestion',
    what: 'Prebiotics, probiotics, pumpkin, chicory root',
  },
  {
    name: 'Essential Vitamins',
    why: 'Fill nutritional gaps for complete daily nutrition',
    what: 'Vitamins A, D3, E, B-complex, biotin',
  },
  {
    name: 'Vital Minerals',
    why: 'Support bones, teeth, and metabolic function',
    what: 'Calcium, phosphorus, zinc, iron, selenium',
  },
  {
    name: 'Antioxidants & Whole Foods',
    why: 'Fight free radicals and support immune health',
    what: 'Blueberries, cranberries, spinach, kelp',
  },
  {
    name: 'Amino Acids',
    why: 'Building blocks for muscle repair and overall vitality',
    what: 'Taurine, L-carnitine, methionine',
  },
];

const excluded = [
  'No beef',
  'No dairy',
  'No gluten',
  'No wheat',
  'No grain',
  'No fillers',
  'No artificial colours',
];

export function IngredientsSection() {
  return (
    <section className="ingredients-section">
      <div className="ingredients-inner">
        <span className="section-label">Ingredients</span>
        <h2>We're transparent about everything that goes in — and why</h2>
        <p className="ingredients-subtitle">
          Every ingredient earns its place. Here's what's inside and the role it
          plays in your dog's health.
        </p>
        <div className="ingredient-grid">
          {ingredientCategories.map((cat) => (
            <div className="ingredient-card" key={cat.name}>
              <h3>{cat.name}</h3>
              <p className="ingredient-why"><strong>Why:</strong> {cat.why}</p>
              <p className="ingredient-what"><strong>What:</strong> {cat.what}</p>
            </div>
          ))}
        </div>
        <div className="ingredients-excluded">
          <h3>What's NOT in our food</h3>
          <div className="excluded-list">
            {excluded.map((item) => (
              <span className="excluded-tag" key={item}>{item}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
