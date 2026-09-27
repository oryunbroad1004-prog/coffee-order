import React from 'react';
import { ArrowLeft, Coffee, History, RefreshCw } from 'lucide-react';
import { Cafe } from '../types';

interface HeaderProps {
  activeScreen: 'home' | 'menu' | 'summary' | 'dutch' | 'history' | 'complete' | 'shared';
  selectedCafe: Cafe | null;
  itemCount: number;
  onBack: () => void;
  onGoHome: () => void;
  onOpenHistory: () => void;
  onOpenSummary: () => void;
  activeRoomId?: string | null;
}

export const Header: React.FC<HeaderProps> = ({
  activeScreen,
  selectedCafe,
  itemCount,
  onBack,
  onGoHome,
  onOpenHistory,
  onOpenSummary,
  activeRoomId,
}) => {
  const getTitle = () => {
    switch (activeScreen) {
      case 'home':
        return '커피오더';
      case 'menu':
        return selectedCafe ? selectedCafe.name : '메뉴 선택';
      case 'summary':
        return '실시간 주문 취합';
      case 'dutch':
        return '더치페이 계산';
      case 'history':
        return '최근 주문 기록';
      case 'complete':
        return '주문 완료';
      case 'shared':
        return '공유받은 주문서';
      default:
        return '커피오더';
    }
  };

  const showBackButton = activeScreen !== 'home';

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-stone-200">
      <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
        {/* Left Slot: Back or Logo */}
        <div className="flex items-center gap-2">
          {showBackButton ? (
            <button
              onClick={onBack}
              type="button"
              aria-label="뒤로 가기"
              className="w-10 h-10 -ml-2 rounded-xl flex items-center justify-center text-stone-700 hover:bg-stone-100 active:scale-95 transition-transform"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={onGoHome}
              type="button"
              className="flex items-center gap-2 text-stone-900 font-bold tracking-tight"
            >
              <div className="w-8 h-8 rounded-lg bg-stone-900 text-amber-300 flex items-center justify-center shadow-xs">
                <Coffee className="w-4 h-4" />
              </div>
              <span className="text-base font-extrabold tracking-tight">커피오더</span>
            </button>
          )}

          {showBackButton && (
            <span className="text-base font-bold text-stone-900 truncate max-w-[170px]">
              {getTitle()}
            </span>
          )}
        </div>

        {/* Right contextual actions */}
        <div className="flex items-center gap-1.5">
          {/* Live Room Indicator Button (accessible from non-summary screens) */}
          {activeRoomId && activeScreen !== 'summary' && activeScreen !== 'complete' && (
            <button
              onClick={onOpenSummary}
              type="button"
              className="h-8 px-2.5 rounded-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-[11px] font-extrabold flex items-center gap-1.5 shadow-2xs active:scale-95 transition-all cursor-pointer"
              title="실시간 취합 현황 보기"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
              </span>
              <span>취합 현황</span>
            </button>
          )}

          {activeScreen === 'home' && (
            <button
              onClick={onOpenHistory}
              type="button"
              className="h-9 px-3 rounded-lg flex items-center gap-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100 transition-colors"
            >
              <History className="w-4 h-4 text-stone-500" />
              <span>최근 주문</span>
            </button>
          )}

          {activeScreen === 'menu' && (
            <div className="flex items-center gap-1">
              <button
                onClick={onOpenSummary}
                type="button"
                className="relative h-9 px-3 rounded-xl bg-stone-900 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs active:scale-95 transition-transform"
              >
                <span>장바구니</span>
                {itemCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-amber-400 text-stone-950 text-[11px] font-black flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </button>
            </div>
          )}

          {activeScreen === 'summary' && (
            <button
              onClick={onGoHome}
              type="button"
              className="h-9 px-2 text-xs font-medium text-stone-600 hover:text-stone-900 transition-colors flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>처음으로</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
