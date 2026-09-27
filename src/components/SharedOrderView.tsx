import React, { useState, useEffect } from 'react';
import {
  Coffee,
  Users,
  ListFilter,
  CreditCard,
  Copy,
  Check,
  PlusCircle,
  Share2,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Clock,
  UserCheck,
  UserX,
  X,
  Lock,
} from 'lucide-react';
import {
  ShareableOrder,
  formatKakaoShareText,
  fetchLiveRoom,
  markMemberPass,
  recordRoomView,
} from '../services/shareService';
import { Cafe } from '../types';

interface SharedOrderViewProps {
  order: ShareableOrder;
  matchingCafe?: Cafe;
  onJoinOrder: (order: ShareableOrder, selectedMemberName?: string) => void;
  onStartNewOrder: () => void;
  onOpenShareModal: () => void;
  onShowToast: (message: string) => void;
}

export const SharedOrderView: React.FC<SharedOrderViewProps> = ({
  order: initialOrder,
  matchingCafe,
  onJoinOrder,
  onStartNewOrder,
  onOpenShareModal,
  onShowToast,
}) => {
  const [order, setOrder] = useState<ShareableOrder>(initialOrder);
  const [viewTab, setViewTab] = useState<'byMember' | 'byDrink' | 'dutch'>('byMember');
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);
  const [passTargetName, setPassTargetName] = useState('');
  const [customPassName, setCustomPassName] = useState('');
  const [selectedPassReason, setSelectedPassReason] = useState('점심을 배부르게 먹었어요');
  const [customPassReason, setCustomPassReason] = useState('');
  const [selectedColleague, setSelectedColleague] = useState<string>('');

  // Record view on mount and poll room if roomId is present
  useEffect(() => {
    setOrder(initialOrder);
    if (!initialOrder.roomId) return;

    recordRoomView(initialOrder.roomId).catch(() => {});

    let isCancelled = false;
    const interval = setInterval(async () => {
      if (isCancelled) return;
      try {
        const live = await fetchLiveRoom(initialOrder.roomId!);
        if (!live || isCancelled) return;
        setOrder((prev) => {
          return {
            ...prev,
            items: live.items,
            members: live.members,
            totalAmount: live.totalAmount,
            totalQuantity: live.totalQuantity,
            menuRestriction: live.menuRestriction,
            targetMemberCount: live.targetMemberCount,
            viewCount: live.viewCount,
          };
        });
      } catch {}
    }, 2500);

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [initialOrder]);

  const handleManualRefresh = async () => {
    if (!order.roomId) return;
    setIsRefreshing(true);
    try {
      const live = await fetchLiveRoom(order.roomId);
      if (live) {
        setOrder((prev) => ({
          ...prev,
          items: live.items,
          members: live.members,
          totalAmount: live.totalAmount,
          totalQuantity: live.totalQuantity,
          menuRestriction: live.menuRestriction,
          targetMemberCount: live.targetMemberCount,
          viewCount: live.viewCount,
        }));
        onShowToast('최신 주문 내역을 동기화했습니다! 🔄');
      }
    } catch {}
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Group items by member
  const memberGroups = order.members.map((member) => {
    const memberItems = order.items.filter((it) => it.memberId === member.id);
    const subtotal = memberItems.reduce((sum, it) => sum + it.totalPrice, 0);
    const count = memberItems.reduce((sum, it) => sum + it.quantity, 0);
    return {
      member,
      items: memberItems,
      subtotal,
      count,
    };
  });

  // Categorize: Ordered, Pending, Passed
  const orderedGroups = memberGroups.filter(
    (g) => g.items.length > 0 && g.member.status !== 'passed'
  );
  const pendingGroups = memberGroups.filter(
    (g) => g.items.length === 0 && g.member.status !== 'passed'
  );
  const passedGroups = memberGroups.filter((g) => g.member.status === 'passed');

  const handlePassSubmit = async () => {
    const target = (passTargetName === '__custom__' || !passTargetName ? customPassName : passTargetName).trim();
    if (!target) {
      onShowToast('이름을 입력해주세요.');
      return;
    }
    if (order.roomId) {
      try {
        await markMemberPass(order.roomId, target);
        onShowToast(`'${target}' 님은 오늘은 안 마심(패스)으로 등록되었습니다.`);
        setIsPassModalOpen(false);
        handleManualRefresh();
      } catch {
        onShowToast('패스 등록 실패');
      }
    } else {
      setIsPassModalOpen(false);
      onShowToast(`'${target}' 님이 패스 처리되었습니다.`);
    }
  };

  // Consolidated items for counter/kiosk
  const consolidatedDrinks = order.items.reduce((acc, item) => {
    const optSummary = [
      item.options.temperature,
      item.options.size?.label,
      item.options.iceLevel ? `얼음 ${item.options.iceLevel}` : null,
      item.options.sweetness ? `당도 ${item.options.sweetness}` : null,
      item.options.extraShots ? `샷+${item.options.extraShots}` : null,
      item.options.syrup ? item.options.syrup : null,
      item.options.whip ? '휘핑' : null,
      item.options.notes ? `(${item.options.notes})` : null,
    ]
      .filter(Boolean)
      .join(' / ');

    const key = `${item.menuName}__${optSummary}`;
    if (!acc[key]) {
      acc[key] = {
        name: item.menuName,
        options: optSummary,
        quantity: 0,
        totalPrice: 0,
        members: [] as string[],
      };
    }
    acc[key].quantity += item.quantity;
    acc[key].totalPrice += item.totalPrice;

    const memberName = order.members.find((m) => m.id === item.memberId)?.name || '주문자';
    if (!acc[key].members.includes(memberName)) {
      acc[key].members.push(memberName);
    }

    return acc;
  }, {} as Record<string, { name: string; options: string; quantity: number; totalPrice: number; members: string[] }>);

  const handleCopyAccount = () => {
    if (!order.accountInfo?.accountNumber) return;
    const text = `${order.accountInfo.bank} ${order.accountInfo.accountNumber}`;
    navigator.clipboard.writeText(text);
    setCopiedAccount(true);
    onShowToast('계좌번호가 복사되었습니다!');
    setTimeout(() => setCopiedAccount(false), 2000);
  };

  const handleCopySummaryText = () => {
    const text = formatKakaoShareText(order);
    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    onShowToast('주문서 텍스트가 복사되었습니다!');
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  const formattedDate = new Date(order.createdAt).toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="pb-32 space-y-4">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-amber-900 to-amber-950 text-white rounded-3xl p-5 shadow-md relative overflow-hidden">
        <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />

        <div className="flex items-center justify-between mb-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-amber-200 text-[11px] font-bold backdrop-blur-xs">
            <Coffee className="w-3 h-3" />
            <span>공유받은 커피 주문서</span>
          </span>
          <span className="text-[11px] text-amber-300/80">{formattedDate}</span>
        </div>

        <h1 className="text-xl font-black tracking-tight text-white mb-1">
          {order.cafeName}
        </h1>
        <p className="text-xs text-amber-200/90 mb-4">
          동료들이 취합한 총 <strong className="text-white underline">{order.totalQuantity}잔</strong>의 주문 리스트입니다.
        </p>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/15">
          <div className="bg-white/10 rounded-2xl p-2.5 backdrop-blur-xs">
            <div className="text-[10px] text-amber-200 font-bold">주문 인원</div>
            <div className="text-base font-extrabold text-white">
              {orderedGroups.length}명 / {order.members.length}명
            </div>
          </div>
          <div className="bg-white/10 rounded-2xl p-2.5 backdrop-blur-xs">
            <div className="text-[10px] text-amber-200 font-bold">총 주문 금액</div>
            <div className="text-base font-extrabold text-amber-300">
              {order.totalAmount.toLocaleString()}원
            </div>
          </div>

          {/* Group Chat Target Progress if configured */}
          {order.targetMemberCount && order.targetMemberCount > 0 && (
            <div className="bg-white/10 rounded-2xl p-2.5 backdrop-blur-xs col-span-2 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-amber-200 font-bold">
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-amber-300" />
                  단톡방 주문 현황 ({order.targetMemberCount}명 목표)
                </span>
                <span className="font-mono text-white font-black">
                  {Math.min(100, Math.round((orderedGroups.length / order.targetMemberCount) * 100))}%
                </span>
              </div>
              <div className="w-full h-2 bg-black/25 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, Math.round((orderedGroups.length / order.targetMemberCount) * 100))}%`,
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-amber-100">
                <span>완료: {orderedGroups.length}명</span>
                <span>
                  미주문: {Math.max(0, order.targetMemberCount - orderedGroups.length)}명 남음
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Menu Restriction Banner */}
      {order.menuRestriction?.enabled && (
        <div className="p-3.5 bg-amber-500/10 border border-amber-300 rounded-2xl flex items-start gap-2.5 text-amber-950 shadow-xs animate-in fade-in">
          <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <div className="font-extrabold text-amber-950 flex items-center gap-1.5 flex-wrap">
              <span>총무님의 메뉴 선택 제한 적용 중 🔒</span>
              <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded-full font-bold">
                {order.menuRestriction.allowedMenuNames?.length || 0}종만 허용
              </span>
            </div>
            <p className="text-[11px] text-amber-800 font-medium">
              {order.menuRestriction.customNotice ||
                '총무님이 지정한 추천 메뉴(커피, 라떼, 녹차 등) 중에서만 선택할 수 있습니다.'}
            </p>
            {order.menuRestriction.allowedMenuNames &&
              order.menuRestriction.allowedMenuNames.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {order.menuRestriction.allowedMenuNames.slice(0, 6).map((name) => (
                    <span
                      key={name}
                      className="px-2 py-0.5 bg-white text-stone-800 text-[10px] font-bold rounded-lg border border-amber-200 shadow-2xs"
                    >
                      ✓ {name}
                    </span>
                  ))}
                  {order.menuRestriction.allowedMenuNames.length > 6 && (
                    <span className="text-[10px] text-amber-700 self-center font-bold">
                      외 {order.menuRestriction.allowedMenuNames.length - 6}종
                    </span>
                  )}
                </div>
              )}
          </div>
        </div>
      )}

      {/* Primary Action: Join & Add My Drink OR Pass */}
      <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/90 rounded-2xl shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-black text-amber-950 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-amber-700" />
              <span>
                {pendingGroups.length > 0
                  ? `아직 ${pendingGroups.length}명이 메뉴를 고르고 있어요`
                  : '커피 주문 참여하기'}
              </span>
            </div>
            <div className="text-[11px] text-amber-800 mt-0.5">
              내 이름을 선택하고 음료를 담거나, 안 마신다면 패스해주세요!
            </div>
          </div>
        </div>

        {/* Colleague Quick Selection Chips */}
        {order.members.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-stone-700 block">
              누구이신가요? 본인 이름을 탭하세요:
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
              {order.members.map((m) => {
                const hasOrdered = order.items.some((it) => it.memberId === m.id);
                const isPassed = m.status === 'passed';
                const isSelected = selectedColleague === m.name;
                return (
                  <button
                    key={m.id || m.name}
                    type="button"
                    onClick={() => {
                      setSelectedColleague(m.name);
                      setPassTargetName(m.name);
                    }}
                    className={`h-8 px-2.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs scale-102 ring-2 ring-amber-300'
                        : hasOrdered
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100'
                        : isPassed
                        ? 'bg-stone-100 text-stone-500 border-stone-300 hover:bg-stone-200'
                        : 'bg-white text-stone-900 border-amber-300 hover:bg-amber-100/70 shadow-2xs'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isSelected
                          ? 'bg-white'
                          : hasOrdered
                          ? 'bg-emerald-500'
                          : isPassed
                          ? 'bg-stone-400'
                          : 'bg-amber-500'
                      }`}
                    />
                    <span>{m.name}</span>
                    <span className="text-[10px] opacity-80">
                      {hasOrdered ? '✓' : isPassed ? '(패스)' : '(대기)'}
                    </span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  setSelectedColleague('__custom__');
                  setPassTargetName('__custom__');
                }}
                className={`h-8 px-2.5 rounded-xl text-xs font-bold border border-dashed transition-all cursor-pointer ${
                  selectedColleague === '__custom__'
                    ? 'bg-amber-600 text-white border-amber-600 ring-2 ring-amber-300'
                    : 'bg-white/80 hover:bg-white text-stone-700 border-stone-300'
                }`}
              >
                + 직접 이름 입력
              </button>
            </div>

            {selectedColleague === '__custom__' && (
              <div className="pt-1">
                <input
                  type="text"
                  value={customPassName}
                  onChange={(e) => setCustomPassName(e.target.value)}
                  placeholder="본인 이름을 입력하세요 (예: 최사원)"
                  className="w-full h-8 px-3 rounded-xl bg-white border border-amber-300 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            )}
          </div>
        )}

        {/* Selected Colleague Indicator Banner */}
        {selectedColleague && selectedColleague !== '__custom__' && (
          <div className="p-2 rounded-xl bg-amber-100/80 border border-amber-300 text-xs text-amber-950 font-bold flex items-center justify-between">
            <span>👋 '{selectedColleague}' 님으로 선택되었습니다!</span>
            <button
              type="button"
              onClick={() => setSelectedColleague('')}
              className="text-[10px] text-amber-800 underline hover:text-amber-950"
            >
              선택 취소
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={() => {
              const name =
                selectedColleague === '__custom__'
                  ? customPassName.trim()
                  : selectedColleague;
              onJoinOrder(order, name || undefined);
            }}
            type="button"
            className="h-11 px-3 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>
              {selectedColleague && selectedColleague !== '__custom__'
                ? `${selectedColleague} 메뉴 담기`
                : '내 메뉴 담기'}
            </span>
          </button>

          <button
            onClick={() => {
              if (selectedColleague && selectedColleague !== '__custom__') {
                setPassTargetName(selectedColleague);
              }
              setIsPassModalOpen(true);
            }}
            type="button"
            className="h-11 px-3 rounded-xl bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer shadow-2xs"
          >
            <UserX className="w-4 h-4 text-stone-500" />
            <span>오늘은 안 마셔요</span>
          </button>
        </div>
      </div>

      {/* Status Summary Pills */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200/70 text-center">
          <span className="text-[10px] text-emerald-800 font-bold block flex items-center justify-center gap-1">
            <UserCheck className="w-3 h-3 text-emerald-600" />
            <span>주문 완료</span>
          </span>
          <span className="text-sm font-black text-emerald-950">
            {orderedGroups.length}명
          </span>
        </div>

        <div className="p-2 rounded-xl bg-amber-50 border border-amber-200/70 text-center">
          <span className="text-[10px] text-amber-800 font-bold block flex items-center justify-center gap-1">
            <Clock className="w-3 h-3 text-amber-600" />
            <span>미주문 대기</span>
          </span>
          <span className="text-sm font-black text-amber-950">
            {pendingGroups.length}명
          </span>
        </div>

        <div className="p-2 rounded-xl bg-stone-100 border border-stone-200 text-center">
          <span className="text-[10px] text-stone-600 font-bold block flex items-center justify-center gap-1">
            <UserX className="w-3 h-3 text-stone-400" />
            <span>안 마심</span>
          </span>
          <span className="text-sm font-black text-stone-800">
            {passedGroups.length}명
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-3 p-1 bg-stone-100 rounded-xl gap-1">
        <button
          type="button"
          onClick={() => setViewTab('byMember')}
          className={`h-8 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all ${
            viewTab === 'byMember'
              ? 'bg-white text-stone-900 shadow-xs'
              : 'text-stone-500 hover:text-stone-900'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>개인별</span>
        </button>
        <button
          type="button"
          onClick={() => setViewTab('byDrink')}
          className={`h-8 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all ${
            viewTab === 'byDrink'
              ? 'bg-white text-stone-900 shadow-xs'
              : 'text-stone-500 hover:text-stone-900'
          }`}
        >
          <ListFilter className="w-3.5 h-3.5" />
          <span>매장 취합용</span>
        </button>
        <button
          type="button"
          onClick={() => setViewTab('dutch')}
          className={`h-8 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all ${
            viewTab === 'dutch'
              ? 'bg-white text-stone-900 shadow-xs'
              : 'text-stone-500 hover:text-stone-900'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>정산/계좌</span>
        </button>
      </div>

      {/* View 1: By Member */}
      {viewTab === 'byMember' && (
        <div className="space-y-3">
          {/* Pending Members Section */}
          {pendingGroups.length > 0 && (
            <div className="bg-amber-50/70 rounded-2xl border border-amber-200 p-3.5 space-y-2">
              <span className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>아직 메뉴를 고르고 있어요 ({pendingGroups.length}명)</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {pendingGroups.map(({ member }) => (
                  <span
                    key={member.id}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-amber-200 text-xs font-bold text-stone-800 shadow-2xs"
                  >
                    <span>{member.name}</span>
                    <span className="text-[10px] text-amber-700 font-semibold">(미주문)</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Ordered Members Section */}
          {orderedGroups.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-stone-200 p-6 text-center text-xs text-stone-400">
              아직 주문을 완료한 사람이 없습니다.
            </div>
          ) : (
            orderedGroups.map(({ member, items, subtotal, count }) => (
              <div
                key={member.id}
                className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs"
              >
                <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-stone-100">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-900 font-extrabold text-xs flex items-center justify-center">
                      {member.name.slice(0, 1)}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-sm font-extrabold text-stone-900">
                          {member.name}
                        </h3>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.2 rounded">
                          완료
                        </span>
                      </div>
                      <span className="text-[11px] text-stone-400">
                        총 {count}개 선택
                      </span>
                    </div>
                  </div>
                  <div className="text-sm font-black text-amber-900">
                    {subtotal.toLocaleString()}원
                  </div>
                </div>

                <div className="space-y-2">
                  {items.map((it) => (
                    <div
                      key={it.id}
                      className="flex items-start justify-between text-xs py-1"
                    >
                      <div className="space-y-0.5">
                        <div className="font-bold text-stone-800">
                          {it.menuName}{' '}
                          <span className="text-amber-700 font-extrabold">
                            x{it.quantity}
                          </span>
                        </div>
                        <div className="text-[11px] text-stone-500">
                          {[
                            it.options.temperature,
                            it.options.size?.label,
                            it.options.iceLevel ? `얼음 ${it.options.iceLevel}` : null,
                            it.options.sweetness ? `당도 ${it.options.sweetness}` : null,
                            it.options.extraShots ? `샷+${it.options.extraShots}` : null,
                            it.options.syrup ? it.options.syrup : null,
                            it.options.whip ? '휘핑' : null,
                            it.options.notes ? `(${it.options.notes})` : null,
                          ]
                            .filter(Boolean)
                            .join(' / ')}
                        </div>
                      </div>
                      <div className="font-extrabold text-stone-700 shrink-0 ml-2">
                        {it.totalPrice.toLocaleString()}원
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}

          {/* Passed Members Section */}
          {passedGroups.length > 0 && (
            <div className="bg-stone-50 rounded-2xl border border-stone-200 p-3 space-y-1.5">
              <span className="text-xs font-bold text-stone-600 flex items-center gap-1.5">
                <UserX className="w-3.5 h-3.5 text-stone-400" />
                <span>오늘은 안 마심 ({passedGroups.length}명)</span>
              </span>
              <p className="text-xs text-stone-500">
                {passedGroups.map((g) => g.member.name).join(', ')}
              </p>
            </div>
          )}
        </div>
      )}

      {/* View 2: Consolidated Drink List for Counter/Kiosk */}
      {viewTab === 'byDrink' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-stone-100">
            <span className="text-xs font-bold text-stone-700">
              바리스타 / 키오스크 주문용 취합
            </span>
            <span className="text-xs text-stone-400">
              메뉴별 총 {Object.keys(consolidatedDrinks).length}종
            </span>
          </div>

          <div className="space-y-3">
            {Object.values(consolidatedDrinks).map((drink, idx) => (
              <div
                key={idx}
                className="p-3 bg-stone-50 rounded-xl border border-stone-200/70 flex items-start justify-between"
              >
                <div>
                  <div className="text-xs font-black text-stone-900">
                    {drink.name}
                  </div>
                  {drink.options && (
                    <div className="text-[11px] text-amber-800 font-medium mt-0.5">
                      {drink.options}
                    </div>
                  )}
                  <div className="text-[10px] text-stone-400 mt-1">
                    주문자: {drink.members.join(', ')}
                  </div>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <div className="text-base font-black text-stone-900">
                    {drink.quantity}잔
                  </div>
                  <div className="text-[11px] text-stone-500">
                    {drink.totalPrice.toLocaleString()}원
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* View 3: Dutch Pay & Account Info */}
      {viewTab === 'dutch' && (
        <div className="space-y-3">
          {/* Bank Account Info Card */}
          {order.accountInfo?.accountNumber ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 shadow-xs">
              <div className="text-xs font-bold text-emerald-900 mb-1">
                총무 입금 계좌
              </div>
              <div className="flex items-center justify-between mt-2">
                <div>
                  <div className="text-sm font-black text-stone-900">
                    {order.accountInfo.bank} {order.accountInfo.accountNumber}
                  </div>
                  <div className="text-xs text-stone-500 mt-0.5">
                    예금주: {order.accountInfo.accountHolder || '총무'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCopyAccount}
                  className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-all active:scale-95"
                >
                  {copiedAccount ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>복사됨</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>계좌 복사</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 text-center text-xs text-stone-500">
              등록된 입금 계좌번호가 없습니다.
            </div>
          )}

          {/* Member Settlement Breakdown */}
          <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs">
            <h3 className="text-xs font-bold text-stone-700 pb-2 border-b border-stone-100 mb-3">
              1인당 정산 금액
            </h3>

            {order.dutchPay && order.dutchPay.splits.length > 0 ? (
              <div className="space-y-2">
                {order.dutchPay.splits.map((s) => (
                  <div
                    key={s.memberId}
                    className="flex items-center justify-between text-xs py-1.5 border-b border-stone-50 last:border-0"
                  >
                    <span className="font-bold text-stone-800">{s.memberName}</span>
                    <div className="text-right">
                      <span className="text-sm font-black text-amber-900">
                        {s.amount.toLocaleString()}원
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {memberGroups.map(({ member, subtotal }) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between text-xs py-1.5 border-b border-stone-50 last:border-0"
                  >
                    <span className="font-bold text-stone-800">{member.name}</span>
                    <div className="text-right">
                      <span className="text-sm font-black text-amber-900">
                        {subtotal.toLocaleString()}원
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom Sticky Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-stone-200 max-w-md mx-auto z-40 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleCopySummaryText}
            className="h-11 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-98"
          >
            {copiedSummary ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span>{copiedSummary ? '복사 완료!' : '주문서 복사'}</span>
          </button>

          <button
            type="button"
            onClick={onOpenShareModal}
            className="h-11 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-98"
          >
            <Share2 className="w-4 h-4" />
            <span>링크 공유하기</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onStartNewOrder}
          className="w-full text-center text-xs text-stone-500 hover:text-stone-800 py-1 transition-colors"
        >
          새로운 주문 직접 시작하기 →
        </button>
      </div>

      {/* Pass ("오늘은 안 마셔요") Modal */}
      {isPassModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center">
                  <UserX className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-stone-900 text-sm">
                    오늘은 커피 안 마실게요
                  </h3>
                  <p className="text-[11px] text-stone-400">
                    총무님께 패스한다고 전달해 드려요
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPassModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-3.5">
              {/* Name selection / input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 block">
                  본인 이름
                </label>
                {order.members.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {order.members.map((m) => (
                      <button
                        key={m.id || m.name}
                        type="button"
                        onClick={() => {
                          setPassTargetName(m.name);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                          passTargetName === m.name
                            ? 'bg-stone-900 text-white border-stone-900'
                            : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                        }`}
                      >
                        {m.name}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setPassTargetName('__custom__')}
                      className={`px-2 py-1 rounded-lg text-xs font-medium border border-dashed cursor-pointer ${
                        passTargetName === '__custom__'
                          ? 'bg-stone-900 text-white border-stone-900'
                          : 'bg-white text-stone-600 border-stone-300'
                      }`}
                    >
                      + 다른 이름
                    </button>
                  </div>
                )}

                {(!order.members.length || passTargetName === '__custom__') && (
                  <input
                    type="text"
                    value={customPassName}
                    onChange={(e) => setCustomPassName(e.target.value)}
                    placeholder="이름을 입력하세요 (예: 최사원)"
                    className="w-full h-9 px-3 rounded-xl border border-stone-300 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-amber-600 font-medium"
                  />
                )}
              </div>

              {/* Pass Reason quick chips */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 block">
                  안 마시는 이유 (선택)
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    '점심을 배부르게 먹었어요 🍚',
                    '이미 커피를 마셨어요 ☕',
                    '외근 / 외부 미팅 🏃',
                    '다이어트 / 카페인 조절 🥗',
                  ].map((reason) => (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => setSelectedPassReason(reason)}
                      className={`p-2 rounded-xl text-[11px] font-bold border text-left transition-all cursor-pointer ${
                        selectedPassReason === reason
                          ? 'bg-amber-50 text-amber-950 border-amber-400 ring-1 ring-amber-400'
                          : 'bg-stone-50 hover:bg-stone-100 text-stone-600 border-stone-200'
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setIsPassModalOpen(false)}
                className="flex-1 h-11 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs transition-colors cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handlePassSubmit}
                className="flex-1 h-11 rounded-xl bg-stone-900 hover:bg-black text-white font-extrabold text-xs transition-all shadow-xs cursor-pointer active:scale-95"
              >
                패스 등록 완료
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
