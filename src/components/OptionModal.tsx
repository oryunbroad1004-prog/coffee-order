import React, { useState } from 'react';
import { X, Plus, Minus, Check, User, Flame, Snowflake, Sparkles } from 'lucide-react';
import { Menu, OrderMember, SelectedOptions, SizeOption } from '../types';

interface OptionModalProps {
  menu: Menu;
  members: OrderMember[];
  activeMemberId: string | null;
  onClose: () => void;
  onAddToCart: (
    menu: Menu,
    options: SelectedOptions,
    quantity: number,
    memberName: string
  ) => void;
}

export const OptionModal: React.FC<OptionModalProps> = ({
  menu,
  members,
  activeMemberId,
  onClose,
  onAddToCart,
}) => {
  const { availableOptions } = menu;

  // Selected Member
  const initialMember = members.find((m) => m.id === activeMemberId);
  const [selectedMemberName, setSelectedMemberName] = useState(
    initialMember ? initialMember.name : (members[0]?.name || '')
  );
  const [isNewMemberMode, setIsNewMemberMode] = useState(members.length === 0);
  const [newMemberInput, setNewMemberInput] = useState('');

  // Selected Options
  const [temperature, setTemperature] = useState<'HOT' | 'ICE'>(
    availableOptions.defaultTemp || (availableOptions.temperature === 'HOT' ? 'HOT' : 'ICE')
  );

  const [selectedSize, setSelectedSize] = useState<SizeOption>(
    availableOptions.sizes && availableOptions.sizes.length > 0
      ? availableOptions.sizes[0]
      : { label: '기본', priceDelta: 0 }
  );

  const [sweetness, setSweetness] = useState<string>('기본 (100%)');
  const [iceLevel, setIceLevel] = useState<string>('보통');
  const [extraShots, setExtraShots] = useState<number>(0);
  const [syrup, setSyrup] = useState<string>('없음');
  const [whip, setWhip] = useState<boolean>(false);
  const [warming, setWarming] = useState<boolean>(availableOptions.hasWarming ? true : false);
  const [notes, setNotes] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);

  // Price Calculation
  const sizeDelta = selectedSize?.priceDelta || 0;
  const shotPrice = extraShots * 500;
  const syrupPrice = syrup !== '없음' ? 500 : 0;
  const whipPrice = whip ? 500 : 0;

  const unitPrice = menu.price + sizeDelta + shotPrice + syrupPrice + whipPrice;
  const totalPrice = unitPrice * quantity;

  const handleConfirm = () => {
    let finalMemberName = selectedMemberName.trim();
    if (isNewMemberMode) {
      finalMemberName = newMemberInput.trim();
    }
    if (!finalMemberName) {
      finalMemberName = `주문자 ${members.length + 1}`;
    }

    const options: SelectedOptions = {
      temperature: availableOptions.temperature !== 'NONE' ? temperature : undefined,
      size: availableOptions.sizes ? selectedSize : undefined,
      sweetness: availableOptions.hasSweetness ? sweetness : undefined,
      iceLevel: availableOptions.hasIceLevel && temperature === 'ICE' ? iceLevel : undefined,
      extraShots: availableOptions.hasExtraShot && extraShots > 0 ? extraShots : undefined,
      syrup: availableOptions.hasSyrup && syrup !== '없음' ? syrup : undefined,
      whip: availableOptions.hasWhip ? whip : undefined,
      warming: availableOptions.hasWarming ? warming : undefined,
      notes: notes.trim() || undefined,
    };

    onAddToCart(menu, options, quantity, finalMemberName);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-900/60 backdrop-blur-xs p-0 sm:p-4">
      <div
        className="w-full max-w-md max-h-[90vh] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="p-4 px-5 border-b border-stone-100 flex items-center justify-between shrink-0">
          <div className="min-w-0 pr-4">
            <h3 className="text-base font-extrabold text-stone-900 truncate">
              {menu.name}
            </h3>
            <p className="text-xs font-semibold text-amber-700 font-mono tabular-nums">
              기본 {menu.price.toLocaleString()}원
            </p>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="w-9 h-9 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 hover:text-stone-900 active:scale-95 transition-transform"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-sm">
          {/* Member Selection Section */}
          <div className="bg-amber-50/70 p-3.5 rounded-2xl border border-amber-200/70 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-amber-700" />
                <span>누구의 음료인가요? (주문자)</span>
              </label>
              {members.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsNewMemberMode(!isNewMemberMode)}
                  className="text-[11px] font-semibold text-amber-800 underline decoration-amber-400"
                >
                  {isNewMemberMode ? '기존 주문자 선택' : '+ 새 사람 추가'}
                </button>
              )}
            </div>

            {/* Existing Member Chips */}
            {!isNewMemberMode && members.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {members.map((m) => {
                  const isSelected = selectedMemberName === m.name;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedMemberName(m.name)}
                      className={`h-8 px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                        isSelected
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                      <span>{m.name}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="주문자 이름 입력 (예: 민수, 지영, 팀장님)"
                  value={newMemberInput}
                  onChange={(e) => setNewMemberInput(e.target.value)}
                  autoFocus
                  className="flex-1 h-9 px-3 bg-white rounded-xl border border-stone-300 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
                />
              </div>
            )}
          </div>

          {/* Temperature Options (HOT / ICE) */}
          {availableOptions.temperature === 'BOTH' && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-stone-800">온도 선택</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTemperature('ICE')}
                  className={`h-11 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 border transition-all ${
                    temperature === 'ICE'
                      ? 'bg-sky-50 border-sky-500 text-sky-700 ring-2 ring-sky-500/20'
                      : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  <Snowflake className="w-4 h-4 text-sky-500" />
                  <span>ICE (차갑게)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTemperature('HOT')}
                  className={`h-11 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 border transition-all ${
                    temperature === 'HOT'
                      ? 'bg-rose-50 border-rose-500 text-rose-700 ring-2 ring-rose-500/20'
                      : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  <Flame className="w-4 h-4 text-rose-500" />
                  <span>HOT (따뜻하게)</span>
                </button>
              </div>
            </div>
          )}

          {availableOptions.temperature === 'ICE' && (
            <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-100 flex items-center gap-2 text-xs font-semibold text-sky-800">
              <Snowflake className="w-4 h-4 text-sky-500 shrink-0" />
              <span>이 메뉴는 시원한 ICE 전용 음료입니다.</span>
            </div>
          )}

          {availableOptions.temperature === 'HOT' && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-100 flex items-center gap-2 text-xs font-semibold text-rose-800">
              <Flame className="w-4 h-4 text-rose-500 shrink-0" />
              <span>이 메뉴는 따뜻한 HOT 전용 음료입니다.</span>
            </div>
          )}

          {/* Size Options */}
          {availableOptions.sizes && availableOptions.sizes.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-stone-800">사이즈 선택</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {availableOptions.sizes.map((s) => {
                  const isSelected = selectedSize.label === s.label;
                  return (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => setSelectedSize(s)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-amber-600 bg-amber-50/50 text-stone-900 ring-2 ring-amber-600/20'
                          : 'border-stone-200 bg-stone-50/50 text-stone-600 hover:bg-stone-100'
                      }`}
                    >
                      <div className="text-xs font-bold truncate">{s.label}</div>
                      <div className="text-[11px] text-stone-500 font-mono tabular-nums">
                        {s.priceDelta === 0 ? '기본가' : `+${s.priceDelta.toLocaleString()}원`}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Ice Level (Only if applicable and ICE) */}
          {availableOptions.hasIceLevel && temperature === 'ICE' && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-stone-800">얼음량</span>
              <div className="grid grid-cols-3 gap-2">
                {['보통', '얼음 적게', '얼음 많이'].map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setIceLevel(level)}
                    className={`h-9 rounded-xl border text-xs font-semibold transition-all ${
                      iceLevel === level
                        ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                        : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sweetness */}
          {availableOptions.hasSweetness && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-stone-800">당도 조절</span>
              <div className="grid grid-cols-3 gap-2">
                {['기본 (100%)', '덜 달게 (50%)', '안 달게 (0%)'].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSweetness(s)}
                    className={`h-9 rounded-xl border text-xs font-semibold transition-all ${
                      sweetness === s
                        ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                        : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Extra Shot */}
          {availableOptions.hasExtraShot && (
            <div className="flex items-center justify-between p-3 rounded-2xl bg-stone-50 border border-stone-200">
              <div>
                <p className="text-xs font-bold text-stone-800">샷 추가 (+500원/샷)</p>
                <p className="text-[11px] text-stone-500">진한 커피를 원하시면 추가하세요</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={extraShots <= 0}
                  onClick={() => setExtraShots((prev) => Math.max(0, prev - 1))}
                  className="w-8 h-8 rounded-lg bg-white border border-stone-200 flex items-center justify-center text-stone-700 disabled:opacity-30 active:scale-95"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-6 text-center text-xs font-bold font-mono tabular-nums">
                  {extraShots}
                </span>
                <button
                  type="button"
                  disabled={extraShots >= 5}
                  onClick={() => setExtraShots((prev) => prev + 1)}
                  className="w-8 h-8 rounded-lg bg-white border border-stone-200 flex items-center justify-center text-stone-700 disabled:opacity-30 active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Syrup Customization */}
          {availableOptions.hasSyrup && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-stone-800">시럽 추가 (+500원)</span>
              <div className="grid grid-cols-3 gap-2">
                {['없음', '바닐라 시럽', '헤이즐넛 시럽'].map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setSyrup(item)}
                    className={`h-9 rounded-xl border text-xs font-semibold transition-all ${
                      syrup === item
                        ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                        : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Whip Customization */}
          {availableOptions.hasWhip && (
            <div className="flex items-center justify-between p-3 rounded-2xl bg-stone-50 border border-stone-200">
              <div>
                <p className="text-xs font-bold text-stone-800">휘핑크림 추가 (+500원)</p>
                <p className="text-[11px] text-stone-500">부드럽고 달콤한 생크림</p>
              </div>
              <button
                type="button"
                onClick={() => setWhip(!whip)}
                className={`h-8 px-3 rounded-xl text-xs font-bold transition-all ${
                  whip
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100'
                }`}
              >
                {whip ? '추가됨 (+500원)' : '추가 안 함'}
              </button>
            </div>
          )}

          {/* Warming for Bakeries/Desserts */}
          {availableOptions.hasWarming && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-stone-800">데움 옵션</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setWarming(true)}
                  className={`h-10 rounded-xl border text-xs font-bold transition-all ${
                    warming
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                      : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  따뜻하게 데움
                </button>
                <button
                  type="button"
                  onClick={() => setWarming(false)}
                  className={`h-10 rounded-xl border text-xs font-bold transition-all ${
                    !warming
                      ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                      : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  데우지 않음
                </button>
              </div>
            </div>
          )}

          {/* Custom request memo */}
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-stone-700">기타 요청사항 (선택)</span>
            <input
              type="text"
              placeholder="예: 텀블러 할인, 디카페인 변경, 돔 리드로 주세요 등"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full h-9 px-3 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-800 placeholder:text-stone-400 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* Quantity Stepper */}
          <div className="flex items-center justify-between pt-2 border-t border-stone-100">
            <span className="text-xs font-bold text-stone-800">수량</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={quantity <= 1}
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-9 h-9 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center disabled:opacity-30 active:scale-95 transition-transform"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-8 text-center text-sm font-extrabold font-mono tabular-nums">
                {quantity}
              </span>
              <button
                type="button"
                disabled={quantity >= 20}
                onClick={() => setQuantity((q) => q + 1)}
                className="w-9 h-9 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center disabled:opacity-30 active:scale-95 transition-transform"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Modal Bottom Fixed CTA */}
        <div className="p-4 bg-stone-50 border-t border-stone-200/80 shrink-0">
          <button
            onClick={handleConfirm}
            type="button"
            className="w-full h-12 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm flex items-center justify-between px-5 shadow-sm active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-1.5 truncate">
              <Sparkles className="w-4 h-4 text-stone-900" />
              <span className="truncate">
                [{isNewMemberMode ? (newMemberInput.trim() || '새 주문자') : selectedMemberName}] 주문 담기
              </span>
            </div>
            <span className="text-sm font-black font-mono tabular-nums">
              {totalPrice.toLocaleString()}원
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
