// Product/Service Categories for hoko marketplace
export const PRODUCT_CATEGORIES = [
  { value: 'electronics', label: 'Electronics & Gadgets' },
  { value: 'clothing', label: 'Clothing & Apparel' },
  { value: 'food-beverages', label: 'Food & Beverages' },
  { value: 'health-beauty', label: 'Health & Beauty' },
  { value: 'home-garden', label: 'Home & Garden' },
  { value: 'industrial', label: 'Industrial & Machinery' },
  { value: 'automotive', label: 'Automotive & Vehicles' },
  { value: 'construction', label: 'Construction & Building Materials' },
  { value: 'agriculture', label: 'Agriculture & Farming' },
  { value: 'textiles', label: 'Textiles & Fabrics' },
  { value: 'chemicals', label: 'Chemicals & Raw Materials' },
  { value: 'packaging', label: 'Packaging & Printing' },
  { value: 'furniture', label: 'Furniture & Fixtures' },
  { value: 'sports-fitness', label: 'Sports & Fitness' },
  { value: 'stationery', label: 'Stationery & Office Supplies' },
  { value: 'toys-games', label: 'Toys & Games' },
  { value: 'jewelry', label: 'Jewelry & Accessories' },
  { value: 'medical', label: 'Medical & Healthcare Equipment' },
  { value: 'it-services', label: 'IT & Software Services' },
  { value: 'logistics', label: 'Logistics & Transportation' },
  { value: 'hospitality', label: 'Hospitality & Catering' },
  { value: 'education', label: 'Education & Training' },
  { value: 'security', label: 'Security & Safety' },
  { value: 'events', label: 'Events & Entertainment' },
  { value: 'other', label: 'Other' },
];

export const getCategoryLabel = (value: string): string => {
  const category = PRODUCT_CATEGORIES.find(c => c.value === value);
  return category?.label || value;
};
