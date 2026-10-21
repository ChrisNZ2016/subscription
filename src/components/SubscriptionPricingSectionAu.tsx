import { AU_SAMPLE_DISCOUNT_LABEL } from '../lib/au-pricing';
import { SubscriptionPricingTableAu } from './SubscriptionPricingTableAu';

export function SubscriptionPricingSectionAu() {
  return (
    <section className="subscription-pricing-section" id="subscription-pricing">
      <div className="subscription-pricing-inner">
        <span className="section-label" style={{ display: 'block', textAlign: 'center' }}>
          Subscription pricing
        </span>
        <h2>Know exactly what you&apos;ll pay if you subscribe</h2>
        <p className="subscription-pricing-intro">
          Your 2kg sample ships first at {AU_SAMPLE_DISCOUNT_LABEL}. If your dog loves it, you can
          continue by subscribing at the price below, delivered every 4 weeks. Change size, skip, or
          cancel anytime.
        </p>
        <SubscriptionPricingTableAu />
        <p className="subscription-pricing-note">
          Prices per delivery in Australian dollars. Shipping calculated at checkout.
        </p>
      </div>
    </section>
  );
}
