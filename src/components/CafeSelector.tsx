import React, { useState } from 'react';
import {
  Coffee,
  ChevronRight,
  History,
  Search,
  Sparkles,
  Plus,
  Store,
  Trash2,
  Star,
} from 'lucide-react';
import { Cafe } from '../types';

interface CafeSelectorProps {
  cafes: Cafe[];
  defaultCafe: Cafe;
  onSelectCafe: (cafe: Cafe) => void;
  onSetDefaultCafe: (cafe: Cafe) => void;
  onOpenHistory: () => void;
  onOpenAddCustomCafe: () => void;
  onDeleteCustomCafe: (cafeId: string, e: React.MouseEvent) => void;
  recentOrderCount: number;
  activeDraftInfo?: {
    cafeName: string;
    itemCount: number;
    totalAmount: number;
    memberCount: number;
    orderedCount?: number;
    pendingCount?: number;
    passedCount?: number;
    roomId?: string | null;
  } | null;
  onResumeDraft?: () => void;
  onOpenSummary?: () => void;
  onDiscardDraft?: () => void;
  onCopyRoomLink?: () => void;
}

export const CafeSelector: React.FC<CafeSelectorProps> = ({
  cafes,
  defaultCafe,
  onSelectCafe,
  onSetDefaultCafe,
  onOpenHistory,
  onOpenAddCustomCafe,
  onDeleteCustomCafe,
  recentOrderCount,
  activeDraftInfo,
  onResumeDraft,
  onOpenSummary,
  onDiscardDraft,
  onCopyRoomLink,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [tabFilter, setTabFilter] = useState<'all' | 'custom' | 'franchise'>('all');

  const safeDefaultCafe = defaultCafe || cafes[0];

  const filteredCafes = cafes.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.shortName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.tagline && c.tagline.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;
    if (tabFilter === 'custom') return Boolean(c.isCustom);
    if (tabFilter === 'franchise') return !c.isCustom;
    return true;
  });

  const customCafeCount = cafes.filter((c) => c.isCustom).length;

  const hasActiveSession = Boolean(
    activeDraftInfo &&
      (activeDraftInfo.itemCount > 0 ||
        activeDraftInfo.roomId ||
        activeDraftInfo.memberCount > 0)
  );

  return (
    <div className="pb-12">
      {/* Active In-Progress Order Resume Banner */}
      {hasActiveSession && activeDraftInfo && (
        <div className="mb-5 p-4 rounded-3xl bg-gradient-to-br from-amber-600 via-amber-700 to-stone-900 text-white shadow-xl border border-amber-400/70 animate-in fade-in duration-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400" />
              </span>
              <span className="text-xs font-black uppercase tracking-wider text-amber-100 flex items-center gap-1.5">
                {activeDraftInfo.roomId ? '🟢 실시간 취합방 진행 중' : '작성 중인 주문이 있습니다'}
                {activeDraftInfo.roomId && (
                  <span className="text-[10px] bg-black/50 text-amber-300 font-mono px-1.5 py-0.5 rounded font-bold">
                    방 #{activeDraftInfo.roomId}
                  </span>
                )}
              </span>
            </div>
            <span className="text-xs font-extrabold bg-stone-950 text-amber-300 px-3 py-1 rounded-full shadow-xs border border-amber-500/30">
              {activeDraftInfo.cafeName}
            </span>
          </div>

          <div className="mb-3 px-0.5">
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-black tracking-tight text-white font-mono">
                총 {activeDraftInfo.itemCount}잔 · {activeDraftInfo.totalAmount.toLocaleString()}원
              </span>
              <span className="text-xs font-bold text-amber-200">
                총 {activeDraftInfo.memberCount}명 참여
              </span>
            </div>

            {/* Sub-breakdown of Ordered vs Pending vs Passed */}
            <div className="flex items-center gap-2 mt-1.5 text-[11px] font-semibold text-amber-100/90">
              <span className="inline-flex items-center gap-1 bg-black/30 px-2 py-0.5 rounded-md">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                주문 완료 {activeDraftInfo.orderedCount ?? (activeDraftInfo.itemCount > 0 ? activeDraftInfo.memberCount : 0)}명
              </span>
              <span className="inline-flex items-center gap-1 bg-black/30 px-2 py-0.5 rounded-md">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                미주문 대기 {activeDraftInfo.pendingCount ?? 0}명
              </span>
              {(activeDraftInfo.passedCount ?? 0) > 0 && (
                <span className="inline-flex items-center gap-1 bg-black/30 px-2 py-0.5 rounded-md text-stone-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
                  패스 {activeDraftInfo.passedCount}명
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onOpenSummary || onResumeDraft}
              type="button"
              className="flex-1 h-11 bg-white hover:bg-amber-50 text-stone-950 font-black text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition-all cursor-pointer"
            >
              <Coffee className="w-4 h-4 text-amber-700" />
              <span>실시간 취합 현황 보기</span>
            </button>
            <button
              onClick={onResumeDraft}
              type="button"
              className="h-11 px-3 bg-stone-900/80 hover:bg-stone-900 text-amber-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1 shadow-2xs active:scale-98 transition-all cursor-pointer"
              title="메뉴 추가하러 가기"
            >
              <span>+ 메뉴 담기</span>
            </button>
            {onDiscardDraft && (
              <button
                onClick={onDiscardDraft}
                type="button"
                className="h-11 px-2.5 bg-black/30 hover:bg-black/50 text-stone-200 font-bold text-xs rounded-xl flex items-center justify-center transition-all cursor-pointer"
                title="기존 주문방 종료하고 새로 시작"
              >
                <span>초기화</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Hero Welcome Card */}
      <div className="mb-6 rounded-3xl bg-gradient-to-br from-stone-900 via-stone-800 to-amber-950 text-white p-6 shadow-md relative overflow-hidden">
        <div className="absolute right-0 bottom-0 opacity-10 translate-x-4 translate-y-4 pointer-events-none">
          <Coffee className="w-40 h-40" />
        </div>
        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 text-amber-200 text-xs font-semibold backdrop-blur-xs mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>단체 커피 주문 총무 도우미</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight leading-snug mb-2">
            누가 뭐 마실지,<br />
            한 번에 취합하고 정산까지!
          </h1>
          <p className="text-stone-300 text-xs leading-relaxed max-w-xs mb-4">
            메뉴 선택부터 1/N 더치페이까지! 메뉴판 사진을 찍으면 AI가 메뉴를 1초 만에 자동 추출해 드려요.
          </p>

          <div className="flex flex-col sm:flex-row gap-2.5">
            {/* Primary Order Start CTA -> Launches Default Cafe */}
            <button
              onClick={() => onSelectCafe(safeDefaultCafe)}
              type="button"
              className="flex-1 h-13 bg-amber-400 hover:bg-amber-300 text-stone-950 font-extrabold rounded-2xl flex items-center justify-center gap-2.5 px-5 shadow-sm text-sm active:scale-[0.98] transition-all cursor-pointer"
            >
              <Coffee className="w-4 h-4 stroke-[2.5]" />
              <span>새 주문 시작하기</span>
            </button>

            {recentOrderCount > 0 && (
              <button
                onClick={onOpenHistory}
                type="button"
                className="h-13 px-4 bg-white/10 hover:bg-white/15 text-white font-semibold rounded-2xl flex items-center justify-center gap-2 backdrop-blur-xs text-xs active:scale-[0.98] transition-all cursor-pointer"
              >
                <History className="w-4 h-4" />
                <span>최근 주문 ({recentOrderCount})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Cafe Selection Section */}
      <div id="cafe-list" className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-base font-extrabold text-stone-900 tracking-tight flex items-center gap-1.5">
              <span>주문할 카페 선택</span>
            </h2>
            <p className="text-[11px] text-stone-500">
              카페를 누르면 바로 메뉴판으로 이동합니다
            </p>
          </div>

          <button
            onClick={onOpenAddCustomCafe}
            type="button"
            className="text-xs font-bold text-amber-900 hover:text-amber-950 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-xl border border-amber-300/80 flex items-center gap-1.5 transition-colors shadow-2xs shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>나만의 카페 등록</span>
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1.5 p-1 bg-stone-200/60 rounded-xl text-xs">
          <button
            type="button"
            onClick={() => setTabFilter('all')}
            className={`flex-1 h-8 rounded-lg font-bold transition-all cursor-pointer ${
              tabFilter === 'all'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            전체 ({cafes.length})
          </button>
          <button
            type="button"
            onClick={() => setTabFilter('franchise')}
            className={`flex-1 h-8 rounded-lg font-bold transition-all cursor-pointer ${
              tabFilter === 'franchise'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            프랜차이즈 ({cafes.length - customCafeCount})
          </button>
          <button
            type="button"
            onClick={() => setTabFilter('custom')}
            className={`flex-1 h-8 rounded-lg font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
              tabFilter === 'custom'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>나만의 카페 ({customCafeCount})</span>
          </button>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="카페 이름 검색 (예: 우지커피, 텐퍼센트, 스타벅스, 동네카페...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-10 pr-4 bg-white rounded-2xl border border-stone-200 text-xs text-stone-800 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 transition-all"
          />
        </div>

        {/* Cafe Grid Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          {filteredCafes.map((cafe) => {
            const isDefault = cafe.id === safeDefaultCafe.id;

            return (
              <div
                key={cafe.id}
                onClick={() => onSelectCafe(cafe)}
                className={`group p-3.5 rounded-2xl border transition-all text-left flex items-center justify-between cursor-pointer relative ${
                  isDefault
                    ? 'bg-amber-50/50 border-amber-300 ring-2 ring-amber-500/20 shadow-xs'
                    : 'bg-white border-stone-200 hover:border-stone-300 hover:shadow-xs'
                }`}
              >
                {/* Clickable Area to Open Cafe */}
                <div className="flex items-center gap-3 min-w-0 pr-2 flex-1 cursor-pointer">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center font-black text-white text-xs tracking-wider shadow-xs shrink-0 group-hover:scale-105 transition-transform"
                    style={{ backgroundColor: cafe.brandColor }}
                  >
                    {cafe.shortName}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-extrabold text-stone-900 truncate">
                        {cafe.name}
                      </span>
                      {isDefault && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-400 text-stone-950 shrink-0 flex items-center gap-0.5">
                          <Star className="w-2.5 h-2.5 fill-stone-950" />
                          <span>기본</span>
                        </span>
                      )}
                      {cafe.isCustom && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-stone-100 text-stone-700 shrink-0">
                          동네카페
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-500 truncate mt-0.5">
                      {cafe.tagline}
                    </p>
                  </div>
                </div>

                {/* Star Default Action & Delete / Arrow */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSetDefaultCafe(cafe);
                    }}
                    title={isDefault ? '현재 첫 주문 기본 카페' : '기본 카페로 설정'}
                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                      isDefault
                        ? 'text-amber-500 bg-amber-100/80 hover:bg-amber-100'
                        : 'text-stone-300 hover:text-amber-500 hover:bg-stone-100'
                    }`}
                  >
                    <Star
                      className={`w-4 h-4 ${
                        isDefault ? 'fill-amber-500 text-amber-500' : 'text-stone-300 hover:text-amber-500'
                      }`}
                    />
                  </button>

                  {cafe.isCustom ? (
                    <button
                      type="button"
                      onClick={(e) => onDeleteCustomCafe(cafe.id, e)}
                      title="카페 삭제"
                      className="w-8 h-8 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <div className="w-6 h-8 flex items-center justify-center text-stone-400 group-hover:text-stone-700 group-hover:translate-x-0.5 transition-all">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {filteredCafes.length === 0 && (
          <div className="py-12 text-center bg-white rounded-2xl border border-dashed border-stone-300 p-6 space-y-2">
            <p className="text-xs text-stone-500 font-medium">검색 결과와 일치하는 카페가 없습니다.</p>
            <button
              onClick={onOpenAddCustomCafe}
              type="button"
              className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 hover:underline cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>'{searchQuery}' 카페로 직접 등록하기</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
