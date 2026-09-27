import React, { useState } from 'react';
import { X, Sparkles, Store, Palette, ArrowRight } from 'lucide-react';
import { Cafe, CategoryType } from '../types';

interface AddCustomCafeModalProps {
  onClose: () => void;
  onSaveCafe: (cafe: Cafe) => void;
  onOpenOcrDirectly?: (cafeName: string) => void;
}

const PRESET_COLORS = [
  { brand: '#292524', bg: '#f5f5f4', name: '차콜/스톤' },
  { brand: '#854d0e', bg: '#fefce8', name: '따뜻한 모카' },
  { brand: '#006241', bg: '#f2f8f5', name: '딥 포레스트 그린' },
  { brand: '#b91c1c', bg: '#fef2f2', name: '루비 레드' },
  { brand: '#1e40af', bg: '#eff6ff', name: '사파이어 블루' },
  { brand: '#6b21a8', bg: '#faf5ff', name: '로열 퍼플' },
  { brand: '#ea580c', bg: '#fff7ed', name: '선셋 오렌지' },
];

export const AddCustomCafeModal: React.FC<AddCustomCafeModalProps> = ({
  onClose,
  onSaveCafe,
  onOpenOcrDirectly,
}) => {
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[1]);
  const [startWithPhoto, setStartWithPhoto] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cafeName = name.trim();
    if (!cafeName) return;

    const shortName = cafeName.slice(0, 2);
    const newCafe: Cafe = {
      id: `custom-cafe-${Date.now()}`,
      name: cafeName,
      shortName,
      tagline: tagline.trim() || '우리 동네 단골 카페',
      brandColor: selectedColor.brand,
      accentColor: selectedColor.brand,
      bgLight: selectedColor.bg,
      logoText: cafeName.toUpperCase(),
      categories: ['커피', '논커피', '티', '에이드 / 주스', '프라푸치노 / 블렌디드', '디저트'] as CategoryType[],
      isCustom: true,
    };

    onSaveCafe(newCafe);

    if (startWithPhoto && onOpenOcrDirectly) {
      onOpenOcrDirectly(cafeName);
    }
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
              <Store className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-stone-900">
                나만의 카페 / 동네 카페 추가
              </h3>
              <p className="text-[11px] text-stone-500">
                자주 가는 단골 카페를 등록하고 메뉴를 구성해보세요
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

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Cafe Name */}
          <div>
            <label className="font-bold text-stone-800 block mb-1.5">
              카페 이름 <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="예: 카페 봄날, 앤트러사이트, 회사 앞 카페"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              className="w-full h-11 px-3.5 bg-stone-50 rounded-xl border border-stone-200 text-stone-900 text-xs focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
            />
          </div>

          {/* Tagline / Note */}
          <div>
            <label className="font-bold text-stone-800 block mb-1.5">
              한 줄 소개 (선택)
            </label>
            <input
              type="text"
              placeholder="예: 핸드드립 전문점, 샌드위치가 맛있는 집"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="w-full h-10 px-3.5 bg-stone-50 rounded-xl border border-stone-200 text-stone-900 text-xs focus:outline-hidden focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* Brand Color Theme Selection */}
          <div>
            <label className="font-bold text-stone-800 block mb-1.5 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-stone-500" />
              <span>브랜드 컬러 선택</span>
            </label>
            <div className="flex items-center gap-2 overflow-x-auto py-1 no-scrollbar">
              {PRESET_COLORS.map((c) => {
                const isSelected = selectedColor.brand === c.brand;
                return (
                  <button
                    key={c.brand}
                    type="button"
                    onClick={() => setSelectedColor(c)}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border-2 transition-transform active:scale-95 ${
                      isSelected
                        ? 'border-stone-900 scale-105 shadow-xs'
                        : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c.brand }}
                    title={c.name}
                  >
                    {isSelected && (
                      <div className="w-2.5 h-2.5 rounded-full bg-white shadow-xs" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Option: Start with Menu Board OCR */}
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/80 space-y-2">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={startWithPhoto}
                onChange={(e) => setStartWithPhoto(e.target.checked)}
                className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
              />
              <div>
                <span className="font-bold text-stone-900 block flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                  <span>메뉴판 사진 찍어서 바로 메뉴 등록하기</span>
                </span>
                <p className="text-[11px] text-stone-600 mt-0.5">
                  카페 생성 후 카메라나 앨범의 메뉴판 사진을 올리면 AI가 메뉴와 가격을 1초 만에 자동 추출해 드려요.
                </p>
              </div>
            </label>
          </div>

          {/* Submit CTA */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={!name.trim()}
              className="w-full h-12 rounded-2xl bg-stone-900 hover:bg-stone-800 disabled:opacity-40 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-all"
            >
              <span>카페 생성 완료</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
