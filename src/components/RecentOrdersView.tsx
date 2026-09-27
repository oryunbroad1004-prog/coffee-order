import React, { useState } from 'react';
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Trash2,
  Coffee,
  Plus,
  Share2,
} from 'lucide-react';
import { Order } from '../types';
import { OrderStorage } from '../services/orderStorage';

interface RecentOrdersViewProps {
  onStartNewOrder: () => void;
  onRestoreOrder: (order: Order) => void;
  onOpenShareModal: (order: Order) => void;
  onShowToast: (message: string) => void;
}

export const RecentOrdersView: React.FC<RecentOrdersViewProps> = ({
  onStartNewOrder,
  onRestoreOrder,
  onOpenShareModal,
  onShowToast,
}) => {
  const [orders, setOrders] = useState<Order[]>(() => OrderStorage.getOrders());
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(
    orders[0]?.id || null
  );

  const handleDelete = (orderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    OrderStorage.deleteOrder(orderId);
    setOrders(OrderStorage.getOrders());
    onShowToast('주문 기록이 삭제되었습니다.');
  };

  const handleRestore = (order: Order) => {
    onRestoreOrder(order);
    onShowToast(`'${order.cafeName}' 주문 내역을 장바구니로 다시 불러왔습니다.`);
  };

  return (
    <div className="pb-24 space-y-4">
      {/* Header Info */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-base font-extrabold text-stone-900 tracking-tight">
            최근 주문 내역
          </h2>
          <p className="text-xs text-stone-500">
            지난 모임에서 주문했던 기록을 확인하고 재주문할 수 있습니다
          </p>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {orders.map((order) => {
          const isExpanded = expandedOrderId === order.id;

          return (
            <div
              key={order.id}
              className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs transition-all"
            >
              {/* Order Card Summary Header */}
              <div
                onClick={() =>
                  setExpandedOrderId(isExpanded ? null : order.id)
                }
                className="p-4 cursor-pointer hover:bg-stone-50/70 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center shrink-0">
                    <Coffee className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-extrabold text-stone-900">
                        {order.cafeName}
                      </span>
                      <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-stone-100 text-stone-600 font-medium">
                        {order.members.length}명 · {order.totalQuantity}잔
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-stone-400 mt-0.5">
                      <Calendar className="w-3 h-3" />
                      <span>
                        {new Date(order.createdAt).toLocaleDateString('ko-KR', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-black text-stone-900 font-mono tabular-nums">
                    {order.totalAmount.toLocaleString()}원
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-stone-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-stone-400" />
                  )}
                </div>
              </div>

              {/* Expanded Breakdown */}
              {isExpanded && (
                <div className="p-4 pt-1 border-t border-stone-100 bg-stone-50/50 space-y-3">
                  <div className="space-y-2 text-xs divide-y divide-stone-200/60">
                    {order.members.map((member) => {
                      const memberItems = order.items.filter(
                        (i) => i.memberId === member.id
                      );
                      const subtotal = memberItems.reduce(
                        (sum, i) => sum + i.totalPrice,
                        0
                      );

                      return (
                        <div key={member.id} className="pt-2 first:pt-0">
                          <div className="flex justify-between font-bold text-stone-800 mb-1">
                            <span>{member.name}</span>
                            <span className="font-mono tabular-nums">
                              {subtotal.toLocaleString()}원
                            </span>
                          </div>
                          <ul className="text-[11px] text-stone-500 space-y-0.5 pl-2">
                            {memberItems.map((item) => (
                              <li key={item.id} className="flex justify-between">
                                <span>
                                  • {item.menuName} ({item.options.temperature || ''}) x{item.quantity}
                                </span>
                                <span className="font-mono">
                                  {item.totalPrice.toLocaleString()}원
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>

                  {/* Actions for this past order */}
                  <div className="flex items-center gap-2 pt-2 border-t border-stone-200/60">
                    <button
                      onClick={() => handleRestore(order)}
                      type="button"
                      className="flex-1 h-9 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>이 주문 다시 담기</span>
                    </button>
                    <button
                      onClick={() => onOpenShareModal(order)}
                      type="button"
                      title="링크 공유"
                      className="h-9 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs flex items-center justify-center gap-1 transition-colors active:scale-95"
                    >
                      <Share2 className="w-3.5 h-3.5 text-amber-700" />
                      <span>링크</span>
                    </button>
                    <button
                      onClick={(e) => handleDelete(order.id, e)}
                      type="button"
                      title="기록 삭제"
                      className="w-9 h-9 rounded-xl bg-white border border-stone-200 text-stone-400 hover:text-rose-600 flex items-center justify-center transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {orders.length === 0 && (
          <div className="py-14 text-center bg-white rounded-3xl border border-dashed border-stone-200 p-6 space-y-3">
            <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mx-auto text-stone-400">
              <Coffee className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-stone-700">
                아직 저장된 주문 기록이 없습니다.
              </p>
              <p className="text-xs text-stone-400 mt-1">
                새 주문을 진행하면 여기에 최근 기록이 자동으로 보관됩니다.
              </p>
            </div>
            <button
              onClick={onStartNewOrder}
              type="button"
              className="px-4 py-2 bg-stone-900 text-white text-xs font-bold rounded-xl hover:bg-stone-800"
            >
              첫 주문 시작하기
            </button>
          </div>
        )}
      </div>

      {/* Floating CTA if orders exist */}
      {orders.length > 0 && (
        <div className="pt-2">
          <button
            onClick={onStartNewOrder}
            type="button"
            className="w-full h-12 rounded-2xl bg-stone-900 text-white text-xs font-bold flex items-center justify-center gap-2 hover:bg-stone-800 active:scale-[0.98] transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>새 주문 시작하기</span>
          </button>
        </div>
      )}
    </div>
  );
};
