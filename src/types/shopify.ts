export interface MoneyV2 {
  amount: string;
  currencyCode: string;
}

export interface Image {
  url: string;
  altText: string | null;
}

export interface SellingPlanPriceAdjustment {
  adjustmentValue: {
    __typename: string;
    adjustmentPercentage?: number;
    adjustmentAmount?: MoneyV2;
    price?: MoneyV2;
  };
}

export interface SellingPlan {
  id: string;
  name: string;
  priceAdjustments: SellingPlanPriceAdjustment[];
}

export interface SellingPlanGroup {
  name: string;
  sellingPlans: {
    nodes: SellingPlan[];
  };
}

export interface SellingPlanAllocation {
  sellingPlan: {
    id: string;
    name: string;
  };
  priceAdjustments: {
    compareAtPrice: MoneyV2;
    perDeliveryPrice: MoneyV2;
    price: MoneyV2;
  }[];
}

export interface ProductVariant {
  id: string;
  title: string;
  price: MoneyV2;
  compareAtPrice: MoneyV2 | null;
  sellingPlanAllocations: {
    nodes: SellingPlanAllocation[];
  };
}

export interface Product {
  id: string;
  title: string;
  handle: string;
  description: string;
  images: {
    nodes: Image[];
  };
  variants: {
    nodes: ProductVariant[];
  };
  sellingPlanGroups: {
    nodes: SellingPlanGroup[];
  };
}

export interface CartLine {
  merchandiseId: string;
  quantity: number;
  sellingPlanId?: string;
  attributes?: { key: string; value: string }[];
}

export interface CartCreateResponse {
  cartCreate: {
    cart: {
      id: string;
      checkoutUrl: string;
    };
    userErrors: {
      field: string[];
      message: string;
    }[];
  };
}
