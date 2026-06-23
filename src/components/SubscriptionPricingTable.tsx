import { SUBSCRIPTION_PRICES } from '../lib/subscription-prices';

interface SubscriptionPricingTableProps {
  className?: string;
}

export function SubscriptionPricingTable({ className }: SubscriptionPricingTableProps) {
  const tableClassName = className
    ? `subscription-pricing-table ${className}`
    : 'subscription-pricing-table';

  return (
    <table className={tableClassName}>
      <thead>
        <tr>
          <th scope="col">Bag Size</th>
          <th scope="col">Subscription Price</th>
        </tr>
      </thead>
      <tbody>
        {SUBSCRIPTION_PRICES.map((row) => (
          <tr key={row.bagSizeKg}>
            <td>{row.bagSizeKg} KG</td>
            <td>{row.price}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
