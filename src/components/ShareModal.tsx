import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Link2,
  Copy,
  Check,
  Share2,
  QrCode,
  MessageSquare,
  Coffee,
  Sparkles,
  ShieldCheck,
  UserPlus,
  Users,
  Clock,
  UserCheck,
  UserX,
  Bell,
  SlidersHorizontal,
  Lock,
  Unlock,
  CheckSquare,
  Square,
  Search,
  AlertCircle,
  HelpCircle,
  Percent,
} from 'lucide-react';
import QRCode from 'qrcode';
import {
  createShareLink,
  encodeOrderToHash,
  formatKakaoShareText,
  formatNudgeKakaoText,
  registerExpectedMembers,
  updateRoomSettings,
  ShareableOrder,
} from '../services/shareService';
import { Menu, MenuRestriction, OrderMember } from '../types';

interface ShareModalProps {
  order: ShareableOrder;
  onClose: () => void;
  onShowToast: (message: string) => void;
  onRoomCreated?: (roomId: string) => void;
  onAddBatchMembers?: (names: string[]) => void;
  members?: OrderMember[];
  menus?: Menu[];
  menuRestriction?: MenuRestriction;
  onUpdateRestriction?: (restriction: MenuRestriction) => void;
  targetMemberCount?: number;
  onUpdateTargetMemberCount?: (count: number) => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  order,
  onClose,
  onShowToast,
  onRoomCreated,
  onAddBatchMembers,
  members: propMembers,
  menus = [],
  menuRestriction: initialRestriction,
  onUpdateRestriction,
  targetMemberCount: initialTargetCount,
  onUpdateTargetMemberCount,
}) => {
  const [activeTab, setActiveTab] = useState<'share' | 'restriction' | 'group'>('share');

  // Immediately compute instantaneous fallback share URL so the link is never empty
  const initialFallbackUrl = useMemo(() => {
    const baseUrl = `${window.location.origin}${window.location.pathname}`;
    if (order.roomId) return `${baseUrl}?room=${order.roomId}`;
    return `${baseUrl}#order=${encodeOrderToHash(order)}`;
  }, [order]);

  const [shareUrl, setShareUrl] = useState<string>(initialFallbackUrl);
  const [roomId, setRoomId] = useState<string>(order.roomId || '');
  const [isLoading, setIsLoading] = useState<boolean>(!order.roomId);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedText, setCopiedText] = useState<boolean>(false);
  const [copiedNudge, setCopiedNudge] = useState<boolean>(false);
  const [showQr, setShowQr] = useState<boolean>(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [newNamesInput, setNewNamesInput] = useState<string>('');
  const [roomMembers, setRoomMembers] = useState<OrderMember[]>(
    propMembers || order.members || []
  );

  // Group chat target member count
  const [targetCount, setTargetCount] = useState<number>(
    initialTargetCount || order.targetMemberCount || 0
  );

  // Menu Restriction State
  const cafeMenus = useMemo(() => {
    return menus.filter((m) => m.cafeId === order.cafeId);
  }, [menus, order.cafeId]);

  const [restrictionEnabled, setRestrictionEnabled] = useState<boolean>(
    initialRestriction?.enabled || order.menuRestriction?.enabled || false
  );
  const [allowedIds, setAllowedIds] = useState<string[]>(
    initialRestriction?.allowedMenuIds || order.menuRestriction?.allowedMenuIds || []
  );
  const [customNotice, setCustomNotice] = useState<string>(
    initialRestriction?.customNotice || order.menuRestriction?.customNotice || '커피, 라떼, 녹차 중에서만 골라주세요!'
  );
  const [menuSearchQuery, setMenuSearchQuery] = useState<string>('');

  // Keep callback reference stable across parent re-renders to prevent aborting
  const onRoomCreatedRef = useRef(onRoomCreated);
  onRoomCreatedRef.current = onRoomCreated;

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const hasGeneratedRef = useRef(false);

  // Generate or sync link
  useEffect(() => {
    if (hasGeneratedRef.current) return;
    hasGeneratedRef.current = true;

    async function generateLink() {
      setIsLoading(true);
      try {
        const orderToShare: ShareableOrder = {
          ...order,
          roomId: roomId || order.roomId,
          menuRestriction: restrictionEnabled
            ? {
                enabled: true,
                allowedMenuIds: allowedIds,
                allowedMenuNames: cafeMenus
                  .filter((m) => allowedIds.includes(m.id))
                  .map((m) => m.name),
                customNotice,
              }
            : undefined,
          targetMemberCount: targetCount > 0 ? targetCount : undefined,
        };

        const result = await createShareLink(orderToShare);
        if (isMountedRef.current) {
          setShareUrl(result.shareUrl);
          if (result.roomId) {
            setRoomId(result.roomId);
            onRoomCreatedRef.current?.(result.roomId);
          }

          // Generate QR code
          try {
            const qr = await QRCode.toDataURL(result.shareUrl, {
              width: 260,
              margin: 2,
              color: {
                dark: '#292524',
                light: '#ffffff',
              },
            });
            if (isMountedRef.current) {
              setQrDataUrl(qr);
            }
          } catch (qrErr) {
            console.error('Failed to generate QR:', qrErr);
          }
        }
      } catch (err) {
        console.error('Failed to create share link:', err);
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    }

    generateLink();
  }, [order.id]);

  // Keep members updated
  useEffect(() => {
    if (propMembers) {
      setRoomMembers(propMembers);
    }
  }, [propMembers]);

  // Sync settings when restriction or targetCount change
  const applySettings = async (
    newRestriction?: MenuRestriction,
    newTarget?: number
  ) => {
    const restriction = newRestriction !== undefined ? newRestriction : {
      enabled: restrictionEnabled,
      allowedMenuIds: allowedIds,
      allowedMenuNames: cafeMenus
        .filter((m) => allowedIds.includes(m.id))
        .map((m) => m.name),
      customNotice,
    };
    const target = newTarget !== undefined ? newTarget : targetCount;

    onUpdateRestriction?.(restriction);
    if (newTarget !== undefined) onUpdateTargetMemberCount?.(newTarget);

    if (roomId) {
      try {
        await updateRoomSettings(roomId, {
          menuRestriction: restriction,
          targetMemberCount: target > 0 ? target : undefined,
        });
      } catch (e) {
        console.warn('Failed to update room settings:', e);
      }
    }
  };

  // Toggle single menu ID in restriction
  const handleToggleMenuId = (menuId: string) => {
    setAllowedIds((prev) => {
      const next = prev.includes(menuId)
        ? prev.filter((id) => id !== menuId)
        : [...prev, menuId];

      const restriction: MenuRestriction = {
        enabled: restrictionEnabled,
        allowedMenuIds: next,
        allowedMenuNames: cafeMenus
          .filter((m) => next.includes(m.id))
          .map((m) => m.name),
        customNotice,
      };
      applySettings(restriction);
      return next;
    });
  };

  // Preset Filters
  const handleApplyPreset = (type: 'coffee_latte_tea' | 'coffee_only' | 'latte_only' | 'tea_only' | 'under5000' | 'all' | 'none') => {
    let selected: string[] = [];

    if (type === 'all') {
      selected = cafeMenus.map((m) => m.id);
    } else if (type === 'none') {
      selected = [];
    } else if (type === 'coffee_latte_tea') {
      // 커피, 라떼, 녹차/티 관련 메뉴 자동 매칭
      selected = cafeMenus
        .filter((m) => {
          const n = m.name.toLowerCase();
          const desc = (m.description || '').toLowerCase();
          return (
            n.includes('아메리카노') ||
            n.includes('라떼') ||
            n.includes('라테') ||
            n.includes('녹차') ||
            n.includes('말차') ||
            n.includes('티') ||
            n.includes('콜드브루') ||
            m.category === '커피' ||
            m.category === '티'
          );
        })
        .map((m) => m.id);
      setCustomNotice('커피, 라떼, 녹차/티 중에서만 골라주세요!');
    } else if (type === 'coffee_only') {
      selected = cafeMenus
        .filter((m) => m.category === '커피' || m.name.includes('아메리카노') || m.name.includes('콜드브루'))
        .map((m) => m.id);
      setCustomNotice('기본 커피류(아메리카노/콜드브루 등) 중에서 골라주세요!');
    } else if (type === 'latte_only') {
      selected = cafeMenus
        .filter((m) => m.name.includes('라떼') || m.name.includes('라테'))
        .map((m) => m.id);
      setCustomNotice('라떼 음료 중에서 골라주세요!');
    } else if (type === 'tea_only') {
      selected = cafeMenus
        .filter((m) => m.category === '티' || m.name.includes('차') || m.name.includes('티') || m.name.includes('녹차'))
        .map((m) => m.id);
      setCustomNotice('차(티) 및 녹차 메뉴 중에서 골라주세요!');
    } else if (type === 'under5000') {
      selected = cafeMenus
        .filter((m) => m.price <= 5000)
        .map((m) => m.id);
      setCustomNotice('5,000원 이하 메뉴 중에서 골라주세요!');
    }

    setAllowedIds(selected);
    setRestrictionEnabled(true);

    const restriction: MenuRestriction = {
      enabled: true,
      allowedMenuIds: selected,
      allowedMenuNames: cafeMenus
        .filter((m) => selected.includes(m.id))
        .map((m) => m.name),
      customNotice,
    };
    applySettings(restriction);
    onShowToast(`🎯 ${selected.length}개 메뉴가 선택되었습니다.`);
  };

  // Handle batch adding members from within ShareModal
  const handleAddNames = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const raw = newNamesInput;
    const names = raw
      .split(/[,/\n\s]+/)
      .map((n) => n.trim())
      .filter((n) => n.length > 0);

    if (names.length === 0) {
      onShowToast('동료 이름을 1명 이상 입력해주세요.');
      return;
    }

    if (onAddBatchMembers) {
      onAddBatchMembers(names);
    } else if (roomId) {
      try {
        await registerExpectedMembers(roomId, names);
      } catch (err) {
        console.warn('Failed to sync members:', err);
      }
    }

    // Local optimistic update
    const addedMembers: OrderMember[] = names
      .filter((n) => !roomMembers.some((m) => m.name.toLowerCase() === n.toLowerCase()))
      .map((name) => ({
        id: `mem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        orderId: '',
        name,
        status: 'pending',
      }));

    setRoomMembers((prev) => [...prev, ...addedMembers]);
    setNewNamesInput('');
    onShowToast(`${names.length}명의 동료가 주문 명단에 등록되었습니다! 👥`);
  };

  // Copy URL to clipboard
  const handleCopyUrl = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      onShowToast('🔗 주문서 링크가 복사되었습니다!');
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      onShowToast('복사에 실패했습니다. 주소를 직접 복사해주세요.');
    }
  };

  // Copy Kakao formatted text with link
  const handleCopyKakao = async () => {
    const activeRestriction = restrictionEnabled
      ? {
          enabled: true,
          allowedMenuIds: allowedIds,
          allowedMenuNames: cafeMenus
            .filter((m) => allowedIds.includes(m.id))
            .map((m) => m.name),
          customNotice,
        }
      : undefined;

    const currentShareOrder: ShareableOrder = {
      ...order,
      menuRestriction: activeRestriction,
      targetMemberCount: targetCount > 0 ? targetCount : undefined,
    };

    const text = formatKakaoShareText(currentShareOrder, shareUrl);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(true);
      onShowToast('주문 리스트와 링크가 복사되었습니다! 카톡에 붙여넣으세요.');
      setTimeout(() => setCopiedText(false), 2000);
    } catch {
      onShowToast('복사에 실패했습니다.');
    }
  };

  // Copy Nudge message for pending members
  const handleCopyNudge = async () => {
    const pendingNames = roomMembers
      .filter((m) => {
        const hasItems = order.items.some((it) => it.memberId === m.id);
        return !hasItems && m.status !== 'passed';
      })
      .map((m) => m.name);

    const orderedCount = roomMembers.filter((m) =>
      order.items.some((it) => it.memberId === m.id)
    ).length;

    const notice = restrictionEnabled
      ? `지정된 메뉴(${allowedIds.length}종: 커피, 라떼, 녹차 등) 중에서만 선택 가능`
      : undefined;

    const text = formatNudgeKakaoText(
      order.cafeName,
      pendingNames,
      orderedCount,
      shareUrl,
      targetCount > 0 ? targetCount : undefined,
      notice
    );

    try {
      await navigator.clipboard.writeText(text);
      setCopiedNudge(true);
      onShowToast('📢 미주문자 재촉 카톡 멘트가 복사되었습니다!');
      setTimeout(() => setCopiedNudge(false), 2000);
    } catch {
      onShowToast('복사에 실패했습니다.');
    }
  };

  // Native Web Share API
  const handleNativeShare = async () => {
    if (!navigator.share) {
      handleCopyUrl();
      return;
    }
    try {
      await navigator.share({
        title: `[${order.cafeName}] 커피 주문 리스트`,
        text: `[${order.cafeName}] 커피 주문 ${order.totalQuantity}잔 리스트를 확인해보세요!`,
        url: shareUrl,
      });
      onShowToast('공유 창이 열렸습니다.');
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        handleCopyUrl();
      }
    }
  };

  // Group calculations
  const orderedList = roomMembers.filter(
    (m) => order.items.some((it) => it.memberId === m.id) && m.status !== 'passed'
  );
  const pendingList = roomMembers.filter(
    (m) => !order.items.some((it) => it.memberId === m.id) && m.status !== 'passed'
  );

  const effectiveTotalTarget = targetCount > 0 ? targetCount : Math.max(roomMembers.length, 1);
  const progressPercent = Math.min(100, Math.round((orderedList.length / effectiveTotalTarget) * 100));

  // Filtered menus for restriction tab
  const filteredRestrictionMenus = useMemo(() => {
    if (!menuSearchQuery.trim()) return cafeMenus;
    const q = menuSearchQuery.toLowerCase();
    return cafeMenus.filter(
      (m) => m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q)
    );
  }, [cafeMenus, menuSearchQuery]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-md w-full p-4 sm:p-5 shadow-2xl border border-stone-200 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-stone-900 text-sm">
                주문서 공유 & 주문 옵션 설정
              </h3>
              <p className="text-[11px] text-stone-400">
                {order.cafeName} · 실시간 주문방
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-3 gap-1 bg-stone-100 p-1 rounded-2xl my-3 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('share')}
            className={`py-1.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer ${
              activeTab === 'share'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>링크 공유</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('restriction')}
            className={`py-1.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer relative ${
              activeTab === 'restriction'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-amber-600" />
            <span>메뉴 제한</span>
            {restrictionEnabled && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 absolute top-1.5 right-2" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('group')}
            className={`py-1.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer relative ${
              activeTab === 'group'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-emerald-600" />
            <span>단톡방 인원</span>
            {targetCount > 0 && (
              <span className="text-[10px] font-mono px-1 rounded-full bg-emerald-100 text-emerald-800 ml-0.5">
                {targetCount}
              </span>
            )}
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3.5">
          {/* ================= TAB 1: SHARE LINK ================= */}
          {activeTab === 'share' && (
            <div className="space-y-3">
              {/* Share URL Box */}
              <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200">
                <div className="flex items-center justify-between text-xs text-stone-500 mb-1.5 font-medium">
                  <span className="flex items-center gap-1 text-stone-700 font-bold">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    실시간 협업 링크
                  </span>
                  {roomId && (
                    <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded font-bold">
                      방코드: #{roomId}
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={isLoading ? '링크 생성 중...' : shareUrl}
                    className="flex-1 h-9 px-3 bg-white border border-stone-200 rounded-xl text-xs font-mono text-stone-700 truncate focus:outline-none"
                  />
                  <button
                    onClick={handleCopyUrl}
                    disabled={isLoading || !shareUrl}
                    className="h-9 px-3.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95 shrink-0"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>복사됨</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>복사</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Status Badges Alert if restriction or target count is on */}
              {(restrictionEnabled || targetCount > 0) && (
                <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded-2xl text-[11px] text-amber-950 space-y-1">
                  {restrictionEnabled && (
                    <div className="flex items-center gap-1.5 font-bold">
                      <Lock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                      <span>메뉴 제한 설정 중: {allowedIds.length}개 메뉴만 선택 가능</span>
                    </div>
                  )}
                  {targetCount > 0 && (
                    <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                      <Users className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <span>단톡방 목표 인원: {targetCount}명 중 {orderedList.length}명 완료 ({progressPercent}%)</span>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                {/* 1. Kakao / Messenger text copy */}
                <button
                  onClick={handleCopyKakao}
                  disabled={isLoading || !shareUrl}
                  className="w-full h-11 rounded-xl bg-amber-100/80 hover:bg-amber-100 text-amber-950 text-xs font-bold flex items-center justify-between px-3.5 border border-amber-200/90 active:scale-98 transition-all cursor-pointer shadow-2xs"
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-amber-800" />
                    <span>카톡 단톡방용 텍스트 + 링크 복사</span>
                  </div>
                  {copiedText ? (
                    <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> 복사 완료!
                    </span>
                  ) : (
                    <span className="text-[11px] text-amber-800 font-bold">1초 복사</span>
                  )}
                </button>

                {/* 2. Web Share API */}
                {typeof navigator !== 'undefined' && 'share' in navigator && (
                  <button
                    onClick={handleNativeShare}
                    disabled={isLoading || !shareUrl}
                    className="w-full h-11 rounded-xl bg-stone-900 hover:bg-black text-white text-xs font-bold flex items-center justify-center gap-2 active:scale-98 transition-all shadow-xs cursor-pointer"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>스마트폰 공유하기 (카톡, 문자 등)</span>
                  </button>
                )}

                {/* 3. QR Code Toggle */}
                <button
                  onClick={() => setShowQr(!showQr)}
                  className="w-full h-9 rounded-xl bg-stone-50 hover:bg-stone-100 text-stone-700 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors border border-stone-200 cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5 text-stone-500" />
                  <span>{showQr ? 'QR 코드 접기' : '현장에서 바로 찍는 QR 코드 보기'}</span>
                </button>

                {/* QR Code Container */}
                {showQr && (
                  <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 flex flex-col items-center justify-center text-center animate-in fade-in duration-200">
                    {qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt="Order QR Code"
                        className="w-44 h-44 rounded-xl shadow-xs border border-stone-200 bg-white p-2"
                      />
                    ) : (
                      <div className="w-44 h-44 flex items-center justify-center text-xs text-stone-400">
                        QR 생성 중...
                      </div>
                    )}
                    <p className="text-[11px] text-stone-500 mt-2">
                      카메라로 비추면 앱 설치 없이 바로 주문 페이지가 열립니다
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= TAB 2: MENU RESTRICTION ================= */}
          {activeTab === 'restriction' && (
            <div className="space-y-3">
              {/* Toggle Banner */}
              <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      restrictionEnabled ? 'bg-amber-600 text-white' : 'bg-stone-200 text-stone-600'
                    }`}>
                      {restrictionEnabled ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-stone-900">
                        주문 가능 메뉴 제한하기
                      </h4>
                      <p className="text-[10px] text-stone-500">
                        동료들이 지정된 메뉴 중에서만 고를 수 있게 제한합니다
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={restrictionEnabled}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setRestrictionEnabled(checked);
                        if (checked && allowedIds.length === 0) {
                          handleApplyPreset('coffee_latte_tea');
                        } else {
                          const res: MenuRestriction = {
                            enabled: checked,
                            allowedMenuIds: allowedIds,
                            allowedMenuNames: cafeMenus
                              .filter((m) => allowedIds.includes(m.id))
                              .map((m) => m.name),
                            customNotice,
                          };
                          applySettings(res);
                        }
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
                  </label>
                </div>
              </div>

              {/* Quick Presets */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-stone-700 flex items-center justify-between">
                  <span>⚡ 1초 추천 프리셋</span>
                  <span className="text-[10px] text-stone-400">
                    선택된 메뉴: <strong className="text-amber-700">{allowedIds.length}</strong>개
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('coffee_latte_tea')}
                    className="p-2 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100/80 text-left transition-all cursor-pointer"
                  >
                    <div className="text-xs font-bold text-amber-950 flex items-center gap-1">
                      <span>⭐ 커피 + 라떼 + 녹차</span>
                    </div>
                    <div className="text-[10px] text-amber-700">질문하신 대표 3대 메뉴 구성</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApplyPreset('coffee_only')}
                    className="p-2 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-left transition-all cursor-pointer"
                  >
                    <div className="text-xs font-bold text-stone-900 flex items-center gap-1">
                      <span>☕ 커피류만 (아메/콜드브루)</span>
                    </div>
                    <div className="text-[10px] text-stone-500">기본 커피로만 통일할 때</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApplyPreset('latte_only')}
                    className="p-2 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-left transition-all cursor-pointer"
                  >
                    <div className="text-xs font-bold text-stone-900 flex items-center gap-1">
                      <span>🥛 라떼류만</span>
                    </div>
                    <div className="text-[10px] text-stone-500">카페라떼, 바닐라 등 라떼류</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApplyPreset('under5000')}
                    className="p-2 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-left transition-all cursor-pointer"
                  >
                    <div className="text-xs font-bold text-stone-900 flex items-center gap-1">
                      <span>💰 5,000원 이하만</span>
                    </div>
                    <div className="text-[10px] text-stone-500">가성비 예산 상한선 적용</div>
                  </button>
                </div>

                <div className="flex gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('all')}
                    className="flex-1 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11px] font-bold cursor-pointer"
                  >
                    전체 선택
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('none')}
                    className="flex-1 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11px] font-bold cursor-pointer"
                  >
                    전체 해제
                  </button>
                </div>
              </div>

              {/* Custom Announcement Input */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-stone-700">
                  📢 단톡방 및 주문 화면 안내 문구
                </label>
                <input
                  type="text"
                  value={customNotice}
                  onChange={(e) => {
                    const text = e.target.value;
                    setCustomNotice(text);
                    const res: MenuRestriction = {
                      enabled: restrictionEnabled,
                      allowedMenuIds: allowedIds,
                      allowedMenuNames: cafeMenus
                        .filter((m) => allowedIds.includes(m.id))
                        .map((m) => m.name),
                      customNotice: text,
                    };
                    applySettings(res);
                  }}
                  placeholder="예: 커피, 라떼, 녹차 중에서만 골라주세요!"
                  className="w-full h-8 px-2.5 bg-white border border-stone-300 rounded-xl text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-amber-600"
                />
              </div>

              {/* Menu Search & Checklist */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-stone-700">
                    메뉴 개별 선택 ({cafeMenus.length}종)
                  </span>
                  <div className="relative w-36">
                    <Search className="w-3 h-3 text-stone-400 absolute left-2 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={menuSearchQuery}
                      onChange={(e) => setMenuSearchQuery(e.target.value)}
                      placeholder="메뉴 검색..."
                      className="w-full h-6 pl-6 pr-2 bg-stone-50 border border-stone-200 rounded-lg text-[10px] text-stone-800 placeholder:text-stone-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="border border-stone-200 rounded-2xl max-h-48 overflow-y-auto divide-y divide-stone-100 bg-white">
                  {filteredRestrictionMenus.length === 0 ? (
                    <div className="p-4 text-center text-xs text-stone-400">
                      검색 결과가 없습니다.
                    </div>
                  ) : (
                    filteredRestrictionMenus.map((menu) => {
                      const isAllowed = allowedIds.includes(menu.id);
                      return (
                        <div
                          key={menu.id}
                          onClick={() => handleToggleMenuId(menu.id)}
                          className={`p-2 sm:px-3 flex items-center justify-between gap-2 cursor-pointer hover:bg-stone-50 transition-colors ${
                            isAllowed ? 'bg-amber-50/50' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {isAllowed ? (
                              <CheckSquare className="w-4 h-4 text-amber-600 shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-stone-300 shrink-0" />
                            )}
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-stone-900 truncate">
                                {menu.name}
                              </div>
                              <div className="text-[10px] text-stone-400">
                                {menu.category} · {menu.price.toLocaleString()}원
                              </div>
                            </div>
                          </div>

                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              isAllowed
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-stone-100 text-stone-400'
                            }`}
                          >
                            {isAllowed ? '주문 허용' : '제한'}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 3: GROUP CHAT TRACKING ================= */}
          {activeTab === 'group' && (
            <div className="space-y-3">
              {/* Target Member Count Setter */}
              <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-emerald-600" />
                      단톡방 총 인원수 설정
                    </h4>
                    <p className="text-[10px] text-stone-500">
                      단톡방 전체 인원을 입력하면 주문 달성률이 자동 계산됩니다
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const next = Math.max(0, targetCount - 1);
                        setTargetCount(next);
                        applySettings(undefined, next);
                      }}
                      className="w-7 h-7 rounded-lg bg-white border border-stone-300 text-stone-700 font-bold hover:bg-stone-100 cursor-pointer"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={0}
                      max={99}
                      value={targetCount || ''}
                      placeholder="0"
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setTargetCount(val);
                        applySettings(undefined, val);
                      }}
                      className="w-12 h-7 text-center font-bold text-xs bg-white border border-stone-300 rounded-lg text-stone-900"
                    />
                    <span className="text-xs font-bold text-stone-600">명</span>
                    <button
                      type="button"
                      onClick={() => {
                        const next = targetCount + 1;
                        setTargetCount(next);
                        applySettings(undefined, next);
                      }}
                      className="w-7 h-7 rounded-lg bg-white border border-stone-300 text-stone-700 font-bold hover:bg-stone-100 cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Quick Number Chips */}
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-stone-400">자주 쓰는 인원:</span>
                  {[4, 6, 8, 10, 12, 15].map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => {
                        setTargetCount(cnt);
                        applySettings(undefined, cnt);
                      }}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                        targetCount === cnt
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {cnt}명
                    </button>
                  ))}
                </div>

                {/* Live Progress Bar if targetCount set */}
                {targetCount > 0 && (
                  <div className="pt-2 border-t border-stone-200/80 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-stone-800">
                        📊 단톡방 {targetCount}명 중 <strong>{orderedList.length}명 주문 완료!</strong>
                      </span>
                      <span className="font-black text-emerald-700 font-mono">
                        {progressPercent}%
                      </span>
                    </div>

                    <div className="w-full h-2.5 bg-stone-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-stone-500">
                      <span>완료: {orderedList.length}명</span>
                      <span>
                        남은 미주문자:{' '}
                        <strong className="text-amber-700">
                          {Math.max(0, targetCount - orderedList.length)}명
                        </strong>
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Explanation Note on Group Chat API limitation */}
              <div className="p-2.5 bg-sky-50/80 rounded-2xl border border-sky-200 flex items-start gap-2 text-[11px] text-sky-950">
                <HelpCircle className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />
                <div className="leading-tight space-y-1">
                  <p className="font-bold text-sky-900">
                    💡 단톡방 인원을 알 수 있는 방법 안내
                  </p>
                  <p className="text-sky-800 text-[10px]">
                    카카오톡 등 메신저 보안 정책상 외부 웹 링크가 단톡방 인원수를 직접 조회할 수는 없습니다. 하지만 위에서 <strong>인원수(예: 8명)</strong>를 입력해 두시면, 실시간 진행률과 카톡 재촉 멘트에 남은 인원이 자동 반영됩니다!
                  </p>
                </div>
              </div>

              {/* Colleague Registration for detailed tracking */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-stone-700">
                  👥 단톡방 멤버 이름 등록 (누가 시켰고 누가 안 시켰는지 개별 추적)
                </label>
                <form onSubmit={handleAddNames} className="flex gap-1.5">
                  <input
                    type="text"
                    value={newNamesInput}
                    onChange={(e) => setNewNamesInput(e.target.value)}
                    placeholder="예: 김팀장, 박대리, 최사원, 이주임"
                    className="flex-1 h-8 px-2.5 bg-white border border-stone-300 rounded-xl text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-amber-600 font-medium"
                  />
                  <button
                    type="submit"
                    className="h-8 px-3 bg-stone-900 hover:bg-black text-white text-xs font-bold rounded-xl flex items-center gap-1 shrink-0 shadow-2xs cursor-pointer active:scale-95 transition-all"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>등록</span>
                  </button>
                </form>

                {/* Member Status Chips */}
                {roomMembers.length > 0 && (
                  <div className="pt-1 space-y-1.5">
                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                      {roomMembers.map((m) => {
                        const hasOrdered = order.items.some((it) => it.memberId === m.id);
                        const isPassed = m.status === 'passed';
                        return (
                          <span
                            key={m.id || m.name}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold border ${
                              hasOrdered
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : isPassed
                                ? 'bg-stone-200/80 text-stone-600 border-stone-300'
                                : 'bg-amber-50 text-amber-900 border-amber-300'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                hasOrdered
                                  ? 'bg-emerald-500'
                                  : isPassed
                                  ? 'bg-stone-400'
                                  : 'bg-amber-500'
                              }`}
                            />
                            <span>{m.name}</span>
                            <span className="text-[9px] opacity-75">
                              {hasOrdered ? '주문' : isPassed ? '패스' : '대기'}
                            </span>
                          </span>
                        );
                      })}
                    </div>

                    {/* Nudge Pending Button */}
                    {pendingList.length > 0 && (
                      <button
                        type="button"
                        onClick={handleCopyNudge}
                        disabled={isLoading || !shareUrl}
                        className="w-full h-8 px-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold flex items-center justify-between shadow-2xs active:scale-95 transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <Bell className="w-3 h-3 text-amber-200 shrink-0" />
                          <span className="truncate">
                            📢 아직 안 고른 {pendingList.length}명 ({pendingList.map((m) => m.name).join(', ')}) 재촉 카톡 복사
                          </span>
                        </div>
                        {copiedNudge ? (
                          <span className="text-[10px] font-black text-amber-200 shrink-0 ml-1">
                            복사됨!
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-100 shrink-0 ml-1">
                            1초 복사
                          </span>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-1.5 text-stone-500 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>로그인/앱 설치 없이 링크만으로 실시간 협업</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl cursor-pointer transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
