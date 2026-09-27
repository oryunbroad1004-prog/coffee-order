import React, { useState } from 'react';
import {
  X,
  Search,
  ChevronRight,
  Store,
  Plus,
  Check,
  Star,
  Sparkles,
} from 'lucide-react';
import { Cafe } from '../types';

interface CafeChangeDrawerProps {
  cafes: Cafe[];
  currentCafe: Cafe;
  defaultCafeId: string;
  onSelectCafe: (cafe: Cafe) => void;
  onSetDefaultCafe: (cafe: Cafe) => void;
  onOpenAddCustomCafe: () => void;
  onClose: () => void;
}

export const CafeChangeDrawer: React.FC<CafeChangeDrawerProps> = ({
  cafes,
  currentCafe,
  defaultCafeId,
  onSelectCafe,
  onSetDefaultCafe,
  onOpenAddCustomCafe,
  onClose,
}) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'custom' | 'franchise'>('all');

  const filtered = cafes.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.shortName.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (filter === 'custom') return Boolean(c.isCustom);
    if (filter === 'franchise') return !c.isCustom;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-900/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150">
      <div
        className="w-full max-w-md max-h-[88vh] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200"
        role="dialog"
      >
        {/* Drawer Header */}
        <div className="p-4 px-5 border-b border-stone-100 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-base font-black text-stone-900 flex items-center gap-1.5">
              <span>카페 브랜드 변경</span>
            </h3>
            <p className="text-[11px] text-stone-500">
              별표(★)를 누르면 앱 실행 시 첫 기본 카페로 지정됩니다
            </p>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 hover:text-stone-900 active:scale-95 transition-transform"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-4 pb-2 space-y-2.5 shrink-0 border-b border-stone-100 bg-stone-50/50">
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="카페 이름 검색 (스타벅스, 우지커피, 텐퍼센트...)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 bg-white rounded-xl border border-stone-200 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex gap-1 text-[11px]">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  filter === 'all'
                    ? 'bg-stone-900 text-white'
                    : 'bg-white text-stone-600 border border-stone-200'
                }`}
              >
                전체 ({cafes.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('franchise')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  filter === 'franchise'
                    ? 'bg-stone-900 text-white'
                    : 'bg-white text-stone-600 border border-stone-200'
                }`}
              >
                프랜차이즈
              </button>
              <button
                type="button"
                onClick={() => setFilter('custom')}
                className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all ${
                  filter === 'custom'
                    ? 'bg-stone-900 text-white'
                    : 'bg-white text-stone-600 border border-stone-200'
                }`}
              >
                <Store className="w-3 h-3" />
                <span>나만의 카페</span>
              </button>
            </div>

            <button
              onClick={() => {
                onClose();
                onOpenAddCustomCafe();
              }}
              type="button"
              className="text-[11px] font-bold text-amber-800 hover:text-amber-950 flex items-center gap-0.5"
            >
              <Plus className="w-3 h-3 stroke-[2.5]" />
              <span>새 카페 등록</span>
            </button>
          </div>
        </div>

        {/* Scrollable Cafe List */}
        <div className="p-3 overflow-y-auto space-y-1.5 flex-1">
          {filtered.map((cafe) => {
            const isCurrent = cafe.id === currentCafe.id;
            const isDefault = cafe.id === defaultCafeId;

            return (
              <div
                key={cafe.id}
                className={`w-full p-2.5 sm:p-3 rounded-2xl border flex items-center justify-between transition-all ${
                  isCurrent
                    ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-500/20'
                    : 'bg-white border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                }`}
              >
                {/* Clickable Area to Select Cafe */}
                <div
                  onClick={() => {
                    onSelectCafe(cafe);
                    onClose();
                  }}
                  className="flex items-center gap-3 min-w-0 pr-2 flex-1 cursor-pointer"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-xs tracking-wider shrink-0"
                    style={{ backgroundColor: cafe.brandColor }}
                  >
                    {cafe.shortName}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-extrabold text-stone-900 truncate">
                        {cafe.name}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-amber-500 text-stone-950 shrink-0">
                          선택됨
                        </span>
                      )}
                      {isDefault && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-900 shrink-0 flex items-center gap-0.5">
                          <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                          <span>기본</span>
                        </span>
                      )}
                      {cafe.isCustom && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-stone-100 text-stone-700 shrink-0">
                          동네카페
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-stone-500 truncate mt-0.5">
                      {cafe.tagline}
                    </p>
                  </div>
                </div>

                {/* Right Action: Set as Default Star Button */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {isDefault ? (
                    <span
                      className="h-7 px-2 rounded-lg text-[11px] font-bold text-amber-900 bg-amber-100 flex items-center gap-1 border border-amber-300/80 shadow-2xs"
                      title="기본 카페로 설정되어 있습니다"
                    >
                      <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                      <span>기본</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSetDefaultCafe(cafe);
                      }}
                      title="첫 주문 기본 카페로 지정"
                      className="h-7 px-2 rounded-lg text-[11px] font-bold text-stone-500 hover:text-amber-900 bg-stone-100 hover:bg-amber-50 border border-stone-200 hover:border-amber-300 flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                    >
                      <Star className="w-3 h-3 text-stone-400" />
                      <span>기본 설정</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      onSelectCafe(cafe);
                      onClose();
                    }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700"
                  >
                    {isCurrent ? (
                      <Check className="w-4 h-4 text-amber-700 stroke-[3]" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="py-8 text-center text-xs text-stone-400">
              검색 조건과 일치하는 카페가 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
