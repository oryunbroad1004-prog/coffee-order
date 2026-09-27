export type CategoryType = 
  | '전체'
  | '커피'
  | '논커피'
  | '티'
  | '에이드 / 주스'
  | '프라푸치노 / 블렌디드'
  | '디저트';

export interface Cafe {
  id: string;
  name: string;
  shortName: string;
  tagline: string;
  brandColor: string;
  accentColor: string;
  bgLight: string;
  logoText: string;
  categories: CategoryType[];
  isCustom?: boolean;
}

export type TemperatureOption = 'HOT' | 'ICE' | 'BOTH' | 'NONE';

export interface SizeOption {
  label: string; // e.g. Tall, Grande, Venti or Regular, Large
  volume?: string; // e.g. 355ml
  priceDelta: number; // e.g. 0, 500, 1000
}

export interface AvailableOptions {
  temperature: TemperatureOption;
  defaultTemp?: 'HOT' | 'ICE';
  sizes?: SizeOption[];
  hasSweetness?: boolean; // 100%, 70%, 50%, 0%
  hasIceLevel?: boolean; // 보통, 적게, 많이
  hasExtraShot?: boolean; // 샷 추가 (+500원)
  hasSyrup?: boolean; // 시럽 추가 (+500원)
  hasWhip?: boolean; // 휘핑크림 (+500원)
  hasWarming?: boolean; // 디저트 데움 옵션
}

export interface SelectedOptions {
  temperature?: 'HOT' | 'ICE';
  size?: SizeOption;
  sweetness?: string;
  iceLevel?: string;
  extraShots?: number; // count
  syrup?: string;
  whip?: boolean;
  warming?: boolean;
  notes?: string;
}

export interface Menu {
  id: string;
  cafeId: string;
  category: CategoryType;
  name: string;
  description: string;
  price: number;
  image?: string;
  availableOptions: AvailableOptions;
  isPopular?: boolean;
}

export interface MenuRestriction {
  enabled: boolean;
  allowedMenuIds: string[]; // List of specific menu IDs permitted
  allowedMenuNames: string[]; // Names for display & fallback
  allowedCategories?: CategoryType[]; // Optional category restriction
  maxPrice?: number; // Optional price limit
  customNotice?: string; // Optional message e.g. "커피, 라떼, 녹차 중에서만 골라주세요!"
}

export interface OrderMember {
  id: string;
  orderId: string;
  name: string;
  status?: 'ordered' | 'pending' | 'passed';
  passReason?: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  memberId: string;
  menuId: string;
  menuName: string;
  options: SelectedOptions;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface AccountInfo {
  bank: string;
  accountNumber: string;
  accountHolder: string;
}

export interface Order {
  id: string;
  cafeId: string;
  cafeName: string;
  createdAt: string;
  status: 'in_progress' | 'completed' | 'cancelled';
  totalAmount: number;
  totalQuantity: number;
  members: OrderMember[];
  items: OrderItem[];
  accountInfo?: AccountInfo;
  menuRestriction?: MenuRestriction;
  targetMemberCount?: number;
}

export type DutchPayMethod = 'actual' | 'equal';

export interface DutchPaySplitResult {
  memberId: string;
  memberName: string;
  amount: number;
  originalSubtotal: number;
  itemCount: number;
  itemsSummary: string;
  isRemainderPayer?: boolean;
}
