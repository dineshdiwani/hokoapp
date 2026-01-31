export interface City {
  id: string;
  name: string;
  state: string;
}

export interface User {
  id: string;
  mobile: string;
  city_id: string;
  is_buyer: boolean;
  is_seller: boolean;
  firm_name?: string;
  manager_name?: string;
  created_at: string;
  city?: City;
}

export interface Post {
  id: string;
  user_id: string;
  city_id: string;
  product_name: string;
  category?: string;
  brand?: string;
  quantity?: number;
  unit?: string;
  fragrance?: string;
  details?: string;
  status: string;
  offer_count: number;
  created_at: string;
  updated_at?: string;
  user?: User;
  city?: City;
  attachments?: string[]; // Array of attachment URLs
}


export interface Offer {
  id: string;
  post_id: string;
  seller_id: string;
  price: number;
  price_unit?: string;
  notes?: string;
  status: string;
  created_at: string;
  updated_at?: string;
  seller?: User;
  post?: Post;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message?: string;
  post_id?: string;
  offer_id?: string;
  is_read: boolean;
  created_at: string;
}

export interface ProductRequirement {
  productName: string;
  category: string;
  brand: string;
  quantity: number;
  unit: string;
  fragrance: string;
  details: string;
  attachments?: File[]; // Array of File objects for attachments
}


export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  post_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender?: User;
  receiver?: User;
}

export interface ChatThread {
  post_id: string;
  other_user_id: string;
  other_user?: User;
  post?: Post;
  last_message?: Message;
  unread_count: number;
}
