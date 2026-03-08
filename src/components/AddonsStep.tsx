import type { Product } from '../types/shopify';
import type { AddonSelection } from '../lib/cart';

const CUSTOM_DESCRIPTIONS: Record<string, string> = {
  'hypoallergenic-dog-treat': 'Delicious and gentle on the tummy.',
  'compostable-poop-bags-60-pack': '100% compostable and extra thick. 60 pack.',
  'compostable-poop-bags-120-pack': '100% compostable and extra thick. 120 pack.',
};

interface AddonsStepProps {
  addonProducts: Product[];
  selectedAddons: AddonSelection[];
  onToggleAddon: (product: Product) => void;
  onAddonQuantityChange: (variantId: string, quantity: number) => void;
  onContinue: () => void;
  onSkip: () => void;
}

function getAddonPricing(product: Product) {
  const variant = product.variants.nodes[0];
  if (!variant) return null;

  const normalPrice = parseFloat(variant.price.amount);

  const allocation = variant.sellingPlanAllocations.nodes[0];
  if (allocation) {
    const subPrice = parseFloat(allocation.priceAdjustments[0].perDeliveryPrice.amount);
    return {
      normalPrice,
      subPrice,
      saving: normalPrice - subPrice,
    };
  }

  return {
    normalPrice,
    subPrice: normalPrice,
    saving: 0,
  };
}

function formatMoney(amount: number): string {
  return '$' + (amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(2));
}

export function AddonsStep({
  addonProducts,
  selectedAddons,
  onToggleAddon,
  onAddonQuantityChange,
  onContinue,
  onSkip,
}: AddonsStepProps) {
  return (
    <section className="step" id="addons">
      <div className="step-inner">
        <span className="section-label">Step 2</span>
        <h2>Save even more by adding extras to every delivery</h2>
        <p className="step-subtitle">
          Poop bags and treats — delivered alongside your kibble.
          You can always change these later.
        </p>

        <div className="addon-cards">
          {addonProducts.map((product) => {
            const variant = product.variants.nodes[0];
            if (!variant) return null;

            const selected = selectedAddons.find(
              (a) => a.variantId === variant.id,
            );
            const isSelected = !!selected;
            const pricing = getAddonPricing(product);
            const image = product.images.nodes[0];

            return (
              <div
                key={product.id}
                className={`addon-card ${isSelected ? 'selected' : ''}`}
              >
                {image && (
                  <img
                    className="addon-image"
                    src={image.url}
                    alt={image.altText || product.title}
                  />
                )}
                <div className="addon-info">
                  <strong>{product.title}</strong>
                  {(CUSTOM_DESCRIPTIONS[product.handle] || product.description) && (
                    <span className="addon-desc">
                      {CUSTOM_DESCRIPTIONS[product.handle] || product.description}
                    </span>
                  )}
                  {pricing && (
                    <div className="addon-pricing">
                      {pricing.saving > 0 ? (
                        <span className="addon-price-line">
                          <span className="addon-price-compare">
                            {formatMoney(pricing.normalPrice)}
                          </span>
                          <span className="addon-price-sub">
                            {formatMoney(pricing.subPrice)}/delivery
                          </span>
                        </span>
                      ) : (
                        <span className="addon-price-sub">
                          {formatMoney(pricing.normalPrice)}/delivery
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="addon-actions">
                  <button
                    className={`btn ${isSelected ? 'btn-outline' : 'btn-secondary'}`}
                    onClick={() => onToggleAddon(product)}
                  >
                    {isSelected ? 'Remove' : 'Add'}
                  </button>
                  {isSelected && (
                    <select
                      className="addon-qty"
                      value={selected.quantity}
                      aria-label={`Quantity for ${product.title}`}
                      onChange={(e) =>
                        onAddonQuantityChange(variant.id, Number(e.target.value))
                      }
                    >
                      {[1, 2, 3, 4, 5].map((q) => (
                        <option key={q} value={q}>
                          {q}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="step-actions">
          <button className="btn btn-link" onClick={onSkip}>
            Skip for now
          </button>
          <button className="btn-order" onClick={onContinue}>
            Order Now
          </button>
        </div>
      </div>
    </section>
  );
}
