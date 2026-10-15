export interface Review {
  quote: string;
  author: string;
  source?: string;
}

/** Empty until real customer reviews exist. The section shows an honest empty state. */
export const reviews: Review[] = [];
