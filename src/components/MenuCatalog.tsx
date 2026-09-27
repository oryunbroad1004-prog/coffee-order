import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  UserPlus,
  Check,
  ChevronRight,
  Camera,
  Edit3,
  Trash2,
  Sparkles,
  Star,
  Lock,
  Filter,
  Share2,
} from 'lucide-react';
import { Cafe, CategoryType, Menu, MenuRestriction, OrderItem, OrderMember } from '../types';

interface MenuCatalogProps {
  cafe: Cafe;
  menus: Menu[];
  members: OrderMember[];
  activeMemberId: string | null;
  items: OrderItem[];
  defaultCafeId?: string;
  onSetDefaultCafe?: (cafe: Cafe) => void;
  onChangeCafe: () => void;
  onSelectMember: (memberId: string) => void;
  onAddNewMember: (name: string) => void;
  onOpenOptionModal: (menu: Menu) => void;
  onOpenSummary: () => void;
  onOpenShare?: () => void;
  onOpenOcrModal: () => void;
  onOpenAddMenuModal: (menu?: Menu | null) => void;
  onDeleteMenu: (menuId: string) => void;
  menuRestriction?: MenuRestriction;
  onShowToast?: (message: string) => void;
}

export const MenuCatalog: React.FC<MenuCatalogProps> = ({
  cafe,
  menus,
  members,
  activeMemberId,
  items,
  defaultCafeId,
  onSetDefaultCafe,
  onChangeCafe,
  onSelectMember,
  onAddNewMember,
  onOpenOptionModal,
  onOpenSummary,
  onOpenShare,
  onOpenOcrModal,
  onOpenAddMenuModal,
  onDeleteMenu,
  menuRestriction,
  onShowToast,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | '전체'>('전체');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingPerson, setIsAddingPerson] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');
  const [isManageMode, setIsManageMode] = useState(false);
  const [filterOnlyAllowed, setFilterOnlyAllowed] = useState(true);

  // Filter menus belonging to this cafe
  const cafeMenus = useMemo(() => {
    return menus.filter((m) => m.cafeId === cafe.id);
  }, [menus, cafe.id]);

  // Determine if a menu item is allowed under restriction
  const isMenuAllowed = useMemo(() => {
    return (m: Menu): boolean => {
      if (!menuRestriction || !menuRestriction.enabled) return true;

      // 1. By ID
      if (menuRestriction.allowedMenuIds && menuRestriction.allowedMenuIds.length > 0) {
        if (menuRestriction.allowedMenuIds.includes(m.id)) return true;
      }

      // 2. By Name
      if (menuRestriction.allowedMenuNames && menuRestriction.allowedMenuNames.length > 0) {
        const cleanName = m.name.trim().toLowerCase();
        const matched = menuRestriction.allowedMenuNames.some((n) => {
          const target = n.trim().toLowerCase();
          return cleanName.includes(target) || target.includes(cleanName);
        });
        if (matched) return true;
      }

      // 3. By Category
      if (menuRestriction.allowedCategories && menuRestriction.allowedCategories.length > 0) {
        if (menuRestriction.allowedCategories.includes(m.category)) return true;
      }

      // 4. By Max Price
      if (menuRestriction.maxPrice && m.price <= menuRestriction.maxPrice) {
        if (
          (!menuRestriction.allowedMenuIds || menuRestriction.allowedMenuIds.length === 0) &&
          (!menuRestriction.allowedMenuNames || menuRestriction.allowedMenuNames.length === 0)
        ) {
          return true;
        }
      }

      return false;
    };
  }, [menuRestriction]);

  // Categories available for this cafe
  const categories: (CategoryType | '전체')[] = ['전체', ...cafe.categories];

  // Filtered by category, search & restriction
  const filteredMenus = useMemo(() => {
    return cafeMenus.filter((item) => {
      if (menuRestriction?.enabled && filterOnlyAllowed) {
        if (!isMenuAllowed(item)) return false;
      }

      const matchCategory =
        selectedCategory === '전체' || item.category === selectedCategory;
      const matchSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [cafeMenus, selectedCategory, searchQuery, menuRestriction, filterOnlyAllowed, isMenuAllowed]);

  // Count allowed menus in this cafe
  const allowedCount = useMemo(() => {
    if (!menuRestriction?.enabled) return cafeMenus.length;
    return cafeMenus.filter((m) => isMenuAllowed(m)).length;
  }, [cafeMenus, menuRestriction, isMenuAllowed]);

  // Current active member
  const activeMember = members.find((m) => m.id === activeMemberId);

  // Cart summary
  const totalItemCount = items.reduce((sum, it) => sum + it.quantity, 0);
  const totalAmount = items.reduce((sum, it) => sum + it.totalPrice, 0);

  const handleAddPersonSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPersonName.trim()) {
      onAddNewMember(newPersonName.trim());
      setNewPersonName('');
      setIsAddingPerson(false);
    }
  };

  return (
    <div className="pb-32">
      {/* Cafe Header Card */}
      <div className="bg-white rounded-2xl p-3.5 border border-stone-200 mb-3 shadow-xs">
        <div
          onClick={onChangeCafe}
          className="flex items-center justify-between gap-3 cursor-pointer group hover:bg-stone-50/80 -m-1.5 p-1.5 rounded-xl transition-colors"
          title="클릭하여 다른 카페로 변경"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center font-black text-white text-xs tracking-wider shrink-0 shadow-2xs group-hover:scale-105 transition-transform"
              style={{ backgroundColor: cafe.brandColor }}
            >
              {cafe.shortName}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 truncate">
                <h2 className="text-sm font-black text-stone-900 tracking-tight truncate">
                  {cafe.name}
                </h2>
                {cafe.isCustom && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-stone-100 text-stone-700 shrink-0">
                    동네카페
                  </span>
                )}
              </div>
              <p className="text-[11px] text-stone-500 truncate mt-0.5">{cafe.tagline}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {defaultCafeId === cafe.id ? (
              <span
                className="h-8 px-2.5 rounded-xl bg-amber-100 text-amber-900 font-bold text-xs flex items-center gap-1 border border-amber-300/80 shadow-2xs"
                title="현재 첫 주문 기본 카페입니다"
              >
                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                <span>기본</span>
              </span>
            ) : (
              onSetDefaultCafe && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSetDefaultCafe(cafe);
                  }}
                  className="h-8 px-2.5 rounded-xl bg-stone-100 hover:bg-amber-100 text-stone-600 hover:text-amber-900 font-bold text-xs flex items-center gap-1 transition-colors border border-stone-200 hover:border-amber-300 shadow-2xs active:scale-95 cursor-pointer"
                  title="이 카페를 첫 주문 기본 카페로 지정"
                >
                  <Star className="w-3.5 h-3.5 text-stone-400" />
                  <span>기본 설정</span>
                </button>
              )
            )}

            <button
              type="button"
              onClick={onChangeCafe}
              className="h-8 px-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs flex items-center gap-1 border border-amber-200/80 transition-colors shadow-2xs active:scale-95 cursor-pointer"
            >
              <span>카페 변경</span>
              <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* AI Photo OCR & Menu Management Bar */}
        <div className="mt-3 pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              onClick={onOpenOcrModal}
              type="button"
              className="h-8 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-stone-950 font-bold text-xs flex items-center gap-1.5 shadow-xs active:scale-95 transition-all"
            >
              <Camera className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>메뉴판 사진 자동인식</span>
            </button>
            <button
              onClick={() => onOpenAddMenuModal(null)}
              type="button"
              className="h-8 px-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>메뉴 추가</span>
            </button>
          </div>

          <button
            onClick={() => setIsManageMode(!isManageMode)}
            type="button"
            className={`h-7 px-2.5 rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1 ${
              isManageMode
                ? 'bg-stone-900 text-white'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <Edit3 className="w-3 h-3" />
            <span>{isManageMode ? '편집 완료' : '메뉴 수정/삭제'}</span>
          </button>
        </div>
      </div>

      {/* Direct Order Share Link Banner */}
      {onOpenShare && (
        <div className="mb-4 p-3.5 bg-gradient-to-r from-amber-50 via-orange-50/70 to-amber-100/60 rounded-2xl border border-amber-300/90 shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center shrink-0 shadow-2xs">
              <Share2 className="w-4.5 h-4.5 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-amber-950 truncate">
                주문하기 링크 공유 (카톡 단톡방)
              </p>
              <p className="text-[11px] text-amber-800 truncate">
                동료들에게 링크를 보내서 각자 메뉴를 고르게 하세요
              </p>
            </div>
          </div>
          <button
            onClick={onOpenShare}
            type="button"
            className="h-8.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black shrink-0 shadow-xs flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>링크 공유</span>
          </button>
        </div>
      )}

      {/* Member Bar (Who are you ordering for?) */}
        <div className="bg-stone-50 rounded-2xl p-3.5 border border-stone-200/80 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-700">
              {members.length > 0 ? (
                <>
                  현재 선택된 주문자:{' '}
                  <strong className="text-amber-800 font-extrabold">
                    {activeMember ? activeMember.name : '선택 안 됨'}
                  </strong>
                </>
              ) : (
                <span className="text-stone-500">주문자 등록 (선택)</span>
              )}
            </span>
            {!isAddingPerson && (
              <button
                onClick={() => setIsAddingPerson(true)}
                type="button"
                className="text-[11px] font-bold text-amber-700 flex items-center gap-1 hover:underline"
              >
                <UserPlus className="w-3 h-3" />
                <span>+ 사람 추가</span>
              </button>
            )}
          </div>

        {/* Member Selector Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {members.map((member) => {
            const isSelected = member.id === activeMemberId;
            const memberItemCount = items
              .filter((i) => i.memberId === member.id)
              .reduce((sum, i) => sum + i.quantity, 0);

            return (
              <button
                key={member.id}
                onClick={() => onSelectMember(member.id)}
                type="button"
                className={`h-8 px-3 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100'
                }`}
              >
                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                <span>{member.name}</span>
                {memberItemCount > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono tabular-nums ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    {memberItemCount}
                  </span>
                )}
              </button>
            );
          })}

          {members.length === 0 && (
            <span className="text-xs text-stone-400 py-1">
              음료를 담을 때 주문자 이름을 바로 입력할 수 있습니다.
            </span>
          )}
        </div>

        {/* Inline Add Person Input */}
        {isAddingPerson && (
          <form onSubmit={handleAddPersonSubmit} className="mt-2.5 flex gap-2">
            <input
              type="text"
              placeholder="추가할 사람 이름 (예: 민수, 지영)"
              value={newPersonName}
              onChange={(e) => setNewPersonName(e.target.value)}
              autoFocus
              className="flex-1 h-8 px-3 bg-white rounded-lg border border-stone-300 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
            />
            <button
              type="submit"
              className="h-8 px-3 bg-stone-900 text-white text-xs font-bold rounded-lg hover:bg-stone-800"
            >
              추가
            </button>
            <button
              type="button"
              onClick={() => setIsAddingPerson(false)}
              className="h-8 px-2.5 text-stone-500 text-xs hover:text-stone-800"
            >
              취소
            </button>
          </form>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative mb-3">
        <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="메뉴 검색 (예: 아메리카노, 라떼, 케이크...)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-10 pl-10 pr-4 bg-white rounded-xl border border-stone-200 text-xs text-stone-800 placeholder:text-stone-400 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
        />
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar mb-3 py-1">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              type="button"
              className={`h-8 px-3 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
                isSelected
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Menu Restriction Indicator Banner */}
      {menuRestriction?.enabled && (
        <div className="mb-3.5 p-3 rounded-2xl bg-amber-500/10 border border-amber-300 text-amber-950 flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-black text-amber-900 flex items-center gap-1.5">
                  <span>총무님의 메뉴 선택 제한 적용 중</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-200 text-amber-800 font-bold">
                    {allowedCount}종 허용
                  </span>
                </div>
                <p className="text-[11px] text-amber-800 font-medium mt-0.5">
                  {menuRestriction.customNotice || '총무님이 지정한 추천 메뉴 중에서만 주문할 수 있습니다.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setFilterOnlyAllowed(!filterOnlyAllowed)}
              className={`h-7 px-2.5 rounded-lg text-[10px] font-bold border transition-colors flex items-center gap-1 shrink-0 cursor-pointer ${
                filterOnlyAllowed
                  ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                  : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
              }`}
            >
              <Filter className="w-3 h-3" />
              <span>{filterOnlyAllowed ? '허용 메뉴만 보기 ON' : '전체 메뉴 보기'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Menu Item Cards */}
      <div className="space-y-2.5">
        {filteredMenus.map((menu) => {
          const isAllowed = isMenuAllowed(menu);
          const isIceOnly = menu.availableOptions.temperature === 'ICE';
          const isHotOnly = menu.availableOptions.temperature === 'HOT';
          const isBoth = menu.availableOptions.temperature === 'BOTH';

          return (
            <div
              key={menu.id}
              className={`p-3.5 bg-white rounded-2xl border transition-all flex items-center justify-between gap-3 shadow-xs ${
                menuRestriction?.enabled && !isAllowed
                  ? 'opacity-60 border-stone-200 bg-stone-50/70'
                  : 'border-stone-200 hover:border-stone-300'
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs font-bold text-stone-900 truncate">
                    {menu.name}
                  </span>
                  {menuRestriction?.enabled && isAllowed && (
                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100/90 px-1.5 py-0.2 rounded-full flex items-center gap-0.5 shrink-0">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                      주문 가능
                    </span>
                  )}
                  {menuRestriction?.enabled && !isAllowed && (
                    <span className="text-[9px] font-bold text-stone-500 bg-stone-200 px-1.5 py-0.2 rounded-full flex items-center gap-0.5 shrink-0">
                      <Lock className="w-2.5 h-2.5" />
                      제한됨
                    </span>
                  )}
                  {menu.isPopular && (
                    <span className="text-[10px] font-bold text-amber-600 shrink-0">
                      인기
                    </span>
                  )}
                  {isIceOnly && (
                    <span className="text-[10px] font-semibold text-sky-600 shrink-0">
                      ICE전용
                    </span>
                  )}
                  {isHotOnly && (
                    <span className="text-[10px] font-semibold text-rose-600 shrink-0">
                      HOT전용
                    </span>
                  )}
                  {isBoth && (
                    <span className="text-[10px] text-stone-400 shrink-0">
                      HOT/ICE
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-stone-500 line-clamp-1 mb-1">
                  {menu.description}
                </p>

                <p className="text-xs font-black text-stone-900 font-mono tabular-nums">
                  {menu.price.toLocaleString()}원
                </p>
              </div>

              {/* Manage Mode vs Add CTA */}
              {isManageMode ? (
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => onOpenAddMenuModal(menu)}
                    type="button"
                    title="메뉴 수정"
                    className="w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDeleteMenu(menu.id)}
                    type="button"
                    title="메뉴 삭제"
                    className="w-8 h-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    if (menuRestriction?.enabled && !isAllowed) {
                      onShowToast?.(
                        `'${menu.name}'은(는) 이번 주문에서 제외된 메뉴입니다. 총무님이 허용한 메뉴(커피, 라떼, 녹차 등)를 골라주세요!`
                      );
                      return;
                    }
                    onOpenOptionModal(menu);
                  }}
                  type="button"
                  className={`h-10 px-3.5 rounded-xl font-bold text-xs flex items-center gap-1 shrink-0 active:scale-95 transition-all cursor-pointer ${
                    menuRestriction?.enabled && !isAllowed
                      ? 'bg-stone-100 text-stone-400 border border-stone-200'
                      : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80'
                  }`}
                >
                  {menuRestriction?.enabled && !isAllowed ? (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>제한</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>담기</span>
                    </>
                  )}
                </button>
              )}
            </div>
          );
        })}

        {filteredMenus.length === 0 && (
          <div className="py-12 text-center bg-white rounded-2xl border border-dashed border-stone-300 p-6 space-y-3">
            <p className="text-xs text-stone-500">등록된 메뉴가 없거나 검색 조건과 일치하지 않습니다.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
              <button
                onClick={onOpenOcrModal}
                type="button"
                className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs font-bold flex items-center gap-1.5 shadow-xs"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>메뉴판 사진 찍어 자동 등록</span>
              </button>
              <button
                onClick={() => onOpenAddMenuModal(null)}
                type="button"
                className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold"
              >
                직접 메뉴 입력
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Floating Bottom Cart / Share Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-gradient-to-t from-stone-100 via-stone-100/90 to-transparent">
        <div className="max-w-md mx-auto">
          {totalItemCount > 0 ? (
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenSummary}
                type="button"
                className="flex-1 h-13 rounded-2xl bg-stone-900 text-white flex items-center justify-between px-4 shadow-lg shadow-stone-900/20 active:scale-[0.98] transition-transform cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-6 h-6 rounded-full bg-amber-400 text-stone-950 text-xs font-black flex items-center justify-center shrink-0">
                    {totalItemCount}
                  </span>
                  <span className="text-xs font-bold truncate">
                    {members.length}명 참여 · 장바구니
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-1">
                  <span className="text-xs font-black font-mono tabular-nums">
                    {totalAmount.toLocaleString()}원
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
                </div>
              </button>

              {onOpenShare && (
                <button
                  onClick={onOpenShare}
                  type="button"
                  className="h-13 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-extrabold flex items-center gap-1.5 shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all cursor-pointer shrink-0"
                >
                  <Share2 className="w-4 h-4 stroke-[2.5]" />
                  <span>주문하기 링크 공유</span>
                </button>
              )}
            </div>
          ) : (
            onOpenShare && (
              <button
                onClick={onOpenShare}
                type="button"
                className="w-full h-13 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-stone-950 flex items-center justify-between px-5 shadow-lg shadow-amber-500/25 active:scale-[0.98] transition-transform cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-xl bg-stone-950 text-amber-300 flex items-center justify-center shrink-0 shadow-2xs">
                    <Share2 className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-black leading-tight">
                      주문하기 링크 공유
                    </p>
                    <p className="text-[10px] text-amber-950/80 leading-tight">
                      단톡방에 보내서 동료들이 각자 고르게 하기
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs font-black bg-stone-950/10 px-2.5 py-1 rounded-xl">
                  <span>링크 공유</span>
                  <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                </div>
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
};
