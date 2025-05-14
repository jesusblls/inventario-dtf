export interface AmazonProduct {
  id: string;
  asin: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  stock: number;
  size: string;
  color: string;
  type: 'regular' | 'oversize';
  created_at: string;
  updated_at: string;
  amazon_products?: AmazonProduct[];
}

export interface Design {
  id: string;
  name: string;
  stock: number;
  created_at: string;
  updated_at: string;
}

export interface ProductDesign {
  id: string;
  product_id: string;
  design_id: string;
  created_at: string;
}