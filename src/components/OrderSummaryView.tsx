import React, { useState } from 'react';
import {
  Copy,
  Trash2,
  Plus,
  ArrowRight,
  Coffee,
  Check,
  ShoppingBag,
  ListFilter,
  Users,
  Share2,
  RefreshCw,
  Clock,
  UserCheck,
  UserX,
  UserPlus,
  Bell,
  X,
  ChevronDown,
  ChevronUp,
  Lock,
} from 'lucide-react';
import { Cafe, MenuRestriction, OrderItem, OrderMember } from '../types';

interface OrderSummaryViewProps {
  cafe: Cafe;
  members: OrderMember[];
  items: OrderItem[];
  onAddMoreForMember: (memberId: string) => void;
  onDeleteItem: (itemId: string) => void;
  onDeleteMember: (memberId: string) => void;
  onGoToDutchPay: () => void;
  onGoBackToMenu: () => void;
  onOpenShareModal: () => void;
  onShowToast: (message: string) => void;
  activeRoomId?: string | null;
  onManualRefresh?: () => void;
  isRefreshing?: boolean;
  onAddBatchMembers?: (names: string[]) => void;
  onToggleMemberPass?: (memberName: string, isPassed: boolean) => void;
  onNudgePending?: (pendingNames: string[]) => void;
  menuRestriction?: MenuRestriction;
  targetMemberCount?: number;
}

export const OrderSummaryView: React.FC<OrderSummaryViewProps> = ({
  cafe,
  members,
  items,
  onAddMoreForMember,
  onDeleteItem,
  onDeleteMember,
  onGoToDutchPay,
  onGoBackToMenu,
  onOpenShareModal,
  onShowToast,
  activeRoomId,
  onManualRefresh,
  isRefreshing,
  onAddBatchMembers,
  onToggleMemberPass,
  onNudgePending,
  menuRestriction,
  targetMemberCount,
}) => {
  const [viewTab, setViewTab] = useState<'byMember' | 'byDrink'>('byMember');
  const [copied, setCopied] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchNamesInput, setBatchNamesInput] = useState('');
  const [showPassedList, setShowPassedList] = useState(false);

  const totalQuantity = items.reduce((sum, it) => sum + it.quantity, 0);
  const totalAmount = items.reduce((sum, it) => sum + it.totalPrice, 0);

  // Group items by member
  const memberGroups = members.map((member) => {
    const memberItems = items.filter((it) => it.memberId === member.id);
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

  // Consolidated items for Barista/Kiosk Ordering
  const consolidatedDrinks = items.reduce((acc, item) => {
    const optSummary = [
      item.options.temperature,
      item.options.size?.label,
      item.options.iceLevel ? `얼음 ${item.options.iceLevel}` : null,
      item.options.sweetness ? `당도 ${item.options.sweetness}` : null,
      item.options.extraShots ? `샷+${item.options.extraShots}` : null,
      item.options.syrup ? item.options.syrup : null,
      item.options.whip ? '휘핑' : null,
      item.options.warming ? '데움' : null,
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

    const memberName = members.find((m) => m.id === item.memberId)?.name || '주문자';
    if (!acc[key].members.includes(memberName)) {
      acc[key].members.push(memberName);
    }

    return acc;
  }, {} as Record<string, { name: string; options: string; quantity: number; totalPrice: number; members: string[] }>);

  // Copy order summary as KakaoTalk share text
  const handleCopyKakaoText = () => {
    let text = `☕ [${cafe.name}] 오늘의 주문 취합\n`;
    text += `총 ${totalQuantity}잔 / ${totalAmount.toLocaleString()}원\n\n`;

    orderedGroups.forEach(({ member, items: mItems, subtotal }) => {
      text += `👤 ${member.name} (${subtotal.toLocaleString()}원)\n`;
      mItems.forEach((it) => {
        const opt = [
          it.options.temperature,
          it.options.size?.label,
          it.options.extraShots ? `샷+${it.options.extraShots}` : null,
        ]
          .filter(Boolean)
          .join('/');
        text += `  • ${it.menuName} ${opt ? `(${opt}) ` : ''}${it.quantity}잔 - ${it.totalPrice.toLocaleString()}원\n`;
      });
      text += '\n';
    });

    if (pendingGroups.length > 0) {
      text += `⏳ 아직 미주문: ${pendingGroups.map((g) => g.member.name).join(', ')}\n\n`;
    }

    if (passedGroups.length > 0) {
      text += `🙅‍♂️ 오늘은 패스: ${passedGroups.map((g) => g.member.name).join(', ')}\n\n`;
    }

    text += `주문 완료: ${orderedGroups.length}명 / 총 참여: ${members.length}명\n확인 부탁드립니다! 😊`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    onShowToast('주문 내역이 복사되었습니다! 카톡에 붙여넣어 공유하세요.');
    setTimeout(() => setCopied(false), 2000);
  };

  // Submit batch members
  const handleBatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = batchNamesInput;
    const names = raw
      .split(/[,/\n\s]+/)
      .map((n) => n.trim())
      .filter((n) => n.length > 0);

    if (names.length === 0) {
      onShowToast('추가할 멤버 이름을 1명 이상 입력해주세요.');
      return;
    }

    onAddBatchMembers?.(names);
    setBatchNamesInput('');
    setIsBatchModalOpen(false);
  };

  return (
    <div className="pb-32">
      {/* Live Room Sync Indicator */}
      {activeRoomId ? (
        <div className="mb-3.5 p-3.5 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 rounded-2xl border border-emerald-200 shadow-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-black text-emerald-950">
                  실시간 주문 자동 취합 중 🟢
                </span>
                <span className="text-[10px] bg-emerald-200 text-emerald-900 font-mono px-1.5 py-0.2 rounded font-bold">
                  방 #{activeRoomId}
                </span>
              </div>
              <p className="text-[11px] text-emerald-800 leading-tight mt-0.5">
                동료가 링크에서 메뉴를 담으면 2.5초마다 여기에 자동으로 반영됩니다.
              </p>
              <p className="text-[10px] text-emerald-600 leading-tight mt-0.5">
                💡 뒤로 가셔도 방은 안전하게 유지되며, 홈 화면 상단 배너에서 언제든 돌아올 수 있습니다.
              </p>
            </div>
          </div>

          {onManualRefresh && (
            <button
              onClick={onManualRefresh}
              type="button"
              disabled={isRefreshing}
              className="h-8 px-2.5 rounded-xl bg-white hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-300 flex items-center gap-1 shadow-2xs active:scale-95 transition-all shrink-0 ml-2 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
              <span>새로고침</span>
            </button>
          )}
        </div>
      ) : (
        <div className="mb-3.5 p-3.5 bg-amber-50 rounded-2xl border border-amber-200/90 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0 mr-2">
            <Share2 className="w-4 h-4 text-amber-700 shrink-0" />
            <div>
              <p className="text-xs font-bold text-amber-950 leading-tight">
                동료들에게 주문 링크를 보내보세요!
              </p>
              <p className="text-[11px] text-amber-800 leading-tight mt-0.5">
                링크를 주면 동료들이 휴대폰에서 직접 고르고, 여기에 자동으로 모입니다.
              </p>
            </div>
          </div>
          <button
            onClick={onOpenShareModal}
            type="button"
            className="h-8 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0 shadow-2xs active:scale-95 transition-all cursor-pointer"
          >
            링크 만들기
          </button>
        </div>
      )}

      {/* Top Banner & Mode Tabs */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-stone-500 mb-0.5">
              <Coffee className="w-3.5 h-3.5 text-amber-700" />
              <span>{cafe.name} 주문서</span>
            </div>
            <h2 className="text-lg font-black text-stone-900 tracking-tight">
              총 {totalQuantity}잔 · {totalAmount.toLocaleString()}원
            </h2>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onOpenShareModal}
              type="button"
              className="h-9 px-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all shadow-xs cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>링크 공유</span>
            </button>

            <button
              onClick={handleCopyKakaoText}
              type="button"
              className="h-9 px-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold flex items-center gap-1.5 border border-amber-200/80 active:scale-95 transition-all cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '복사됨' : '카톡 복사'}</span>
            </button>
          </div>
        </div>

        {/* Group Chat Progress & Menu Restriction Badges */}
        {(targetMemberCount || menuRestriction?.enabled) && (
          <div className="mb-3 pt-2.5 border-t border-stone-100 space-y-2">
            {targetMemberCount && targetMemberCount > 0 && (
              <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-950 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-emerald-700" />
                    단톡방 {targetMemberCount}명 중 <strong>{orderedGroups.length}명 주문 완료!</strong>
                  </span>
                  <span className="font-mono font-black text-emerald-800">
                    {Math.min(100, Math.round((orderedGroups.length / targetMemberCount) * 100))}%
                  </span>
                </div>
                <div className="w-full h-2 bg-emerald-200/60 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, Math.round((orderedGroups.length / targetMemberCount) * 100))}%`,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-emerald-700">
                  <span>완료: {orderedGroups.length}명</span>
                  <span>미주문: {Math.max(0, targetMemberCount - orderedGroups.length)}명</span>
                </div>
              </div>
            )}

            {menuRestriction?.enabled && (
              <div className="p-2 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between text-xs text-amber-950">
                <div className="flex items-center gap-1.5 truncate mr-2">
                  <Lock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span className="truncate">
                    <strong>메뉴 제한 적용 중</strong> ({menuRestriction.allowedMenuNames?.length || 0}종: 커피, 라떼, 녹차 등)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onOpenShareModal}
                  className="text-[10px] font-bold text-amber-800 hover:text-amber-950 underline shrink-0 cursor-pointer"
                >
                  제한 변경
                </button>
              </div>
            )}
          </div>
        )}

        {/* View Switcher Tabs */}
        <div className="grid grid-cols-2 p-1 bg-stone-100 rounded-xl gap-1">
          <button
            type="button"
            onClick={() => setViewTab('byMember')}
            className={`h-8 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              viewTab === 'byMember'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>개인별 주문 ({members.length}명)</span>
          </button>
          <button
            type="button"
            onClick={() => setViewTab('byDrink')}
            className={`h-8 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              viewTab === 'byDrink'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            <span>카운터/키오스크 주문용</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Member Grouped View */}
      {viewTab === 'byMember' && (
        <div className="space-y-4">
          {/* Status Counter Bar & Quick Actions */}
          <div className="bg-stone-50 rounded-2xl p-3 border border-stone-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-700">주문 현황</span>
              <button
                onClick={() => setIsBatchModalOpen(true)}
                type="button"
                className="h-7 px-2.5 rounded-lg bg-white border border-stone-300 hover:bg-stone-100 text-stone-800 text-[11px] font-bold flex items-center gap-1 shadow-2xs active:scale-95 transition-all cursor-pointer"
              >
                <UserPlus className="w-3 h-3 text-amber-700" />
                <span>+ 함께 마실 명단 등록</span>
              </button>
            </div>

            {/* 3 Status Pills */}
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
                  <span>안 마심(패스)</span>
                </span>
                <span className="text-sm font-black text-stone-800">
                  {passedGroups.length}명
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 1: PENDING MEMBERS (미주문자) */}
          {pendingGroups.length > 0 && (
            <div className="bg-amber-50/60 rounded-2xl border border-amber-200 p-3.5 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-amber-200/60">
                <div className="flex items-center gap-1.5 text-xs font-black text-amber-950">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>아직 메뉴를 안 고른 사람 ({pendingGroups.length}명)</span>
                </div>

                {onNudgePending && (
                  <button
                    onClick={() =>
                      onNudgePending(pendingGroups.map((g) => g.member.name))
                    }
                    type="button"
                    className="h-7 px-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs active:scale-95 transition-all cursor-pointer"
                  >
                    <Bell className="w-3 h-3" />
                    <span>재촉 카톡 복사</span>
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {pendingGroups.map(({ member }) => (
                  <div
                    key={member.id}
                    className="bg-white rounded-xl p-2.5 border border-amber-200/80 shadow-2xs flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 font-extrabold text-xs flex items-center justify-center">
                        {member.name.slice(0, 1)}
                      </span>
                      <div>
                        <span className="text-xs font-extrabold text-stone-900 block">
                          {member.name}
                        </span>
                        <span className="text-[10px] text-amber-700 font-semibold">
                          아직 메뉴 미선택
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => onAddMoreForMember(member.id)}
                        type="button"
                        className="h-7 px-2 bg-amber-100/70 hover:bg-amber-100 text-amber-900 text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        대신 담기
                      </button>
                      <button
                        onClick={() => onToggleMemberPass?.(member.name, true)}
                        type="button"
                        className="h-7 px-2 bg-stone-100 hover:bg-stone-200 text-stone-600 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer"
                        title="오늘 안 마심 처리"
                      >
                        안 마심
                      </button>
                      <button
                        onClick={() => onDeleteMember(member.id)}
                        type="button"
                        className="w-7 h-7 text-stone-400 hover:text-rose-600 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
                        title="삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 2: ORDERED MEMBERS (주문 완료) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-black text-stone-900 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span>주문 완료한 사람 ({orderedGroups.length}명)</span>
              </span>
              <span className="text-xs font-mono font-extrabold text-amber-900">
                {totalQuantity}잔 · {totalAmount.toLocaleString()}원
              </span>
            </div>

            {orderedGroups.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-stone-200 p-6 text-center text-xs text-stone-400">
                아직 주문을 완료한 사람이 없습니다.
                <br />
                동료들에게 링크를 보내거나 메뉴를 담아보세요!
              </div>
            ) : (
              orderedGroups.map(({ member, items: mItems, subtotal, count }) => (
                <div
                  key={member.id}
                  className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs overflow-hidden"
                >
                  {/* Member Title & Subtotal Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-stone-100">
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
                            선택 완료
                          </span>
                        </div>
                        <span className="text-[11px] text-stone-400">
                          총 {count}개 선택
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <span className="text-[10px] text-stone-400 block">소계</span>
                        <span className="text-sm font-black text-amber-800 font-mono tabular-nums">
                          {subtotal.toLocaleString()}원
                        </span>
                      </div>
                      <button
                        onClick={() => onDeleteMember(member.id)}
                        type="button"
                        title="주문자 삭제"
                        className="w-7 h-7 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Items List for this Member */}
                  <div className="divide-y divide-stone-100 py-1">
                    {mItems.map((item) => {
                      const optionDetails = [
                        item.options.temperature,
                        item.options.size?.label,
                        item.options.iceLevel ? `얼음 ${item.options.iceLevel}` : null,
                        item.options.sweetness ? `당도 ${item.options.sweetness}` : null,
                        item.options.extraShots ? `샷 +${item.options.extraShots}` : null,
                        item.options.syrup ? item.options.syrup : null,
                        item.options.whip ? '휘핑크림' : null,
                        item.options.warming ? '데움' : null,
                        item.options.notes ? `요청: ${item.options.notes}` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ');

                      return (
                        <div
                          key={item.id}
                          className="py-2.5 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-stone-900 truncate">
                                {item.menuName}
                              </span>
                              <span className="text-stone-500 font-mono">
                                x{item.quantity}
                              </span>
                            </div>
                            {optionDetails && (
                              <p className="text-[11px] text-stone-500 mt-0.5 truncate">
                                {optionDetails}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-extrabold text-stone-900 font-mono tabular-nums">
                              {item.totalPrice.toLocaleString()}원
                            </span>
                            <button
                              onClick={() => onDeleteItem(item.id)}
                              type="button"
                              className="w-6 h-6 rounded-md text-stone-400 hover:text-rose-600 flex items-center justify-center cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Add more items for this person */}
                  <div className="pt-2 border-t border-stone-100">
                    <button
                      onClick={() => onAddMoreForMember(member.id)}
                      type="button"
                      className="w-full h-8 rounded-xl bg-stone-50 hover:bg-stone-100 text-stone-700 text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{member.name} 메뉴 추가하기</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* SECTION 3: PASSED MEMBERS (안 마심) */}
          {passedGroups.length > 0 && (
            <div className="bg-stone-50 rounded-2xl border border-stone-200 p-3 space-y-2">
              <button
                onClick={() => setShowPassedList(!showPassedList)}
                type="button"
                className="w-full flex items-center justify-between text-xs font-bold text-stone-600 cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  <UserX className="w-4 h-4 text-stone-400" />
                  <span>오늘은 안 마시는 사람 ({passedGroups.length}명)</span>
                </div>
                {showPassedList ? (
                  <ChevronUp className="w-4 h-4 text-stone-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-stone-400" />
                )}
              </button>

              {showPassedList && (
                <div className="pt-2 space-y-1.5 divide-y divide-stone-200/60">
                  {passedGroups.map(({ member }) => (
                    <div
                      key={member.id}
                      className="pt-1.5 flex items-center justify-between text-xs"
                    >
                      <span className="font-semibold text-stone-600 line-through">
                        {member.name}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onToggleMemberPass?.(member.name, false)}
                          type="button"
                          className="h-6 px-2 text-[10px] font-bold bg-white border border-stone-200 text-stone-700 rounded-md hover:bg-stone-100 cursor-pointer"
                        >
                          주문자로 복구
                        </button>
                        <button
                          onClick={() => onDeleteMember(member.id)}
                          type="button"
                          className="w-6 h-6 text-stone-400 hover:text-rose-600 flex items-center justify-center cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Bottom Menu Go Back Button */}
          <button
            onClick={onGoBackToMenu}
            type="button"
            className="w-full h-11 rounded-2xl bg-white border-2 border-dashed border-stone-300 hover:border-stone-400 text-stone-600 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>메뉴 추가하러 가기</span>
          </button>
        </div>
      )}

      {/* Tab 2: Consolidated Kiosk View */}
      {viewTab === 'byDrink' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-stone-100">
            <div>
              <h3 className="text-sm font-extrabold text-stone-900">
                카운터/키오스크 주문용 취합
              </h3>
              <p className="text-[11px] text-stone-400">
                바리스타에게 일괄 주문하기 편하도록 메뉴별로 묶어둔 표입니다.
              </p>
            </div>
            <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/50">
              총 {Object.keys(consolidatedDrinks).length}종
            </span>
          </div>

          <div className="divide-y divide-stone-100">
            {Object.entries(consolidatedDrinks).map(([key, data]) => (
              <div key={key} className="py-3 flex items-start justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-stone-900 text-sm">
                      {data.name}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-black text-xs">
                      {data.quantity}잔
                    </span>
                  </div>

                  {data.options && (
                    <p className="text-[11px] font-bold text-amber-800">
                      {data.options}
                    </p>
                  )}

                  <p className="text-[10px] text-stone-400">
                    주문자: {data.members.join(', ')}
                  </p>
                </div>

                <span className="font-black text-stone-900 font-mono text-sm tabular-nums shrink-0">
                  {data.totalPrice.toLocaleString()}원
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sticky Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-gradient-to-t from-stone-100 via-stone-100/90 to-transparent">
        <div className="max-w-md mx-auto flex gap-2.5">
          <button
            onClick={onGoBackToMenu}
            type="button"
            className="w-1/3 h-13 rounded-2xl bg-white border border-stone-300 text-stone-700 font-bold text-xs flex items-center justify-center gap-1 shadow-xs hover:bg-stone-50 active:scale-[0.98] transition-all cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>메뉴 추가</span>
          </button>

          <button
            onClick={onGoToDutchPay}
            disabled={items.length === 0}
            type="button"
            className="flex-1 h-13 rounded-2xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-all cursor-pointer"
          >
            <span>더치페이 계산하기</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* Batch Add Members Modal */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-stone-900 text-sm">
                    함께 마실 동료 명단 등록
                  </h3>
                  <p className="text-[11px] text-stone-400">
                    주문 대상자를 미리 등록해두세요
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBatchModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleBatchSubmit} className="mt-3.5 space-y-3">
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  동료 이름 입력 (쉼표 또는 줄바꿈으로 구분)
                </label>
                <textarea
                  rows={4}
                  value={batchNamesInput}
                  onChange={(e) => setBatchNamesInput(e.target.value)}
                  placeholder="예: 김팀장, 이과장, 박대리, 최사원&#10;단톡방에서 명단을 복사해 그대로 붙여넣어도 됩니다!"
                  className="w-full p-3 rounded-2xl bg-stone-50 border border-stone-200 text-xs text-stone-800 placeholder:text-stone-400 outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white resize-none"
                  autoFocus
                />
              </div>

              <div className="p-3 bg-amber-50/70 rounded-xl text-[11px] text-amber-900 leading-tight">
                💡 등록된 분들은 <strong>'미주문(대기 중)'</strong>으로 분류되며, 링크를 받아서 음료를 담거나 패스할 때 상태가 실시간으로 바뀝니다!
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsBatchModalOpen(false)}
                  className="flex-1 h-11 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 h-11 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-xs active:scale-98 transition-all cursor-pointer"
                >
                  명단 등록하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
