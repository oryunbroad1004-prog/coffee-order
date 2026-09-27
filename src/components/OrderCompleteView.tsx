import React, { useState } from 'react';
import { CheckCircle2, Copy, Check, Plus, History, Share2 } from 'lucide-react';
import { Order } from '../types';

interface OrderCompleteViewProps {
  order: Order;
  onNewOrder: () => void;
  onViewHistory: () => void;
  onOpenShareModal: () => void;
  onShowToast: (message: string) => void;
}

export const OrderCompleteView: React.FC<OrderCompleteViewProps> = ({
  order,
  onNewOrder,
  onViewHistory,
  onOpenShareModal,
  onShowToast,
}) => {
  const [copied, setCopied] = useState(false);

  // Group items by member
  const memberBreakdown = order.members.map((member) => {
    const mItems = order.items.filter((it) => it.memberId === member.id);
    const subtotal = mItems.reduce((sum, it) => sum + it.totalPrice, 0);
    return {
      member,
      items: mItems,
      subtotal,
    };
  });

  const handleCopyReceipt = () => {
    let text = `🧾 [${order.cafeName}] 커피 주문 영수증\n`;
    text += `주문일시: ${new Date(order.createdAt).toLocaleDateString('ko-KR', {
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })}\n`;
    text += `총 주문: ${order.totalQuantity}잔 / ${order.totalAmount.toLocaleString()}원\n\n`;

    memberBreakdown.forEach(({ member, items, subtotal }) => {
      text += `👤 ${member.name} (${subtotal.toLocaleString()}원)\n`;
      items.forEach((it) => {
        text += `  • ${it.menuName} x${it.quantity} (${it.totalPrice.toLocaleString()}원)\n`;
      });
    });

    if (order.accountInfo?.accountNumber) {
      text += `\n입금 계좌: ${order.accountInfo.bank} ${order.accountInfo.accountNumber} ${order.accountInfo.accountHolder}\n`;
    }

    navigator.clipboard.writeText(text);
    setCopied(true);
    onShowToast('영수증이 클립보드에 복사되었습니다!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="pb-16 space-y-4">
      {/* Completion Hero Banner */}
      <div className="bg-emerald-600 rounded-3xl p-6 text-white text-center shadow-md relative overflow-hidden">
        <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-xs">
          <CheckCircle2 className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-xl font-black tracking-tight mb-1">
          주문이 성공적으로 완료되었습니다!
        </h2>
        <p className="text-emerald-100 text-xs">
          주문 기록이 최근 주문에 안전하게 보관되었습니다.
        </p>
      </div>

      {/* Receipt Card */}
      <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-xs space-y-4">
        {/* Receipt Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div>
            <span className="text-[11px] font-bold text-amber-700 block">
              {order.cafeName}
            </span>
            <span className="text-xs text-stone-400">
              {new Date(order.createdAt).toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onOpenShareModal}
              type="button"
              className="h-8 px-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-colors active:scale-95"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>링크 공유</span>
            </button>

            <button
              onClick={handleCopyReceipt}
              type="button"
              className="h-8 px-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '복사됨' : '영수증 복사'}</span>
            </button>
          </div>
        </div>

        {/* Totals */}
        <div className="grid grid-cols-2 gap-3 p-3 bg-stone-50 rounded-2xl">
          <div>
            <span className="text-[11px] text-stone-500 block">총 주문 수량</span>
            <span className="text-base font-black text-stone-900 font-mono">
              {order.totalQuantity}잔
            </span>
          </div>
          <div>
            <span className="text-[11px] text-stone-500 block">총 결제 금액</span>
            <span className="text-base font-black text-amber-800 font-mono tabular-nums">
              {order.totalAmount.toLocaleString()}원
            </span>
          </div>
        </div>

        {/* Member Breakdown */}
        <div className="space-y-3 pt-1">
          <span className="text-xs font-extrabold text-stone-900 block">
            사람별 주문 및 결제 내역
          </span>

          <div className="divide-y divide-stone-100">
            {memberBreakdown.map(({ member, items, subtotal }) => (
              <div key={member.id} className="py-2.5 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-stone-900">
                    {member.name}
                  </span>
                  <span className="font-black text-stone-900 font-mono tabular-nums">
                    {subtotal.toLocaleString()}원
                  </span>
                </div>
                <div className="space-y-0.5 text-[11px] text-stone-500 pl-2 border-l-2 border-stone-200">
                  {items.map((it) => (
                    <div key={it.id} className="flex justify-between">
                      <span className="truncate">
                        • {it.menuName} ({it.options.temperature || ''} {it.options.size?.label || ''}) x{it.quantity}
                      </span>
                      <span className="font-mono tabular-nums shrink-0 ml-2">
                        {it.totalPrice.toLocaleString()}원
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Account Info if entered */}
        {order.accountInfo?.accountNumber && (
          <div className="p-3 bg-amber-50/60 rounded-2xl border border-amber-200/50 text-xs">
            <span className="font-bold text-stone-700 block mb-0.5">입금 계좌</span>
            <p className="font-mono text-stone-900 font-semibold">
              {order.accountInfo.bank} {order.accountInfo.accountNumber} ({order.accountInfo.accountHolder})
            </p>
          </div>
        )}
      </div>

      {/* Next Actions */}
      <div className="space-y-2 pt-2">
        <button
          onClick={onNewOrder}
          type="button"
          className="w-full h-13 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-all"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>새로운 주문 시작하기</span>
        </button>

        <button
          onClick={onViewHistory}
          type="button"
          className="w-full h-12 rounded-2xl bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
        >
          <History className="w-4 h-4 text-stone-500" />
          <span>최근 주문 목록 보기</span>
        </button>
      </div>
    </div>
  );
};
