import { AccountInfo, DutchPaySplitResult, MenuRestriction, OrderItem, OrderMember } from '../types';

export interface LiveRoom {
  roomId: string;
  cafeId: string;
  cafeName: string;
  title: string;
  createdAt: number;
  lastUpdated: number;
  status: 'open' | 'closed';
  members: OrderMember[];
  items: OrderItem[];
  totalQuantity: number;
  totalAmount: number;
  accountInfo?: AccountInfo;
  menuRestriction?: MenuRestriction;
  targetMemberCount?: number;
  viewCount?: number;
}

export interface ShareableOrder {
  id: string;
  roomId?: string;
  cafeId: string;
  cafeName: string;
  createdAt: string;
  totalAmount: number;
  totalQuantity: number;
  members: OrderMember[];
  items: OrderItem[];
  accountInfo?: AccountInfo;
  dutchPay?: {
    method: 'actual' | 'equal';
    splits: DutchPaySplitResult[];
  };
  menuRestriction?: MenuRestriction;
  targetMemberCount?: number;
  viewCount?: number;
}

/**
 * UTF-8 safe Base64 encoder for URL hash fallback
 */
export function encodeOrderToHash(order: ShareableOrder): string {
  try {
    const jsonStr = JSON.stringify(order);
    const utf8Bytes = encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, (_, p1) =>
      String.fromCharCode(parseInt(p1, 16))
    );
    return btoa(utf8Bytes)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  } catch (err) {
    console.error('Failed to encode order to hash:', err);
    return '';
  }
}

/**
 * UTF-8 safe Base64 decoder from URL hash
 */
export function decodeOrderFromHash(hashStr: string): ShareableOrder | null {
  try {
    if (!hashStr) return null;
    let base64 = hashStr.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }
    const binary = atob(base64);
    const percentEncoded = Array.from(binary)
      .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('');
    const jsonStr = decodeURIComponent(percentEncoded);
    return JSON.parse(jsonStr) as ShareableOrder;
  } catch (err) {
    console.error('Failed to decode order from hash:', err);
    return null;
  }
}

/**
 * Create or sync a Live Room on the server
 */
export async function createOrSyncLiveRoom(data: {
  roomId?: string;
  cafeId: string;
  cafeName: string;
  title?: string;
  members: OrderMember[];
  items: OrderItem[];
  accountInfo?: AccountInfo;
  menuRestriction?: MenuRestriction;
  targetMemberCount?: number;
}): Promise<LiveRoom> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error('주문방 생성 실패');
    }

    const json = await res.json();
    return json.room;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Update Room Settings (Menu restrictions, target member count)
 */
export async function updateRoomSettings(
  roomId: string,
  settings: {
    menuRestriction?: MenuRestriction;
    targetMemberCount?: number;
  }
): Promise<LiveRoom> {
  const res = await fetch(`/api/rooms/${roomId}/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });

  if (!res.ok) {
    throw new Error('설정 업데이트 실패');
  }

  const json = await res.json();
  return json.room;
}

/**
 * Record a link view by a participant
 */
export async function recordRoomView(roomId: string): Promise<number> {
  try {
    const res = await fetch(`/api/rooms/${roomId}/view`, {
      method: 'POST',
    });
    if (res.ok) {
      const json = await res.json();
      return json.viewCount || 0;
    }
  } catch {}
  return 0;
}

/**
 * Fetch latest room state (Used for polling)
 */
export async function fetchLiveRoom(roomId: string): Promise<LiveRoom | null> {
  try {
    const res = await fetch(`/api/rooms/${roomId}`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.room || null;
  } catch (err) {
    console.error('Failed to fetch live room:', err);
    return null;
  }
}

/**
 * Add a drink to a live room from participant device
 */
export async function addDrinkToLiveRoom(
  roomId: string,
  memberName: string,
  item: OrderItem
): Promise<{ room: LiveRoom; addedItem: OrderItem; memberName: string }> {
  const res = await fetch(`/api/rooms/${roomId}/add-item`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ memberName, item }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || '음료 추가 실패');
  }

  return await res.json();
}

/**
 * Delete a drink from a live room
 */
export async function deleteDrinkFromLiveRoom(
  roomId: string,
  itemId: string
): Promise<LiveRoom> {
  const res = await fetch(`/api/rooms/${roomId}/items/${itemId}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    throw new Error('음료 삭제 실패');
  }

  const json = await res.json();
  return json.room;
}

/**
 * Register expected members (Target list of people invited to order)
 */
export async function registerExpectedMembers(
  roomId: string,
  names: string[]
): Promise<LiveRoom> {
  const res = await fetch(`/api/rooms/${roomId}/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ names }),
  });

  if (!res.ok) {
    throw new Error('멤버 등록 실패');
  }

  const json = await res.json();
  return json.room;
}

/**
 * Mark member as pass ("안 마심 / 패스")
 */
export async function markMemberPass(
  roomId: string,
  memberName: string,
  reason?: string
): Promise<{ room: LiveRoom; memberName: string }> {
  const res = await fetch(`/api/rooms/${roomId}/pass`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ memberName, reason }),
  });

  if (!res.ok) {
    throw new Error('패스 처리 실패');
  }

  return await res.json();
}

/**
 * Delete a member from the room
 */
export async function deleteMemberFromRoom(
  roomId: string,
  memberId: string
): Promise<LiveRoom> {
  const res = await fetch(`/api/rooms/${roomId}/members/${memberId}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    throw new Error('멤버 삭제 실패');
  }

  const json = await res.json();
  return json.room;
}

/**
 * Close or reopen a live room
 */
export async function toggleLiveRoomStatus(
  roomId: string,
  status: 'open' | 'closed'
): Promise<LiveRoom> {
  const res = await fetch(`/api/rooms/${roomId}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });

  if (!res.ok) {
    throw new Error('주문방 상태 변경 실패');
  }

  const json = await res.json();
  return json.room;
}

/**
 * Generate share link (Returns both live room URL and fallback hash)
 */
export async function createShareLink(order: ShareableOrder): Promise<{
  shareUrl: string;
  roomId: string;
  hashFallback: string;
}> {
  const hash = encodeOrderToHash(order);
  const baseUrl = `${window.location.origin}${window.location.pathname}`;
  const fallbackUrl = `${baseUrl}#order=${hash}`;

  try {
    const room = await createOrSyncLiveRoom({
      roomId: order.roomId,
      cafeId: order.cafeId,
      cafeName: order.cafeName,
      members: order.members,
      items: order.items,
      accountInfo: order.accountInfo,
      menuRestriction: order.menuRestriction,
      targetMemberCount: order.targetMemberCount,
    });

    const liveUrl = `${baseUrl}?room=${room.roomId}`;
    return {
      shareUrl: liveUrl,
      roomId: room.roomId,
      hashFallback: fallbackUrl,
    };
  } catch (e) {
    console.warn('Failed to create server room, falling back to URL hash:', e);
    return {
      shareUrl: fallbackUrl,
      roomId: '',
      hashFallback: fallbackUrl,
    };
  }
}

/**
 * Resolve incoming shared order or live room from URL
 */
export async function fetchSharedOrder(
  searchParams: URLSearchParams,
  hash: string
): Promise<ShareableOrder | null> {
  const roomId = searchParams.get('room') || searchParams.get('share');

  // Try live room first
  if (roomId) {
    const live = await fetchLiveRoom(roomId);
    if (live) {
      return {
        id: live.roomId,
        roomId: live.roomId,
        cafeId: live.cafeId,
        cafeName: live.cafeName,
        createdAt: new Date(live.createdAt).toISOString(),
        totalAmount: live.totalAmount,
        totalQuantity: live.totalQuantity,
        members: live.members,
        items: live.items,
        accountInfo: live.accountInfo,
        menuRestriction: live.menuRestriction,
        targetMemberCount: live.targetMemberCount,
        viewCount: live.viewCount,
      };
    }
  }

  // Fallback to URL hash
  if (hash) {
    const match = hash.match(/order=([^&]+)/);
    if (match && match[1]) {
      return decodeOrderFromHash(match[1]);
    }
    const cleanHash = hash.replace(/^#\/?/, '').replace(/^order=/, '');
    if (cleanHash) {
      const decoded = decodeOrderFromHash(cleanHash);
      if (decoded) return decoded;
    }
  }

  return null;
}

/**
 * Formats a clean, readable text message for KakaoTalk / SMS sharing
 */
export function formatKakaoShareText(order: ShareableOrder, linkUrl?: string): string {
  let text = `☕ [${order.cafeName}] 실시간 커피 주문방이 열렸습니다!\n`;

  if (order.targetMemberCount) {
    const orderedCount = order.members.filter(
      (m) => order.items.some((it) => it.memberId === m.id) && m.status !== 'passed'
    ).length;
    text += `📊 단톡방 목표 ${order.targetMemberCount}명 중 ${orderedCount}명 주문 완료! (${order.totalQuantity}잔 / ${order.totalAmount.toLocaleString()}원)\n`;
  } else {
    text += `현재 총 ${order.totalQuantity}잔 / ${order.totalAmount.toLocaleString()}원 (${order.members.length}명 참여 중)\n`;
  }

  if (order.menuRestriction?.enabled) {
    const count = order.menuRestriction.allowedMenuNames?.length || 0;
    const names = order.menuRestriction.allowedMenuNames?.slice(0, 4).join(', ') || '';
    text += `🔒 [메뉴 선택 제한 안내]: 총무님이 지정한 ${count}개 메뉴 중에서만 골라주세요!\n👉 ${names}${count > 4 ? ` 외 ${count - 4}종` : ''}\n`;
    if (order.menuRestriction.customNotice) {
      text += `💬 "${order.menuRestriction.customNotice}"\n`;
    }
  }
  text += '\n';

  // Group items by member
  order.members.forEach((member) => {
    const memberItems = order.items.filter((it) => it.memberId === member.id);
    const subtotal = memberItems.reduce((sum, it) => sum + it.totalPrice, 0);

    text += `👤 ${member.name} (${subtotal.toLocaleString()}원)\n`;
    if (memberItems.length === 0) {
      if (member.status === 'passed') {
        text += `  • [안 마심 / 패스: ${member.passReason || '오늘은 건너뜁니다'}]\n`;
      } else {
        text += `  • (메뉴 고르는 중...)\n`;
      }
    } else {
      memberItems.forEach((it) => {
        const optSummary = [
          it.options.temperature,
          it.options.size?.label,
          it.options.iceLevel ? `얼음 ${it.options.iceLevel}` : null,
          it.options.sweetness ? `당도 ${it.options.sweetness}` : null,
          it.options.extraShots ? `샷+${it.options.extraShots}` : null,
          it.options.syrup ? it.options.syrup : null,
          it.options.whip ? '휘핑' : null,
        ]
          .filter(Boolean)
          .join('/');

        text += `  • ${it.menuName} ${optSummary ? `(${optSummary}) ` : ''}x${it.quantity} (${it.totalPrice.toLocaleString()}원)\n`;
      });
    }
    text += '\n';
  });

  if (order.dutchPay && order.dutchPay.splits.length > 0) {
    text += `💰 [정산 금액 안내]\n`;
    order.dutchPay.splits.forEach((s) => {
      text += `• ${s.memberName}: ${s.amount.toLocaleString()}원\n`;
    });
    text += '\n';
  }

  if (order.accountInfo?.accountNumber) {
    text += `💳 입금 계좌: ${order.accountInfo.bank} ${order.accountInfo.accountNumber} (${order.accountInfo.accountHolder})\n\n`;
  }

  if (linkUrl) {
    text += `👉 아래 링크를 누르면 웹에서 실시간으로 주문 리스트를 보거나 내 음료를 직접 담을 수 있어요!\n${linkUrl}`;
  }

  return text;
}

/**
 * Formats a nudge message for coworkers who haven't ordered yet
 */
export function formatNudgeKakaoText(
  cafeName: string,
  pendingNames: string[],
  orderedCount: number,
  linkUrl: string,
  targetMemberCount?: number,
  menuRestrictionNotice?: string
): string {
  let text = `☕ [${cafeName}] 커피 주문 마감 임박 알림!\n\n`;

  if (targetMemberCount) {
    const remaining = Math.max(0, targetMemberCount - orderedCount);
    text += `📊 단톡방 인원 ${targetMemberCount}명 중 ${orderedCount}명 주문 완료 (${remaining}명 남음!)\n\n`;
  } else {
    text += `현재 ${orderedCount}명이 주문을 완료했습니다.\n\n`;
  }

  if (pendingNames.length > 0) {
    text += `📢 아직 메뉴 안 고르신 분:\n👉 ${pendingNames.join(', ')} 님!\n\n`;
  }

  if (menuRestrictionNotice) {
    text += `🔒 주문 참고: ${menuRestrictionNotice}\n\n`;
  }

  text += `아래 링크에서 원하시는 메뉴를 담아주시거나, 오늘은 안 마시려면 '패스'를 눌러주세요! 😊\n\n`;
  text += `🔗 주문 바로가기: ${linkUrl}`;
  return text;
}
