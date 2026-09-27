import { Order, Menu, DutchPaySplitResult, MenuRestriction } from '../types';
import { INITIAL_MENUS } from '../data/menus';

const ORDERS_KEY = 'coffee_order_history_v1';
const MENUS_KEY = 'coffee_order_menus_v3';
const CUSTOM_CAFES_KEY = 'coffee_order_custom_cafes_v1';
const SAVED_ACCOUNT_KEY = 'coffee_order_saved_account_v1';
const DEFAULT_CAFE_ID_KEY = 'coffee_order_default_cafe_id_v1';
const ACTIVE_DRAFT_KEY = 'coffee_order_active_draft_v2';

export interface ActiveDraft {
  cafeId: string;
  cafeName: string;
  members: any[];
  items: any[];
  activeMemberId?: string | null;
  activeRoomId?: string | null;
  savedAt: number;
  menuRestriction?: MenuRestriction;
  targetMemberCount?: number;
}

export const OrderStorage = {
  saveActiveDraft(draft: ActiveDraft): void {
    try {
      localStorage.setItem(ACTIVE_DRAFT_KEY, JSON.stringify(draft));
    } catch (e) {
      console.error('Failed to save active draft', e);
    }
  },

  getActiveDraft(): ActiveDraft | null {
    try {
      const data = localStorage.getItem(ACTIVE_DRAFT_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  clearActiveDraft(): void {
    try {
      localStorage.removeItem(ACTIVE_DRAFT_KEY);
    } catch {}
  },
  getOrders(): Order[] {
    try {
      const data = localStorage.getItem(ORDERS_KEY);
      if (!data) {
        return [];
      }
      return JSON.parse(data);
    } catch {
      return [];
    }
  },

  saveOrder(order: Order): void {
    try {
      const orders = this.getOrders();
      const existingIdx = orders.findIndex((o) => o.id === order.id);
      let updated: Order[];
      if (existingIdx >= 0) {
        updated = [...orders];
        updated[existingIdx] = order;
      } else {
        updated = [order, ...orders];
      }
      localStorage.setItem(ORDERS_KEY, JSON.stringify(updated.slice(0, 20))); // Keep last 20
    } catch (e) {
      console.error('Failed to save order', e);
    }
  },

  deleteOrder(orderId: string): void {
    try {
      const orders = this.getOrders();
      const filtered = orders.filter((o) => o.id !== orderId);
      localStorage.setItem(ORDERS_KEY, JSON.stringify(filtered));
    } catch (e) {
      console.error('Failed to delete order', e);
    }
  },

  getMenus(): Menu[] {
    try {
      const data = localStorage.getItem(MENUS_KEY);
      if (!data) {
        localStorage.setItem(MENUS_KEY, JSON.stringify(INITIAL_MENUS));
        return INITIAL_MENUS;
      }
      const parsed: Menu[] = JSON.parse(data);
      // Ensure any newly added built-in menus are also present
      const existingIds = new Set(parsed.map((m) => m.id));
      const missingBuiltins = INITIAL_MENUS.filter((m) => !existingIds.has(m.id));
      if (missingBuiltins.length > 0) {
        const merged = [...parsed, ...missingBuiltins];
        localStorage.setItem(MENUS_KEY, JSON.stringify(merged));
        return merged;
      }
      return parsed;
    } catch {
      return INITIAL_MENUS;
    }
  },

  saveMenu(menu: Menu): void {
    try {
      const current = this.getMenus();
      const existingIdx = current.findIndex((m) => m.id === menu.id);
      let updated: Menu[];
      if (existingIdx >= 0) {
        updated = [...current];
        updated[existingIdx] = menu;
      } else {
        updated = [menu, ...current];
      }
      localStorage.setItem(MENUS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save menu', e);
    }
  },

  deleteMenu(menuId: string): void {
    try {
      const current = this.getMenus();
      const filtered = current.filter((m) => m.id !== menuId);
      localStorage.setItem(MENUS_KEY, JSON.stringify(filtered));
    } catch (e) {
      console.error('Failed to delete menu', e);
    }
  },

  saveBatchMenus(newMenus: Menu[]): void {
    try {
      const current = this.getMenus();
      const existingMap = new Map(current.map((m) => [m.id, m]));
      newMenus.forEach((m) => existingMap.set(m.id, m));
      const merged = Array.from(existingMap.values());
      localStorage.setItem(MENUS_KEY, JSON.stringify(merged));
    } catch (e) {
      console.error('Failed to save batch menus', e);
    }
  },

  getCustomCafes(): any[] {
    try {
      const data = localStorage.getItem(CUSTOM_CAFES_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveCustomCafe(cafe: any): void {
    try {
      const cafes = this.getCustomCafes();
      const idx = cafes.findIndex((c: any) => c.id === cafe.id);
      let updated: any[];
      if (idx >= 0) {
        updated = [...cafes];
        updated[idx] = cafe;
      } else {
        updated = [cafe, ...cafes];
      }
      localStorage.setItem(CUSTOM_CAFES_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save custom cafe', e);
    }
  },

  deleteCustomCafe(cafeId: string): void {
    try {
      const cafes = this.getCustomCafes();
      const filtered = cafes.filter((c: any) => c.id !== cafeId);
      localStorage.setItem(CUSTOM_CAFES_KEY, JSON.stringify(filtered));
    } catch (e) {
      console.error('Failed to delete custom cafe', e);
    }
  },

  getDefaultCafeId(): string | null {
    try {
      return localStorage.getItem(DEFAULT_CAFE_ID_KEY);
    } catch {
      return null;
    }
  },

  setDefaultCafeId(cafeId: string): void {
    try {
      localStorage.setItem(DEFAULT_CAFE_ID_KEY, cafeId);
    } catch (e) {
      console.error('Failed to set default cafe id', e);
    }
  },

  saveAccountInfo(bank: string, accountNumber: string, accountHolder: string) {
    try {
      localStorage.setItem(
        SAVED_ACCOUNT_KEY,
        JSON.stringify({ bank, accountNumber, accountHolder })
      );
    } catch {}
  },

  getSavedAccountInfo(): { bank: string; accountNumber: string; accountHolder: string } {
    try {
      const data = localStorage.getItem(SAVED_ACCOUNT_KEY);
      if (data) return JSON.parse(data);
    } catch {}
    return {
      bank: '카카오뱅크',
      accountNumber: '',
      accountHolder: '',
    };
  },
};

/**
 * Calculate Dutch Pay breakdown
 */
export function calculateDutchPay(
  order: Order,
  method: 'actual' | 'equal',
  roundingUnit: 1 | 10 | 100 = 1
): DutchPaySplitResult[] {
  const { members, items, totalAmount } = order;
  if (!members || members.length === 0) return [];

  // Group items by member
  const memberItemsMap: Record<string, typeof items> = {};
  members.forEach((m) => {
    memberItemsMap[m.id] = [];
  });
  items.forEach((item) => {
    if (memberItemsMap[item.memberId]) {
      memberItemsMap[item.memberId].push(item);
    }
  });

  if (method === 'actual') {
    return members.map((member) => {
      const mItems = memberItemsMap[member.id] || [];
      const subtotal = mItems.reduce((sum, it) => sum + it.totalPrice, 0);
      const summary = mItems.map((it) => `${it.menuName} x${it.quantity}`).join(', ') || '주문 없음';

      return {
        memberId: member.id,
        memberName: member.name,
        amount: subtotal,
        originalSubtotal: subtotal,
        itemCount: mItems.reduce((acc, it) => acc + it.quantity, 0),
        itemsSummary: summary,
      };
    });
  }

  // Equal 1/N split
  const count = members.length;
  if (count === 0) return [];

  if (roundingUnit === 1) {
    const baseShare = Math.floor(totalAmount / count);
    const remainder = totalAmount % count; // Remaining 1 KRW units

    return members.map((member, index) => {
      const mItems = memberItemsMap[member.id] || [];
      const subtotal = mItems.reduce((sum, it) => sum + it.totalPrice, 0);
      const summary = mItems.map((it) => `${it.menuName} x${it.quantity}`).join(', ') || '주문 없음';

      // First `remainder` people pay baseShare + 1
      const isExtra = index < remainder;
      const share = baseShare + (isExtra ? 1 : 0);

      return {
        memberId: member.id,
        memberName: member.name,
        amount: share,
        originalSubtotal: subtotal,
        itemCount: mItems.reduce((acc, it) => acc + it.quantity, 0),
        itemsSummary: summary,
        isRemainderPayer: isExtra && remainder > 0,
      };
    });
  } else {
    // Rounding unit 10 or 100 (절사 / 총무 차액 부담 방식)
    const rawShare = totalAmount / count;
    const roundedShare = Math.floor(rawShare / roundingUnit) * roundingUnit;
    const totalCollected = roundedShare * count;
    const remainderToCover = totalAmount - totalCollected;

    return members.map((member, index) => {
      const mItems = memberItemsMap[member.id] || [];
      const subtotal = mItems.reduce((sum, it) => sum + it.totalPrice, 0);
      const summary = mItems.map((it) => `${it.menuName} x${it.quantity}`).join(', ') || '주문 없음';

      // The representative (1st member) covers the remainder if rounded down
      const isRepresentative = index === 0;
      const finalAmount = isRepresentative ? roundedShare + remainderToCover : roundedShare;

      return {
        memberId: member.id,
        memberName: member.name,
        amount: finalAmount,
        originalSubtotal: subtotal,
        itemCount: mItems.reduce((acc, it) => acc + it.quantity, 0),
        itemsSummary: summary,
        isRemainderPayer: isRepresentative && remainderToCover > 0,
      };
    });
  }
}
