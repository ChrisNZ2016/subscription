import { SubscriptionPricingTable } from './SubscriptionPricingTable';

export function SubscriptionPricingSection() {
  return (
    <section className="subscription-pricing-section" id="subscription-pricing">
      <div className="subscription-pricing-inner">
        <span className="section-label" style={{ display: 'block', textAlign: 'center' }}>
          Subscription pricing
        </span>
        <h2>Know exactly what you&apos;ll pay if you subscribe</h2>
        <p className="subscription-pricing-intro">
          Your 2kg sample ships first at 50% off. If your dog loves it, you can continue by subscribing
         at the price below, delivered every 4 weeks. Change size, skip, or cancel anytime.
        </p>
        <SubscriptionPricingTable />
        <p className="subscription-pricing-note">Prices per delivery. Shipping calculated at checkout.</p>
      </div>
    </section>
  );
}
