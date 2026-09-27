import React, { useState, useEffect } from 'react';
import { Cafe, Menu, Order, OrderItem, OrderMember, SelectedOptions, AccountInfo, DutchPayMethod, DutchPaySplitResult, MenuRestriction } from './types';
import { CAFES } from './data/cafes';
import { OrderStorage } from './services/orderStorage';
import {
  fetchSharedOrder,
  fetchLiveRoom,
  addDrinkToLiveRoom,
  deleteDrinkFromLiveRoom,
  registerExpectedMembers,
  markMemberPass,
  formatNudgeKakaoText,
  ShareableOrder,
} from './services/shareService';
import { Header } from './components/Header';
import { CafeSelector } from './components/CafeSelector';
import { MenuCatalog } from './components/MenuCatalog';
import { OptionModal } from './components/OptionModal';
import { OrderSummaryView } from './components/OrderSummaryView';
import { DutchPayView } from './components/DutchPayView';
import { OrderCompleteView } from './components/OrderCompleteView';
import { RecentOrdersView } from './components/RecentOrdersView';
import { SharedOrderView } from './components/SharedOrderView';
import { ShareModal } from './components/ShareModal';
import { Toast } from './components/Toast';
import { AddCustomCafeModal } from './components/AddCustomCafeModal';
import { MenuOcrModal } from './components/MenuOcrModal';
import { AddEditMenuModal } from './components/AddEditMenuModal';
import { CafeChangeDrawer } from './components/CafeChangeDrawer';

type ScreenType = 'home' | 'menu' | 'summary' | 'dutch' | 'history' | 'complete' | 'shared';

export default function App() {
  const [activeScreen, setActiveScreen] = useState<ScreenType>('home');
  const [cafes, setCafes] = useState<Cafe[]>(CAFES);
  const [defaultCafeId, setDefaultCafeId] = useState<string>('starbucks');
  const [selectedCafe, setSelectedCafe] = useState<Cafe | null>(null);
  const [menus, setMenus] = useState<Menu[]>([]);

  // Modals & Drawers
  const [isAddCustomCafeOpen, setIsAddCustomCafeOpen] = useState(false);
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);
  const [isCafeChangeDrawerOpen, setIsCafeChangeDrawerOpen] = useState(false);
  const [addEditMenuTarget, setAddEditMenuTarget] = useState<Menu | null | undefined>(undefined);
  // (undefined means closed, null means add new, Menu object means edit)
  
  // Shared Order State, Live Room & Share Modal
  const [sharedOrderData, setSharedOrderData] = useState<ShareableOrder | null>(null);
  const [shareModalOrder, setShareModalOrder] = useState<ShareableOrder | null>(null);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [menuRestriction, setMenuRestriction] = useState<MenuRestriction | undefined>(undefined);
  const [targetMemberCount, setTargetMemberCount] = useState<number | undefined>(undefined);

  // Order Session State
  const [members, setMembers] = useState<OrderMember[]>([]);
  const [activeMemberId, setActiveMemberId] = useState<string | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);

  // Modal & Toast State
  const [activeMenuForOption, setActiveMenuForOption] = useState<Menu | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [recentOrderCount, setRecentOrderCount] = useState<number>(0);

  // Check URL parameters & hash for shared order link on mount and on hash changes
  useEffect(() => {
    const handleUrlCheck = async () => {
      const searchParams = new URLSearchParams(window.location.search);
      const hash = window.location.hash;
      if (searchParams.has('room') || searchParams.has('share') || hash.includes('order=') || (hash.startsWith('#') && hash.length > 25)) {
        const shared = await fetchSharedOrder(searchParams, hash);
        if (shared) {
          setSharedOrderData(shared);
          if (shared.roomId) {
            setActiveRoomId(shared.roomId);
          }
          setActiveScreen('shared');
          showToast(`'${shared.cafeName}' 실시간 주문방이 연결되었습니다! 🟢`);
        }
      }
    };

    handleUrlCheck();
    window.addEventListener('hashchange', handleUrlCheck);
    return () => window.removeEventListener('hashchange', handleUrlCheck);
  }, []);

  // Initialize cafes, menus & restore active draft on mount
  useEffect(() => {
    const loadedMenus = OrderStorage.getMenus();
    setMenus(loadedMenus);

    const customCafes = OrderStorage.getCustomCafes();
    const mergedCafes = [...CAFES, ...customCafes];
    setCafes(mergedCafes);

    const savedDefaultId = OrderStorage.getDefaultCafeId();
    if (savedDefaultId && mergedCafes.some((c) => c.id === savedDefaultId)) {
      setDefaultCafeId(savedDefaultId);
    } else {
      const preferred = mergedCafes.find((c) => c.id === 'oozy') || mergedCafes[0];
      if (preferred) {
        setDefaultCafeId(preferred.id);
        OrderStorage.setDefaultCafeId(preferred.id);
      }
    }

    // Auto-restore draft if user previously had items, members, or an active room
    const activeDraft = OrderStorage.getActiveDraft();
    if (
      activeDraft &&
      (Boolean(activeDraft.activeRoomId) ||
        (activeDraft.items && activeDraft.items.length > 0) ||
        (activeDraft.members && activeDraft.members.length > 0))
    ) {
      const matchingCafe = mergedCafes.find((c) => c.id === activeDraft.cafeId);
      if (matchingCafe) {
        setSelectedCafe(matchingCafe);
      }
      setMembers(activeDraft.members || []);
      setItems(activeDraft.items || []);
      if (activeDraft.activeMemberId) setActiveMemberId(activeDraft.activeMemberId);
      if (activeDraft.activeRoomId) setActiveRoomId(activeDraft.activeRoomId);
      if (activeDraft.menuRestriction) setMenuRestriction(activeDraft.menuRestriction);
      if (activeDraft.targetMemberCount) setTargetMemberCount(activeDraft.targetMemberCount);
    }

    const orders = OrderStorage.getOrders();
    setRecentOrderCount(orders.length);
  }, []);

  // Auto-save active draft to localStorage whenever cart, room, cafe or members change
  useEffect(() => {
    if (selectedCafe || activeRoomId || items.length > 0 || members.length > 0) {
      OrderStorage.saveActiveDraft({
        cafeId: selectedCafe?.id || '',
        cafeName: selectedCafe?.name || '',
        members,
        items,
        activeMemberId,
        activeRoomId,
        savedAt: Date.now(),
        menuRestriction,
        targetMemberCount,
      });
    }
  }, [items, members, selectedCafe, activeRoomId, activeMemberId, menuRestriction, targetMemberCount]);

  // Live polling effect for active room
  useEffect(() => {
    if (!activeRoomId) return;
    let isCancelled = false;

    const interval = setInterval(async () => {
      if (isCancelled) return;
      try {
        const live = await fetchLiveRoom(activeRoomId);
        if (!live || isCancelled) return;

        setItems((prevItems) => {
          if (live.items.length > prevItems.length) {
            const newItems = live.items.slice(prevItems.length);
            const firstNew = newItems[0];
            const mem = live.members.find((m) => m.id === firstNew.memberId);
            showToast(`🔔 [${mem?.name || '동료'}] 님이 ${firstNew.menuName}을(를) 추가했습니다!`);
            return live.items;
          } else if (live.items.length < prevItems.length) {
            return live.items;
          }
          return prevItems;
        });

        setMembers((prevMembers) => {
          if (live.members.length !== prevMembers.length) {
            return live.members;
          }
          return prevMembers;
        });

        if (live.menuRestriction !== undefined) {
          setMenuRestriction(live.menuRestriction);
        }
        if (live.targetMemberCount !== undefined) {
          setTargetMemberCount(live.targetMemberCount);
        }
      } catch (e) {
        console.warn('Live poll error:', e);
      }
    }, 2500);

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [activeRoomId]);

  // Manual refresh room state
  const handleManualRefresh = async () => {
    if (!activeRoomId) {
      showToast('실시간 주문방이 아직 개설되지 않았습니다. 링크 공유를 눌러 개설하세요.');
      return;
    }
    setIsRefreshing(true);
    try {
      const live = await fetchLiveRoom(activeRoomId);
      if (live) {
        setItems(live.items);
        setMembers(live.members);
        showToast('최신 주문 내역을 동기화했습니다! 🔄');
      }
    } catch {
      showToast('동기화에 실패했습니다.');
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Discard draft completely
  const handleDiscardOrder = () => {
    setItems([]);
    setMembers([]);
    setActiveMemberId(null);
    setActiveRoomId(null);
    setMenuRestriction(undefined);
    setTargetMemberCount(undefined);
    OrderStorage.clearActiveDraft();
    showToast('작성 중이던 주문이 초기화되었습니다.');
  };

  const showToast = (message: string) => {
    setToastMessage(message);
  };

  // Set Default Starting Cafe
  const handleSetDefaultCafe = (cafe: Cafe) => {
    setDefaultCafeId(cafe.id);
    OrderStorage.setDefaultCafeId(cafe.id);
    showToast(`'${cafe.name}'이(가) 첫 주문 기본 카페로 지정되었습니다! ★`);
  };

  // 1. Select Cafe
  const handleSelectCafe = (cafe: Cafe) => {
    setSelectedCafe(cafe);
    setActiveScreen('menu');
  };

  // 2. Add Custom Cafe
  const handleSaveCustomCafe = (newCafe: Cafe) => {
    OrderStorage.saveCustomCafe(newCafe);
    setCafes((prev) => [newCafe, ...prev.filter((c) => c.id !== newCafe.id)]);
    setSelectedCafe(newCafe);
    setIsAddCustomCafeOpen(false);
    setActiveScreen('menu');
    showToast(`'${newCafe.name}' 카페가 등록되었습니다!`);
  };

  const handleDeleteCustomCafe = (cafeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    OrderStorage.deleteCustomCafe(cafeId);
    setCafes((prev) => prev.filter((c) => c.id !== cafeId));
    if (selectedCafe?.id === cafeId) {
      setSelectedCafe(null);
      setActiveScreen('home');
    }
    showToast('카페가 삭제되었습니다.');
  };

  // 3. Save / Update Single Menu
  const handleSaveMenu = (menu: Menu) => {
    OrderStorage.saveMenu(menu);
    setMenus(OrderStorage.getMenus());
  };

  const handleDeleteMenu = (menuId: string) => {
    OrderStorage.deleteMenu(menuId);
    setMenus(OrderStorage.getMenus());
    showToast('메뉴가 삭제되었습니다.');
  };

  // 4. Batch Add from AI OCR
  const handleAddExtractedMenus = (newMenus: Menu[]) => {
    OrderStorage.saveBatchMenus(newMenus);
    setMenus(OrderStorage.getMenus());
  };

  // 5. Add New Member
  const handleAddNewMember = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const existing = members.find((m) => m.name === trimmed);
    if (existing) {
      setActiveMemberId(existing.id);
      showToast(`'${trimmed}' 님이 이미 등록되어 있어 선택되었습니다.`);
      return;
    }
    const newMember: OrderMember = {
      id: `mem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      orderId: '',
      name: trimmed,
    };
    setMembers((prev) => [...prev, newMember]);
    setActiveMemberId(newMember.id);
    showToast(`'${trimmed}' 님이 주문자에 추가되었습니다.`);
  };

  // 6. Add to Cart with Options
  const handleAddToCart = (
    menu: Menu,
    options: SelectedOptions,
    quantity: number,
    memberName: string
  ) => {
    let targetMember = members.find((m) => m.name === memberName);
    let updatedMembers = [...members];

    if (!targetMember) {
      targetMember = {
        id: `mem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        orderId: '',
        name: memberName,
      };
      updatedMembers.push(targetMember);
      setMembers(updatedMembers);
    }

    setActiveMemberId(targetMember.id);

    // Calculate unit price with delta
    const sizeDelta = options.size?.priceDelta || 0;
    const shotDelta = (options.extraShots || 0) * 500;
    const syrupDelta = options.syrup ? 500 : 0;
    const whipDelta = options.whip ? 500 : 0;
    const unitPrice = menu.price + sizeDelta + shotDelta + syrupDelta + whipDelta;
    const totalPrice = unitPrice * quantity;

    const newItem: OrderItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      orderId: '',
      memberId: targetMember.id,
      menuId: menu.id,
      menuName: menu.name,
      options,
      quantity,
      unitPrice,
      totalPrice,
    };

    setItems((prev) => [...prev, newItem]);
    showToast(`[${targetMember.name}] ${menu.name} ${quantity}잔이 담겼습니다.`);

    // If active room is connected, sync to server in background
    if (activeRoomId) {
      addDrinkToLiveRoom(activeRoomId, targetMember.name, newItem).catch((e) =>
        console.warn('Live room sync failed:', e)
      );
    }
  };

  // 7. Cart Item & Member Management
  const handleDeleteItem = (itemId: string) => {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    showToast('메뉴가 장바구니에서 삭제되었습니다.');

    if (activeRoomId) {
      deleteDrinkFromLiveRoom(activeRoomId, itemId).catch((e) =>
        console.warn('Live room delete failed:', e)
      );
    }
  };

  const handleDeleteMember = (memberId: string) => {
    const memberName = members.find((m) => m.id === memberId)?.name;
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
    setItems((prev) => prev.filter((i) => i.memberId !== memberId));
    if (activeMemberId === memberId) {
      const remaining = members.filter((m) => m.id !== memberId);
      setActiveMemberId(remaining[0]?.id || null);
    }
    showToast(`'${memberName}' 님의 주문 내역이 삭제되었습니다.`);
  };

  const handleAddMoreForMember = (memberId: string) => {
    setActiveMemberId(memberId);
    setActiveScreen('menu');
  };

  // 8. Order Completion
  const handleCompleteOrder = (order: Order) => {
    setCompletedOrder(order);
    setActiveScreen('complete');
    setRecentOrderCount(OrderStorage.getOrders().length);
  };

  // 9. Reset & Start Brand New Order
  const handleStartNewOrder = () => {
    setMembers([]);
    setActiveMemberId(null);
    setItems([]);
    setSelectedCafe(null);
    setCompletedOrder(null);
    setSharedOrderData(null);
    setActiveRoomId(null);
    OrderStorage.clearActiveDraft();
    setActiveScreen('home');
    showToast('새로운 주문이 시작되었습니다.');
  };

  // 10. Restore / Re-order Past Session
  const handleRestoreOrder = (pastOrder: Order) => {
    const cafe = cafes.find((c) => c.id === pastOrder.cafeId) || {
      id: pastOrder.cafeId,
      name: pastOrder.cafeName,
      shortName: pastOrder.cafeName.slice(0, 2),
      tagline: '재주문된 카페',
      brandColor: '#006241',
      accentColor: '#1e3932',
      bgLight: '#f2f8f5',
      logoText: pastOrder.cafeName,
      categories: ['커피', '논커피', '티', '에이드 / 주스', '프라푸치노 / 블렌디드', '디저트'],
    };

    setSelectedCafe(cafe);
    setMembers(pastOrder.members);
    setActiveMemberId(pastOrder.members[0]?.id || null);
    setItems(pastOrder.items);
    setActiveScreen('summary');
  };

  // 11. Batch Register Expected Members (동료 명단 등록)
  const handleAddBatchMembers = async (names: string[]) => {
    const newMembers: OrderMember[] = [];
    names.forEach((rawName) => {
      const trimmed = rawName.trim();
      if (!trimmed) return;
      if (!members.some((m) => m.name.toLowerCase() === trimmed.toLowerCase())) {
        newMembers.push({
          id: `mem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          orderId: '',
          name: trimmed,
          status: 'pending',
        });
      }
    });

    if (newMembers.length === 0) {
      showToast('이미 등록된 동료들이거나 유효한 이름이 없습니다.');
      return;
    }

    const updated = [...members, ...newMembers];
    setMembers(updated);
    showToast(`${newMembers.length}명의 동료가 주문 대기 명단에 등록되었습니다! 👥`);

    if (activeRoomId) {
      try {
        await registerExpectedMembers(activeRoomId, newMembers.map((m) => m.name));
      } catch (e) {
        console.warn('Failed to sync members to room:', e);
      }
    }
  };

  // 12. Toggle Member Pass Status ("안 마심" <-> "대기 중")
  const handleToggleMemberPass = async (memberName: string, isPassed: boolean, reason?: string) => {
    setMembers((prev) =>
      prev.map((m) => {
        if (m.name.toLowerCase() === memberName.toLowerCase()) {
          return {
            ...m,
            status: isPassed ? 'passed' : 'pending',
            passReason: isPassed ? (reason || '오늘은 안 마셔요') : undefined,
          };
        }
        return m;
      })
    );

    if (isPassed) {
      showToast(`'${memberName}' 님은 '안 마심(패스)'으로 처리되었습니다.`);
    } else {
      showToast(`'${memberName}' 님이 다시 대기 중으로 복구되었습니다.`);
    }

    if (activeRoomId) {
      try {
        if (isPassed) {
          await markMemberPass(activeRoomId, memberName, reason);
        } else {
          await registerExpectedMembers(activeRoomId, [memberName]);
        }
      } catch (err) {
        console.warn('Failed to sync pass status to room:', err);
      }
    }
  };

  // 13. Nudge Pending Members via Kakao Message
  const handleNudgePending = (pendingNames: string[]) => {
    if (!selectedCafe) return;
    const baseUrl = `${window.location.origin}${window.location.pathname}`;
    const shareUrl = activeRoomId
      ? `${baseUrl}?room=${activeRoomId}`
      : window.location.href;

    const orderedCount = members.filter(
      (m) => items.some((it) => it.memberId === m.id) && m.status !== 'passed'
    ).length;

    const notice = menuRestriction?.enabled
      ? `지정된 메뉴(${menuRestriction.allowedMenuNames?.length || 0}종: 커피, 라떼, 녹차 등) 중에서만 선택 가능`
      : undefined;

    const text = formatNudgeKakaoText(
      selectedCafe.name,
      pendingNames,
      orderedCount,
      shareUrl,
      targetMemberCount,
      notice
    );

    navigator.clipboard.writeText(text);
    showToast('📢 미주문자 재촉 카톡 멘트가 복사되었습니다! 단톡방에 붙여넣으세요.');
  };

  // 14. Open Share Modal for Current In-Progress Order
  const handleOpenShareFromCurrent = (
    accountInfo?: AccountInfo,
    method?: DutchPayMethod,
    splits?: DutchPaySplitResult[]
  ) => {
    if (!selectedCafe) return;
    const totalAmount = items.reduce((sum, it) => sum + it.totalPrice, 0);
    const totalQuantity = items.reduce((sum, it) => sum + it.quantity, 0);
    const currentAccount = accountInfo || OrderStorage.getSavedAccountInfo();

    const payload: ShareableOrder = {
      id: `share-${Date.now()}`,
      roomId: activeRoomId || undefined,
      cafeId: selectedCafe.id,
      cafeName: selectedCafe.name,
      createdAt: new Date().toISOString(),
      totalAmount,
      totalQuantity,
      members,
      items,
      accountInfo: currentAccount.accountNumber ? currentAccount : undefined,
      dutchPay: splits ? { method: method || 'actual', splits } : undefined,
      menuRestriction,
      targetMemberCount,
    };
    setShareModalOrder(payload);
  };

  // 15. Open Share Modal for Completed or Historical Order
  const handleOpenShareFromOrder = (pastOrder: Order) => {
    const payload: ShareableOrder = {
      id: pastOrder.id,
      cafeId: pastOrder.cafeId,
      cafeName: pastOrder.cafeName,
      createdAt: pastOrder.createdAt,
      totalAmount: pastOrder.totalAmount,
      totalQuantity: pastOrder.totalQuantity,
      members: pastOrder.members,
      items: pastOrder.items,
      accountInfo: pastOrder.accountInfo,
      menuRestriction: pastOrder.menuRestriction,
      targetMemberCount: pastOrder.targetMemberCount,
    };
    setShareModalOrder(payload);
  };

  // 16. Join Shared Order (load into active session so user can add drink)
  const handleJoinSharedOrder = (shared: ShareableOrder, preselectedMemberName?: string) => {
    const matchingCafe = cafes.find((c) => c.id === shared.cafeId) || {
      id: shared.cafeId,
      name: shared.cafeName,
      shortName: shared.cafeName.slice(0, 2),
      tagline: '공유된 카페',
      brandColor: '#006241',
      accentColor: '#1e3932',
      bgLight: '#f2f8f5',
      logoText: shared.cafeName,
      categories: ['커피', '논커피', '티', '에이드 / 주스', '프라푸치노 / 블렌디드', '디저트'],
    };

    setSelectedCafe(matchingCafe);
    setMembers(shared.members);
    setItems(shared.items);
    if (shared.roomId) {
      setActiveRoomId(shared.roomId);
    }
    if (shared.menuRestriction) {
      setMenuRestriction(shared.menuRestriction);
    }
    if (shared.targetMemberCount) {
      setTargetMemberCount(shared.targetMemberCount);
    }

    if (preselectedMemberName) {
      const existing = shared.members.find(
        (m) => m.name.toLowerCase() === preselectedMemberName.toLowerCase()
      );
      if (existing) {
        setActiveMemberId(existing.id);
        showToast(`'${existing.name}' 님으로 선택되었습니다. 마실 메뉴를 담아주세요!`);
      } else {
        const newMember: OrderMember = {
          id: `mem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          orderId: '',
          name: preselectedMemberName,
          status: 'ordered',
        };
        setMembers((prev) => [...prev, newMember]);
        setActiveMemberId(newMember.id);
        showToast(`'${preselectedMemberName}' 님이 추가되었습니다. 메뉴를 골라주세요!`);
      }
    } else {
      setActiveMemberId(null);
      showToast(`'${shared.cafeName}' 실시간 주문방에 연결되었습니다! 🟢`);
    }

    setActiveScreen('menu');
  };

  // Navigation Back Handlers
  const handleBack = () => {
    switch (activeScreen) {
      case 'menu':
        setActiveScreen('home');
        break;
      case 'summary':
        setActiveScreen('menu');
        break;
      case 'dutch':
        setActiveScreen('summary');
        break;
      case 'history':
      case 'complete':
      case 'shared':
        setActiveScreen('home');
        break;
      default:
        setActiveScreen('home');
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col justify-start">
      {/* Toast Feedback */}
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />

      {/* Mobile Frame Container */}
      <div className="w-full max-w-md mx-auto min-h-screen bg-white sm:shadow-lg sm:my-3 sm:rounded-3xl sm:overflow-hidden sm:border sm:border-stone-200 flex flex-col relative">
        {/* Top App Bar */}
        <Header
          activeScreen={activeScreen}
          selectedCafe={selectedCafe}
          itemCount={items.reduce((s, i) => s + i.quantity, 0)}
          onBack={handleBack}
          onGoHome={() => setActiveScreen('home')}
          onOpenHistory={() => setActiveScreen('history')}
          onOpenSummary={() => setActiveScreen('summary')}
          activeRoomId={activeRoomId}
        />

        {/* Main View Area */}
        <main className="flex-1 p-4 overflow-y-auto">
          {/* Screen 1: Cafe Selection & Home */}
          {activeScreen === 'home' && (
            <CafeSelector
              cafes={cafes}
              defaultCafe={cafes.find((c) => c.id === defaultCafeId) || cafes[0]}
              onSelectCafe={handleSelectCafe}
              onSetDefaultCafe={handleSetDefaultCafe}
              onOpenHistory={() => setActiveScreen('history')}
              onOpenAddCustomCafe={() => setIsAddCustomCafeOpen(true)}
              onDeleteCustomCafe={handleDeleteCustomCafe}
              recentOrderCount={recentOrderCount}
              activeDraftInfo={
                selectedCafe || activeRoomId || items.length > 0 || members.length > 0
                  ? {
                      cafeName: selectedCafe?.name || '카페 주문',
                      itemCount: items.reduce((s, i) => s + i.quantity, 0),
                      totalAmount: items.reduce((s, i) => s + i.totalPrice, 0),
                      memberCount: members.length,
                      orderedCount: members.filter(
                        (m) => items.some((it) => it.memberId === m.id) && m.status !== 'passed'
                      ).length,
                      pendingCount: members.filter(
                        (m) => !items.some((it) => it.memberId === m.id) && m.status !== 'passed'
                      ).length,
                      passedCount: members.filter((m) => m.status === 'passed').length,
                      roomId: activeRoomId,
                    }
                  : null
              }
              onResumeDraft={() => setActiveScreen('menu')}
              onOpenSummary={() => setActiveScreen('summary')}
              onDiscardDraft={handleDiscardOrder}
            />
          )}

          {/* Screen 2: Menu Catalog */}
          {activeScreen === 'menu' && selectedCafe && (
            <MenuCatalog
              cafe={selectedCafe}
              menus={menus}
              members={members}
              activeMemberId={activeMemberId}
              items={items}
              defaultCafeId={defaultCafeId}
              onSetDefaultCafe={handleSetDefaultCafe}
              onChangeCafe={() => setIsCafeChangeDrawerOpen(true)}
              onSelectMember={(memId) => setActiveMemberId(memId)}
              onAddNewMember={handleAddNewMember}
              onOpenOptionModal={(menu) => setActiveMenuForOption(menu)}
              onOpenSummary={() => setActiveScreen('summary')}
              onOpenOcrModal={() => setIsOcrModalOpen(true)}
              onOpenAddMenuModal={(menu) => setAddEditMenuTarget(menu || null)}
              onDeleteMenu={handleDeleteMenu}
              menuRestriction={menuRestriction}
              onShowToast={showToast}
            />
          )}

          {/* Screen 3: Order Summary & Member List */}
          {activeScreen === 'summary' && selectedCafe && (
            <OrderSummaryView
              cafe={selectedCafe}
              members={members}
              items={items}
              onAddMoreForMember={handleAddMoreForMember}
              onDeleteItem={handleDeleteItem}
              onDeleteMember={handleDeleteMember}
              onGoToDutchPay={() => setActiveScreen('dutch')}
              onGoBackToMenu={() => setActiveScreen('menu')}
              onOpenShareModal={() => handleOpenShareFromCurrent()}
              onShowToast={showToast}
              activeRoomId={activeRoomId}
              onManualRefresh={handleManualRefresh}
              isRefreshing={isRefreshing}
              onAddBatchMembers={handleAddBatchMembers}
              onToggleMemberPass={handleToggleMemberPass}
              onNudgePending={handleNudgePending}
              menuRestriction={menuRestriction}
              targetMemberCount={targetMemberCount}
            />
          )}

          {/* Screen 4: Dutch Pay Split Calculator */}
          {activeScreen === 'dutch' && selectedCafe && (
            <DutchPayView
              cafe={selectedCafe}
              members={members}
              items={items}
              onCompleteOrder={handleCompleteOrder}
              onOpenShareModal={handleOpenShareFromCurrent}
              onShowToast={showToast}
            />
          )}

          {/* Screen 5: Order Completed & Receipt */}
          {activeScreen === 'complete' && completedOrder && (
            <OrderCompleteView
              order={completedOrder}
              onNewOrder={handleStartNewOrder}
              onViewHistory={() => setActiveScreen('history')}
              onOpenShareModal={() => handleOpenShareFromOrder(completedOrder)}
              onShowToast={showToast}
            />
          )}

          {/* Screen 6: Recent Orders History */}
          {activeScreen === 'history' && (
            <RecentOrdersView
              onStartNewOrder={handleStartNewOrder}
              onRestoreOrder={handleRestoreOrder}
              onOpenShareModal={handleOpenShareFromOrder}
              onShowToast={showToast}
            />
          )}

          {/* Screen 7: Shared Order Received View */}
          {activeScreen === 'shared' && sharedOrderData && (
            <SharedOrderView
              order={sharedOrderData}
              matchingCafe={cafes.find((c) => c.id === sharedOrderData.cafeId)}
              onJoinOrder={handleJoinSharedOrder}
              onStartNewOrder={handleStartNewOrder}
              onOpenShareModal={() => setShareModalOrder(sharedOrderData)}
              onShowToast={showToast}
            />
          )}
        </main>

        {/* Share Link Modal */}
        {shareModalOrder && (
          <ShareModal
            order={shareModalOrder}
            members={members}
            menus={menus}
            menuRestriction={menuRestriction}
            onUpdateRestriction={setMenuRestriction}
            targetMemberCount={targetMemberCount}
            onUpdateTargetMemberCount={setTargetMemberCount}
            onAddBatchMembers={handleAddBatchMembers}
            onClose={() => setShareModalOrder(null)}
            onShowToast={showToast}
            onRoomCreated={(roomId) => {
              setActiveRoomId(roomId);
              showToast(`실시간 주문방(#${roomId})이 연결되었습니다! 🟢`);
            }}
          />
        )}

        {/* Option Customization Modal */}
        {activeMenuForOption && (
          <OptionModal
            menu={activeMenuForOption}
            members={members}
            activeMemberId={activeMemberId}
            onClose={() => setActiveMenuForOption(null)}
            onAddToCart={handleAddToCart}
          />
        )}

        {/* Add Custom Cafe Modal */}
        {isAddCustomCafeOpen && (
          <AddCustomCafeModal
            onClose={() => setIsAddCustomCafeOpen(false)}
            onSaveCafe={handleSaveCustomCafe}
            onOpenOcrDirectly={() => setIsOcrModalOpen(true)}
          />
        )}

        {/* AI Menu Photo OCR Modal */}
        {isOcrModalOpen && selectedCafe && (
          <MenuOcrModal
            cafe={selectedCafe}
            onClose={() => setIsOcrModalOpen(false)}
            onAddExtractedMenus={handleAddExtractedMenus}
            onShowToast={showToast}
          />
        )}

        {/* Add/Edit Single Menu Modal */}
        {addEditMenuTarget !== undefined && selectedCafe && (
          <AddEditMenuModal
            cafe={selectedCafe}
            editingMenu={addEditMenuTarget}
            onClose={() => setAddEditMenuTarget(undefined)}
            onSaveMenu={handleSaveMenu}
            onShowToast={showToast}
          />
        )}

        {/* Quick Cafe Switcher Drawer */}
        {isCafeChangeDrawerOpen && selectedCafe && (
          <CafeChangeDrawer
            cafes={cafes}
            currentCafe={selectedCafe}
            defaultCafeId={defaultCafeId}
            onSelectCafe={(cafe) => {
              setSelectedCafe(cafe);
              showToast(`'${cafe.name}' 메뉴로 변경되었습니다.`);
            }}
            onSetDefaultCafe={handleSetDefaultCafe}
            onOpenAddCustomCafe={() => setIsAddCustomCafeOpen(true)}
            onClose={() => setIsCafeChangeDrawerOpen(false)}
          />
        )}
      </div>
    </div>
  );
}
