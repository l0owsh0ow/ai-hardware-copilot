export interface StructuredParams {
  application: string;
  power_supply: string;
  power_consumption: string;
  communication: string[];
  interface: string[];
  voltage: string;
  budget: string;
  duration: string;
  extra_notes: string;
}

export interface Component {
  id: string;
  part_number: string;
  category: string;
  subcategory: string;
  manufacturer: string;
  key_params: Record<string, unknown>;
  price_cny: number;
  price_unit: string;
  stock_status: string;
  datasheet_url: string;
  recommend_reason: string;
  match_score: number;
}

export interface ComponentDetail extends Component {
  description: string;
  package: string;
  supplier: string;
  supplier_url: string;
  tags: string[];
  typical_applications: string[];
  difficulty_level: string;
  notes: string;
}

export interface BOMItem {
  part_number: string;
  description: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  supplier: string;
  supplier_url: string;
  category: string;
}

export interface BOMTable {
  id: string;
  project_name: string;
  created_at: string;
  items: BOMItem[];
  total_cost: number;
}

export interface HistoryListItem {
  id: string;
  title: string;
  query_text: string;
  created_at: string;
  count: number;
}

export interface HistoryDetail extends HistoryListItem {
  params: StructuredParams;
  recommendations: Component[];
}

export interface LLMSettings {
  provider: string;
  model: string;
  base_url: string;
  api_key_set: boolean;
}
