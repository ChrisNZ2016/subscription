import type { Product } from '../types/shopify';
import type { AddonSelection } from '../lib/cart';

interface AddonsStepProps {
  addonProducts: Product[];
  selectedAddons: AddonSelection[];
  onToggleAddon: (product: Product) => void;
  onAddonQuantityChange: (variantId: string, quantity: number) => void;
  onContinue: () => void;
  onSkip: () => void;
}

function getAddonPrice(product: Product): string | null {
  const variant = product.variants.nodes[0];
  if (!variant) return null;

  const allocation = variant.sellingPlanAllocations.nodes[0];
  if (allocation) {
    return formatMoney(allocation.priceAdjustments[0].perDeliveryPrice);
  }

  return formatMoney(variant.price);
}

function formatMoney(money: { amount: string; currencyCode: string }): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: money.currencyCode,
  }).format(parseFloat(money.amount));
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
        <h2>Add extras to every delivery</h2>
        <p className="step-subtitle">
          Treats, toppers, and supplements — delivered alongside your kibble.
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
            const price = getAddonPrice(product);
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
                  {product.description && (
                    <span className="addon-desc">{product.description}</span>
                  )}
                  {price && (
                    <span className="addon-price">{price}/delivery</span>
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
