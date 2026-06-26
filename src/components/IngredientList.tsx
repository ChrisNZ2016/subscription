import { useState, useRef } from 'react';
import { trackIngredientExpanded } from '../lib/analytics';

// ─── Ingredient list with hover explanations ─────────────────────────────────
// Edit the `tooltip` field to change the explanation shown on hover/tap.
export const ingredients: { name: string; tooltip: string }[] = [
  {
    name: 'Hydrolysed Chicken Meal',
    tooltip: 'A hypoallergenic protein source, the hydrolysis process breaks proteins into smaller fragments, dramatically reducing the risk of immune reactions in sensitive dogs.',
  },
  {
    name: 'Whole Peas',
    tooltip: 'A grain-free carbohydrate providing sustained energy, fibre for digestive health, and natural plant protein.',
  },
  {
    name: 'Tapioca Starch',
    tooltip: 'A gentle, easily digestible carbohydrate derived from cassava root. Grain-free and suitable for dogs with grain sensitivities.',
  },
  {
    name: 'Dried Sweet Potato',
    tooltip: 'Rich in dietary fibre, vitamins A and C, and potassium. Supports healthy digestion and provides antioxidant protection.',
  },
  {
    name: 'Chicken Fat',
    tooltip: 'A highly digestible fat source rich in omega-6 fatty acids. Supports a shiny coat, healthy skin, and provides concentrated energy.',
  },
  {
    name: 'Beet Pulp Granules',
    tooltip: 'A prebiotic fibre that feeds beneficial gut bacteria. Promotes firm stools and healthy digestive transit, not a filler, a functional ingredient.',
  },
  {
    name: 'Hydrolysed Chicken Pulp',
    tooltip: 'A secondary hydrolysed protein source that enhances palatability while remaining hypoallergenic for sensitive stomachs.',
  },
  {
    name: 'Salmon Oil',
    tooltip: 'Rich in omega-3 fatty acids (EPA & DHA) that reduce inflammation, support brain function, and give coats a healthy shine.',
  },
  {
    name: 'Powdered Cellulose',
    tooltip: 'A plant-derived dietary fibre that supports healthy digestion, helps regulate bowel movements, and contributes to satiety.',
  },
  {
    name: 'Ground Flaxseed',
    tooltip: 'An excellent plant source of omega-3 ALA fatty acids and lignans. Supports skin health, reduces inflammation, and provides fibre.',
  },
  {
    name: 'Carrot Granules',
    tooltip: 'Packed with beta-carotene (a precursor to vitamin A), fibre, and antioxidants. Supports eye health and immune function.',
  },
  {
    name: 'Dried Apples',
    tooltip: 'A natural source of quercetin and pectin, antioxidants that support immune health and gut motility.',
  },
  {
    name: 'Dried Cabbage',
    tooltip: 'Rich in vitamin K, vitamin C, and glucosinolates which support liver detoxification and immune function.',
  },
  {
    name: 'Dried Cauliflower',
    tooltip: 'A cruciferous superfood high in vitamin C and choline, supporting brain health and anti-inflammatory pathways.',
  },
  {
    name: 'Blueberry Powder',
    tooltip: 'One of the richest sources of antioxidants (anthocyanins). Supports cognitive function, immune health, and fights oxidative stress.',
  },
  {
    name: 'Taurine',
    tooltip: 'An essential amino acid important for heart muscle function, eye health, and immune support, especially critical for dogs on non-beef diets.',
  },
  {
    name: 'Retinyl Acetate (Vitamin A)',
    tooltip: 'Supports vision, immune function, and healthy skin and coat. A stable form of vitamin A that\'s efficiently absorbed.',
  },
  {
    name: 'Vitamin D3',
    tooltip: 'Essential for calcium and phosphorus absorption, supporting strong bones and teeth, and modulating immune responses.',
  },
  {
    name: 'dI-α-tocopheryl Acetate',
    tooltip: 'A stable form of vitamin E, a powerful antioxidant that protects cells from oxidative damage and supports immune function.',
  },
  {
    name: 'Thiamine Mononitrate (Vitamin B1)',
    tooltip: 'Critical for carbohydrate metabolism and healthy nervous system function. Deficiency can cause neurological issues in dogs.',
  },
  {
    name: 'Riboflavin (Vitamin B2)',
    tooltip: 'Supports energy production at the cellular level, healthy red blood cell formation, and skin and coat condition.',
  },
  {
    name: 'Pyridoxine Hydrochloride (Vitamin B6)',
    tooltip: 'Involved in amino acid metabolism, red blood cell production, and healthy immune and nervous system function.',
  },
  {
    name: 'Cyanocobalamin (Vitamin B12)',
    tooltip: 'Essential for DNA synthesis, nerve function, and red blood cell formation. Often lower in non-meat-heavy diets.',
  },
  {
    name: 'D-biotin',
    tooltip: 'Supports healthy skin, coat, and nail growth. Plays a key role in fatty acid synthesis and glucose metabolism.',
  },
  {
    name: 'Folic Acid',
    tooltip: 'Important for cell division, DNA synthesis, and amino acid metabolism. Supports healthy red blood cell production.',
  },
  {
    name: 'Niacinamide',
    tooltip: 'A form of vitamin B3 that supports energy metabolism, DNA repair, and healthy skin barrier function.',
  },
  {
    name: 'Calcium D-pantothenate',
    tooltip: 'Vitamin B5, involved in energy metabolism, hormone production, and the synthesis of coenzyme A. Supports adrenal function.',
  },
  {
    name: 'Choline Chloride',
    tooltip: 'Supports brain and nervous system function, liver health, and fat metabolism. Often grouped with B vitamins.',
  },
  {
    name: 'Zinc Sulphate',
    tooltip: 'Essential for immune function, wound healing, skin and coat health, and over 300 enzyme reactions in the body.',
  },
  {
    name: 'Copper Sulphate',
    tooltip: 'Supports iron absorption, collagen synthesis, and healthy pigmentation of coat and skin.',
  },
  {
    name: 'Ferrous Sulphate',
    tooltip: 'A bioavailable form of iron essential for red blood cell production and oxygen transport throughout the body.',
  },
  {
    name: 'Manganese Sulphate',
    tooltip: 'Supports bone development, cartilage formation, and the activation of enzymes involved in antioxidant defence.',
  },
  {
    name: 'Sodium Selenite',
    tooltip: 'A source of selenium, a trace mineral and antioxidant that works with vitamin E to protect cells from oxidative damage.',
  },
  {
    name: 'Calcium Iodate',
    tooltip: 'Provides iodine, which is essential for thyroid hormone production that regulates metabolism and energy levels.',
  },
  {
    name: 'Potassium Chloride',
    tooltip: 'Maintains fluid and electrolyte balance, supports nerve and muscle function, and healthy heart rhythm.',
  },
  {
    name: 'DL-methionine',
    tooltip: 'An essential sulphur-containing amino acid important for protein synthesis, antioxidant production (glutathione), and urinary health.',
  },
  {
    name: 'L-lysine Hydrochloride',
    tooltip: 'An essential amino acid that supports collagen production, immune function, and the absorption of calcium.',
  },
  {
    name: 'Fructo-oligosaccharides (FOS)',
    tooltip: 'A prebiotic fibre that selectively feeds beneficial gut bacteria (Lactobacillus & Bifidobacterium), supporting a healthy microbiome.',
  },
  {
    name: 'Rosemary Extract',
    tooltip: 'A natural antioxidant that helps preserve freshness and fat quality in the kibble, without the need for artificial preservatives.',
  },
  {
    name: 'Yucca Schidigera Extract',
    tooltip: 'A natural plant extract that binds ammonia in the gut, reducing faecal odour and supporting overall digestive health.',
  },
  {
    name: 'Preservative (TBHQ)',
    tooltip: 'Tert-Butylhydroquinone, a safe, approved antioxidant preservative that prevents fat oxidation (rancidity), keeping the kibble fresh and nutritionally stable.',
  },
  {
    name: 'Calcium Phosphate',
    tooltip: 'Provides both calcium and phosphorus in a highly bioavailable form, supporting strong bones, teeth, and cellular energy (ATP) production.',
  },
];

function IngredientItem({
  name,
  tooltip,
  open,
  onOpen,
  onClose,
  onHoverOpen,
}: {
  name: string;
  tooltip: string;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onHoverOpen: () => void;
}) {
  const isTouchRef = useRef(false);

  return (
    <div
      className={`ing-item ${open ? 'ing-item--open' : ''}`}
      onMouseEnter={() => { if (!isTouchRef.current) onHoverOpen(); }}
      onMouseLeave={() => { if (!isTouchRef.current) onClose(); }}
      onTouchStart={() => { isTouchRef.current = true; }}
      onClick={onOpen}
    >
      <span className="ing-name">{name}</span>
      {open && (
        <div className="ing-tooltip" role="tooltip">
          {tooltip}
        </div>
      )}
    </div>
  );
}

export function IngredientList() {
  const [activeIngredient, setActiveIngredient] = useState<string | null>(null);

  const openIngredient = (name: string) => {
    setActiveIngredient((prev) => {
      if (prev === name) return prev;
      trackIngredientExpanded({ name });
      return name;
    });
  };

  const toggleIngredient = (name: string) => {
    setActiveIngredient((prev) => {
      if (prev === name) return null;
      trackIngredientExpanded({ name });
      return name;
    });
  };

  return (
    <div className="ing-list">
      {ingredients.map((ing) => (
        <IngredientItem
          key={ing.name}
          name={ing.name}
          tooltip={ing.tooltip}
          open={activeIngredient === ing.name}
          onOpen={() => toggleIngredient(ing.name)}
          onClose={() => setActiveIngredient(null)}
          onHoverOpen={() => openIngredient(ing.name)}
        />
      ))}
    </div>
  );
}
