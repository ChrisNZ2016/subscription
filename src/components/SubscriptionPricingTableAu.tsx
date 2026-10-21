import { AU_SUBSCRIPTION_PRICES } from '../lib/au-pricing';

interface SubscriptionPricingTableAuProps {
  className?: string;
}

/**
 * AUD subscription pricing for the Australian demand test. Separate from the NZ
 * table because it shows retail alongside the subscription price — the AU test
 * is measuring whether the saving is what moves people, with no stock to sell.
 */
export function SubscriptionPricingTableAu({ className }: SubscriptionPricingTableAuProps) {
  const tableClassName = [
    'subscription-pricing-table',
    'subscription-pricing-table--au',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <table className={tableClassName}>
      <thead>
        <tr>
          <th scope="col">Bag Size</th>
          <th scope="col">Retail</th>
          <th scope="col">Subscription</th>
        </tr>
      </thead>
      <tbody>
        {AU_SUBSCRIPTION_PRICES.map((row) => (
          <tr key={row.bagSizeKg}>
            <td>{row.bagSizeKg} KG</td>
            <td className="subscription-pricing-retail">
              <del>{row.retail}</del>
            </td>
            <td>
              {row.subscription}
              <span className="subscription-pricing-perkg">{row.perKg}/kg</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
