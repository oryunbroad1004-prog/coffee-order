import React, { useState, useMemo } from 'react';
import {
  Copy,
  Check,
  CreditCard,
  Split,
  UserCheck,
  ChevronDown,
  Info,
  Share2,
} from 'lucide-react';
import { Cafe, Order, OrderItem, OrderMember, DutchPayMethod, AccountInfo, DutchPaySplitResult } from '../types';
import { calculateDutchPay, OrderStorage } from '../services/orderStorage';

interface DutchPayViewProps {
  cafe: Cafe;
  members: OrderMember[];
  items: OrderItem[];
  onCompleteOrder: (order: Order) => void;
  onOpenShareModal: (accountInfo?: AccountInfo, method?: DutchPayMethod, splits?: DutchPaySplitResult[]) => void;
  onShowToast: (message: string) => void;
}

const COMMON_BANKS = [
  '카카오뱅크',
  '토스뱅크',
  'KB국민은행',
  '신한은행',
  '우리은행',
  '하나은행',
  'NH농협',
  'IBK기업',
];

export const DutchPayView: React.FC<DutchPayViewProps> = ({
  cafe,
  members,
  items,
  onCompleteOrder,
  onOpenShareModal,
  onShowToast,
}) => {
  const [method, setMethod] = useState<DutchPayMethod>('actual');
  const [roundingUnit, setRoundingUnit] = useState<1 | 100>(1);

  // Bank Account Info
  const initialAccount = OrderStorage.getSavedAccountInfo();
  const [bank, setBank] = useState(initialAccount.bank || '카카오뱅크');
  const [accountNumber, setAccountNumber] = useState(initialAccount.accountNumber || '');
  const [accountHolder, setAccountHolder] = useState(
    initialAccount.accountHolder || (members[0]?.name ? `${members[0].name}(총무)` : '')
  );
  const [showBankForm, setShowBankForm] = useState(Boolean(initialAccount.accountNumber));
  const [copied, setCopied] = useState(false);

  const totalAmount = items.reduce((sum, it) => sum + it.totalPrice, 0);
  const totalQuantity = items.reduce((sum, it) => sum + it.quantity, 0);

  // Current temporary order object for calculation
  const currentOrder: Order = useMemo(
    () => ({
      id: `order-${Date.now()}`,
      cafeId: cafe.id,
      cafeName: cafe.name,
      createdAt: new Date().toISOString(),
      status: 'in_progress',
      totalAmount,
      totalQuantity,
      members,
      items,
      accountInfo: accountNumber
        ? { bank, accountNumber, accountHolder }
        : undefined,
    }),
    [cafe, totalAmount, totalQuantity, members, items, bank, accountNumber, accountHolder]
  );

  // Calculate Dutch Pay splits
  const splitResults = useMemo(() => {
    return calculateDutchPay(currentOrder, method, roundingUnit);
  }, [currentOrder, method, roundingUnit]);

  // Handle Account info save
  const handleSaveAccount = () => {
    OrderStorage.saveAccountInfo(bank, accountNumber, accountHolder);
  };

  // Copy KakaoTalk Request Text
  const handleCopyKakaoRequest = () => {
    handleSaveAccount();

    let text = `☕ [${cafe.name}] 커피 정산 부탁드려요!\n`;
    text += `총 ${totalQuantity}잔 / 총 ${totalAmount.toLocaleString()}원\n`;
    text += `정산 방식: ${
      method === 'actual' ? '각자 주문한 금액대로' : '1/N 균등 정산'
    }\n\n`;

    text += `[개인별 입금 금액]\n`;
    splitResults.forEach((res) => {
      text += `• ${res.memberName}: ${res.amount.toLocaleString()}원`;
      if (res.isRemainderPayer && method === 'equal') {
        text += ` (차액 부담)`;
      }
      text += `\n`;
    });

    if (accountNumber.trim()) {
      text += `\n입금 계좌: ${bank} ${accountNumber} ${accountHolder}\n`;
    }

    text += `\n모두 맛있게 드세요! 감사합니다 😊`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    onShowToast('정산 요청 메시지가 복사되었습니다! 카카오톡에 붙여넣으세요.');
    setTimeout(() => setCopied(false), 2000);
  };

  // Confirm and complete order
  const handleConfirmOrder = () => {
    handleSaveAccount();
    const completedOrder: Order = {
      ...currentOrder,
      status: 'completed',
    };
    OrderStorage.saveOrder(completedOrder);
    onCompleteOrder(completedOrder);
    onShowToast('주문이 확정되고 최근 주문 기록에 저장되었습니다!');
  };

  return (
    <div className="pb-36 space-y-4">
      {/* Total Overview Card */}
      <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-xs">
        <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
          <span>{cafe.name} 단체 주문</span>
          <span>{members.length}명 참여 · 총 {totalQuantity}잔</span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-bold text-stone-700">총 결제 금액</span>
          <span className="text-2xl font-black text-amber-900 font-mono tabular-nums">
            {totalAmount.toLocaleString()}원
          </span>
        </div>
      </div>

      {/* Dutch Pay Method Switcher */}
      <div className="bg-white rounded-3xl p-4 border border-stone-200 shadow-xs space-y-3">
        <span className="text-xs font-extrabold text-stone-900 block">
          정산 방식 선택
        </span>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMethod('actual')}
            className={`p-3 rounded-2xl border text-left transition-all ${
              method === 'actual'
                ? 'bg-amber-500 text-stone-950 border-amber-600 font-bold shadow-xs'
                : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <UserCheck className="w-4 h-4" />
              <span className="text-xs font-black">각자 주문한 대로</span>
            </div>
            <p className="text-[11px] opacity-80">
              본인이 고른 음료 가격만큼 결제
            </p>
          </button>

          <button
            type="button"
            onClick={() => setMethod('equal')}
            className={`p-3 rounded-2xl border text-left transition-all ${
              method === 'equal'
                ? 'bg-amber-500 text-stone-950 border-amber-600 font-bold shadow-xs'
                : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Split className="w-4 h-4" />
              <span className="text-xs font-black">1/N 균등 나누기</span>
            </div>
            <p className="text-[11px] opacity-80">
              총액을 인원수로 똑같이 분할
            </p>
          </button>
        </div>

        {/* Mode 2 Explanation & Rounding Option */}
        {method === 'equal' && (
          <div className="mt-2 p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs space-y-2">
            <div className="flex items-start gap-1.5 text-stone-600 leading-relaxed">
              <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-stone-800">
                  {totalAmount.toLocaleString()}원 ÷ {members.length}명 = 기본{' '}
                  {Math.floor(totalAmount / members.length).toLocaleString()}원
                </p>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  1원으로 똑 떨어지지 않는 자투리 잔액은 첫 번째 주문자(총무)가 부담하거나 배분됩니다.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-stone-200/60 text-[11px]">
              <span className="font-semibold text-stone-600">계산 단위</span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setRoundingUnit(1)}
                  className={`px-2.5 py-1 rounded-lg font-bold ${
                    roundingUnit === 1
                      ? 'bg-stone-900 text-white'
                      : 'bg-white text-stone-600 border border-stone-200'
                  }`}
                >
                  1원 정밀 계산
                </button>
                <button
                  type="button"
                  onClick={() => setRoundingUnit(100)}
                  className={`px-2.5 py-1 rounded-lg font-bold ${
                    roundingUnit === 100
                      ? 'bg-stone-900 text-white'
                      : 'bg-white text-stone-600 border border-stone-200'
                  }`}
                >
                  100원 단위 절사
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Member Split Amounts List */}
      <div className="bg-white rounded-3xl p-4 border border-stone-200 shadow-xs space-y-2">
        <div className="flex items-center justify-between pb-2 border-b border-stone-100">
          <span className="text-xs font-extrabold text-stone-900">
            사람별 입금해야 할 금액
          </span>
          <span className="text-[11px] text-stone-400">
            총 {members.length}명
          </span>
        </div>

        <div className="divide-y divide-stone-100">
          {splitResults.map((res, index) => (
            <div
              key={res.memberId}
              className="py-3 flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-lg bg-stone-100 text-stone-700 font-extrabold text-xs flex items-center justify-center">
                  {index + 1}
                </span>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-stone-900 text-sm">
                      {res.memberName}
                    </span>
                    {res.isRemainderPayer && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800">
                        차액 부담
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-stone-400 truncate max-w-[180px]">
                    {res.itemsSummary}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-sm font-black text-stone-900 font-mono tabular-nums">
                  {res.amount.toLocaleString()}원
                </span>
                {method === 'equal' && (
                  <span className="text-[10px] text-stone-400 block font-mono">
                    (원래 {res.originalSubtotal.toLocaleString()}원)
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Account Info Accordion (총무 계좌 설정) */}
      <div className="bg-white rounded-3xl p-4 border border-stone-200 shadow-xs space-y-3">
        <button
          type="button"
          onClick={() => setShowBankForm(!showBankForm)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-amber-700" />
            <span className="text-xs font-extrabold text-stone-900">
              총무 계좌번호 입력 (카톡 정산용)
            </span>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-stone-400 transition-transform ${
              showBankForm ? 'rotate-180' : ''
            }`}
          />
        </button>

        {showBankForm && (
          <div className="pt-2 space-y-2.5 text-xs animate-in fade-in duration-150">
            <div>
              <label className="text-[11px] font-semibold text-stone-500 block mb-1">
                은행 선택
              </label>
              <select
                value={bank}
                onChange={(e) => setBank(e.target.value)}
                className="w-full h-9 px-3 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-800 font-medium focus:outline-hidden focus:ring-1 focus:ring-amber-500"
              >
                {COMMON_BANKS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-stone-500 block mb-1">
                  계좌번호
                </label>
                <input
                  type="text"
                  placeholder="예: 3333-01-2345678"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full h-9 px-3 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-800 placeholder:text-stone-400 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-stone-500 block mb-1">
                  예금주
                </label>
                <input
                  type="text"
                  placeholder="예: 홍길동(총무)"
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value)}
                  className="w-full h-9 px-3 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-800 placeholder:text-stone-400 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>
            <p className="text-[10px] text-stone-400">
              * 입력하신 계좌번호는 기기에 안전하게 자동 저장되어 다음 모임에도 그대로 사용됩니다.
            </p>
          </div>
        )}
      </div>

      {/* Floating Bottom Action Buttons */}
      <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-gradient-to-t from-stone-100 via-stone-100/90 to-transparent">
        <div className="max-w-md mx-auto space-y-2">
          {/* Share Link & Kakao Talk Copy Message CTAs */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                handleSaveAccount();
                onOpenShareModal(
                  { bank, accountNumber, accountHolder },
                  method,
                  splitResults
                );
              }}
              type="button"
              className="h-11 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs active:scale-[0.98] transition-all"
            >
              <Share2 className="w-4 h-4" />
              <span>정산 링크 공유</span>
            </button>

            <button
              onClick={handleCopyKakaoRequest}
              type="button"
              className="h-11 rounded-2xl bg-amber-100 hover:bg-amber-200/90 text-amber-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs active:scale-[0.98] transition-all"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-700" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              <span>
                {copied ? '복사 완료!' : '카톡 정산문 복사'}
              </span>
            </button>
          </div>

          {/* Confirm & Complete Order */}
          <button
            onClick={handleConfirmOrder}
            type="button"
            className="w-full h-13 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-stone-900/15 active:scale-[0.98] transition-all"
          >
            <span>주문 확정 및 기록 저장</span>
          </button>
        </div>
      </div>
    </div>
  );
};
