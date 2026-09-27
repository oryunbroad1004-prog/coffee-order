import React, { useState } from 'react';
import { X, Plus, Check, Coffee } from 'lucide-react';
import { Cafe, CategoryType, Menu, TemperatureOption } from '../types';

interface AddEditMenuModalProps {
  cafe: Cafe;
  editingMenu?: Menu | null;
  onClose: () => void;
  onSaveMenu: (menu: Menu) => void;
  onShowToast: (message: string) => void;
}

export const AddEditMenuModal: React.FC<AddEditMenuModalProps> = ({
  cafe,
  editingMenu,
  onClose,
  onSaveMenu,
  onShowToast,
}) => {
  const [name, setName] = useState(editingMenu?.name || '');
  const [category, setCategory] = useState<CategoryType>(
    editingMenu?.category || '커피'
  );
  const [price, setPrice] = useState<number>(editingMenu?.price || 3000);
  const [description, setDescription] = useState(editingMenu?.description || '');
  const [temperature, setTemperature] = useState<TemperatureOption>(
    editingMenu?.availableOptions.temperature || 'BOTH'
  );
  const [hasExtraShot, setHasExtraShot] = useState(
    editingMenu?.availableOptions.hasExtraShot ?? true
  );
  const [hasIceLevel, setHasIceLevel] = useState(
    editingMenu?.availableOptions.hasIceLevel ?? true
  );
  const [hasSweetness, setHasSweetness] = useState(
    editingMenu?.availableOptions.hasSweetness ?? false
  );
  const [hasWarming, setHasWarming] = useState(
    editingMenu?.availableOptions.hasWarming ?? false
  );
  const [hasLargeSize, setHasLargeSize] = useState(
    editingMenu?.availableOptions.sizes && editingMenu.availableOptions.sizes.length > 1
      ? true
      : true
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newMenu: Menu = {
      id: editingMenu?.id || `menu-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      cafeId: cafe.id,
      category,
      name: name.trim(),
      description: description.trim() || `${cafe.name}의 ${name.trim()}`,
      price: Number(price) || 0,
      availableOptions: {
        temperature,
        defaultTemp: temperature === 'HOT' ? 'HOT' : 'ICE',
        sizes: hasLargeSize
          ? [
              { label: '기본', priceDelta: 0 },
              { label: '사이즈업', priceDelta: 500 },
            ]
          : [{ label: '기본', priceDelta: 0 }],
        hasIceLevel: temperature !== 'HOT' && temperature !== 'NONE' && hasIceLevel,
        hasExtraShot: hasExtraShot,
        hasSweetness: hasSweetness,
        hasSyrup: category === '커피' || category === '논커피',
        hasWarming: hasWarming || category === '디저트',
      },
      isPopular: editingMenu?.isPopular || false,
    };

    onSaveMenu(newMenu);
    onShowToast(`'${newMenu.name}' 메뉴가 저장되었습니다.`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-900/60 backdrop-blur-xs p-0 sm:p-4">
      <div
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200"
        role="dialog"
      >
        {/* Header */}
        <div className="p-4 px-5 border-b border-stone-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center">
              <Coffee className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-stone-900">
                {editingMenu ? '메뉴 정보 수정' : `'${cafe.name}' 메뉴 직접 추가`}
              </h3>
              <p className="text-[11px] text-stone-500">
                원하는 이름과 가격, 옵션을 자유롭게 설정하세요
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 hover:text-stone-900 active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs overflow-y-auto max-h-[80vh]">
          {/* Menu Name */}
          <div>
            <label className="font-bold text-stone-800 block mb-1">
              메뉴 이름 <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="예: 바닐라 콜드브루, 수제 밀크티, 소금빵"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              className="w-full h-10 px-3 bg-stone-50 rounded-xl border border-stone-200 text-stone-900 text-xs focus:outline-hidden focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* Category & Price Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="font-bold text-stone-800 block mb-1">
                카테고리
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as CategoryType)}
                className="w-full h-10 px-2.5 bg-stone-50 rounded-xl border border-stone-200 text-stone-900 text-xs focus:outline-hidden focus:ring-1 focus:ring-amber-500"
              >
                <option value="커피">커피</option>
                <option value="논커피">논커피</option>
                <option value="티">티</option>
                <option value="에이드 / 주스">에이드 / 주스</option>
                <option value="프라푸치노 / 블렌디드">프라푸치노 / 블렌디드</option>
                <option value="디저트">디저트</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-stone-800 block mb-1">
                기본 가격 (원) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="100"
                placeholder="예: 4500"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value) || 0)}
                required
                className="w-full h-10 px-3 bg-stone-50 rounded-xl border border-stone-200 text-stone-900 text-xs font-mono font-bold focus:outline-hidden focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Temperature Option */}
          <div>
            <label className="font-bold text-stone-800 block mb-1">
              음료 온도 설정
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { val: 'BOTH', label: 'HOT/ICE' },
                { val: 'ICE', label: 'ICE 전용' },
                { val: 'HOT', label: 'HOT 전용' },
                { val: 'NONE', label: '디저트' },
              ].map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => setTemperature(opt.val as TemperatureOption)}
                  className={`h-9 rounded-xl border text-[11px] font-bold transition-all ${
                    temperature === opt.val
                      ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                      : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Available Customization Options */}
          <div>
            <label className="font-bold text-stone-800 block mb-1.5">
              주문 시 허용할 옵션들
            </label>
            <div className="grid grid-cols-2 gap-2 bg-stone-50 p-3 rounded-2xl border border-stone-200">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasLargeSize}
                  onChange={(e) => setHasLargeSize(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span className="text-stone-700">사이즈업 (+500원)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasExtraShot}
                  onChange={(e) => setHasExtraShot(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span className="text-stone-700">샷 추가 (+500원)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasIceLevel}
                  onChange={(e) => setHasIceLevel(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span className="text-stone-700">얼음량 조절</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasSweetness}
                  onChange={(e) => setHasSweetness(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span className="text-stone-700">당도 조절 (덜달게)</span>
              </label>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="font-bold text-stone-800 block mb-1">
              메뉴 간단 설명 (선택)
            </label>
            <input
              type="text"
              placeholder="예: 깊고 진한 풍미의 시그니처 블렌드"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full h-10 px-3 bg-stone-50 rounded-xl border border-stone-200 text-stone-900 text-xs focus:outline-hidden focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* Submit CTA */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full h-12 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-all"
            >
              <Check className="w-4 h-4" />
              <span>{editingMenu ? '수정 내용 저장' : '메뉴 추가 완료'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
