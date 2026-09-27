import React, { useState, useRef } from 'react';
import {
  X,
  Camera,
  Upload,
  Sparkles,
  Loader2,
  Check,
  Plus,
  Trash2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { Cafe, CategoryType, Menu, TemperatureOption } from '../types';

interface MenuOcrModalProps {
  cafe: Cafe;
  onClose: () => void;
  onAddExtractedMenus: (menus: Menu[]) => void;
  onShowToast: (message: string) => void;
}

interface ExtractedItem {
  id: string;
  name: string;
  category: CategoryType;
  price: number;
  description: string;
  temperature: TemperatureOption;
  selected: boolean;
}

export const MenuOcrModal: React.FC<MenuOcrModalProps> = ({
  cafe,
  onClose,
  onAddExtractedMenus,
  onShowToast,
}) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [extractedList, setExtractedList] = useState<ExtractedItem[]>([]);
  const [hasScanned, setHasScanned] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File selection & conversion to Base64
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (max 15MB)
    if (file.size > 15 * 1024 * 1024) {
      onShowToast('사진 용량이 너무 큽니다. 15MB 이하의 사진을 선택해주세요.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setImagePreview(base64);
      analyzeMenuImage(base64, file.type || 'image/jpeg');
    };
    reader.readAsDataURL(file);
  };

  // Call Server-side Gemini API
  const analyzeMenuImage = async (base64Data: string, mimeType: string) => {
    setLoading(true);
    setExtractedList([]);
    try {
      const res = await fetch('/api/ocr-menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Data,
          mimeType,
          cafeName: cafe.name,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || '메뉴판 인식 실패');
      }

      const parsedMenus: ExtractedItem[] = (data.menus || []).map((m: any, idx: number) => ({
        id: `extracted-${Date.now()}-${idx}`,
        name: m.name || '메뉴',
        category: (m.category as CategoryType) || '커피',
        price: Number(m.price) || 3000,
        description: m.description || '',
        temperature: (m.temperature as TemperatureOption) || 'BOTH',
        selected: true,
      }));

      setExtractedList(parsedMenus);
      setHasScanned(true);

      if (parsedMenus.length === 0) {
        onShowToast('메뉴판에서 메뉴를 감지하지 못했습니다. 수동으로 등록하시거나 더 선명한 사진을 찍어주세요.');
      } else {
        onShowToast(`성공! 메뉴판에서 총 ${parsedMenus.length}개의 메뉴를 찾았습니다.`);
      }
    } catch (err: any) {
      console.error(err);
      onShowToast('메뉴판 인식 중 오류가 발생했습니다. 직접 추가하시거나 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  // Toggle selection
  const toggleSelect = (id: string) => {
    setExtractedList((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, selected: !item.selected } : item
      )
    );
  };

  // Update item field
  const updateItemField = (id: string, field: keyof ExtractedItem, value: any) => {
    setExtractedList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  // Remove item
  const removeItem = (id: string) => {
    setExtractedList((prev) => prev.filter((item) => item.id !== id));
  };

  // Confirm and Save
  const handleSaveToCafe = () => {
    const selectedItems = extractedList.filter((it) => it.selected);
    if (selectedItems.length === 0) {
      onShowToast('선택된 메뉴가 없습니다.');
      return;
    }

    const finalMenus: Menu[] = selectedItems.map((item) => ({
      id: `menu-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      cafeId: cafe.id,
      category: item.category,
      name: item.name,
      description: item.description || `${cafe.name}의 ${item.name}`,
      price: item.price,
      availableOptions: {
        temperature: item.temperature,
        defaultTemp: item.temperature === 'HOT' ? 'HOT' : 'ICE',
        sizes: [
          { label: '기본', priceDelta: 0 },
          { label: '사이즈업', priceDelta: 500 },
        ],
        hasIceLevel: item.temperature !== 'HOT' && item.temperature !== 'NONE',
        hasExtraShot: item.category === '커피',
        hasSyrup: item.category === '커피' || item.category === '논커피',
        hasWarming: item.category === '디저트',
      },
      isPopular: false,
    }));

    onAddExtractedMenus(finalMenus);
    onShowToast(`${finalMenus.length}개의 메뉴가 '${cafe.name}'에 등록되었습니다!`);
    onClose();
  };

  const selectedCount = extractedList.filter((it) => it.selected).length;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-900/60 backdrop-blur-xs p-0 sm:p-4">
      <div
        className="w-full max-w-md max-h-[90vh] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200"
        role="dialog"
      >
        {/* Modal Header */}
        <div className="p-4 px-5 border-b border-stone-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-stone-900 flex items-center gap-1.5">
                <span>메뉴판 사진 AI 자동인식</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 font-bold">
                  Gemini OCR
                </span>
              </h3>
              <p className="text-[11px] text-stone-500">
                '{cafe.name}' 메뉴판을 촬영하면 메뉴와 가격을 자동 추출합니다
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

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs">
          {/* Hidden File Input */}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Upload Area */}
          {!imagePreview ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-amber-300 hover:border-amber-500 bg-amber-50/50 rounded-3xl p-8 text-center cursor-pointer transition-colors group space-y-3"
            >
              <div className="w-14 h-14 rounded-2xl bg-amber-400 text-stone-950 flex items-center justify-center mx-auto shadow-xs group-hover:scale-105 transition-transform">
                <Camera className="w-7 h-7" />
              </div>
              <div>
                <p className="font-extrabold text-sm text-stone-900">
                  메뉴판 사진 촬영 또는 앨범 선택
                </p>
                <p className="text-[11px] text-stone-500 mt-1 max-w-xs mx-auto">
                  카페 카운터에 있는 메뉴판, 입간판, 영수증, 또는 키오스크 화면 사진을 찍어주세요.
                </p>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-stone-900 text-white font-bold text-xs shadow-xs"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>사진 업로드하기</span>
              </button>
            </div>
          ) : (
            <div className="relative rounded-2xl overflow-hidden border border-stone-200 bg-stone-950 max-h-44 flex items-center justify-center">
              <img
                src={imagePreview}
                alt="메뉴판 미리보기"
                className="max-h-44 object-contain"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute right-3 bottom-3 px-3 py-1.5 rounded-xl bg-stone-900/80 backdrop-blur-xs text-white text-[11px] font-bold flex items-center gap-1 shadow-md hover:bg-stone-900"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>다시 촬영</span>
              </button>
            </div>
          )}

          {/* Loading Indicator */}
          {loading && (
            <div className="py-8 text-center space-y-2.5">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto animate-spin">
                <Loader2 className="w-5 h-5" />
              </div>
              <p className="font-bold text-xs text-stone-800">
                Gemini AI가 메뉴판의 글자와 가격을 인식하고 있습니다...
              </p>
              <p className="text-[11px] text-stone-500">
                수초 내로 메뉴 목록이 완성됩니다.
              </p>
            </div>
          )}

          {/* Results List */}
          {!loading && hasScanned && extractedList.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-stone-900">
                  인식된 메뉴 ({extractedList.length}개)
                </span>
                <span className="text-[11px] text-stone-500">
                  {selectedCount}개 선택됨 (수정 가능)
                </span>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {extractedList.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-2xl border transition-all space-y-2 ${
                      item.selected
                        ? 'bg-amber-50/40 border-amber-200'
                        : 'bg-stone-50/60 border-stone-200 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={() => toggleSelect(item.id)}
                          className="rounded text-amber-600 focus:ring-amber-500"
                        />
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) =>
                            updateItemField(item.id, 'name', e.target.value)
                          }
                          placeholder="메뉴명"
                          className="flex-1 font-bold text-xs text-stone-900 bg-transparent border-b border-dashed border-stone-300 focus:border-amber-600 focus:outline-hidden py-0.5"
                        />
                      </label>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="flex items-center">
                          <input
                            type="number"
                            value={item.price}
                            onChange={(e) =>
                              updateItemField(
                                item.id,
                                'price',
                                Number(e.target.value) || 0
                              )
                            }
                            className="w-16 text-right font-black font-mono text-xs bg-white px-2 py-1 rounded-lg border border-stone-200 focus:border-amber-600 focus:outline-hidden"
                          />
                          <span className="text-[11px] font-bold text-stone-500 ml-1">
                            원
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="w-6 h-6 rounded-md text-stone-400 hover:text-rose-600 flex items-center justify-center"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Category & Temp Selectors */}
                    <div className="flex items-center gap-2 text-[11px]">
                      <select
                        value={item.category}
                        onChange={(e) =>
                          updateItemField(
                            item.id,
                            'category',
                            e.target.value as CategoryType
                          )
                        }
                        className="bg-white px-2 py-0.5 rounded-lg border border-stone-200 text-stone-700 font-medium"
                      >
                        <option value="커피">커피</option>
                        <option value="논커피">논커피</option>
                        <option value="티">티</option>
                        <option value="에이드 / 주스">에이드 / 주스</option>
                        <option value="프라푸치노 / 블렌디드">프라푸치노 / 블렌디드</option>
                        <option value="디저트">디저트</option>
                      </select>

                      <select
                        value={item.temperature}
                        onChange={(e) =>
                          updateItemField(
                            item.id,
                            'temperature',
                            e.target.value as TemperatureOption
                          )
                        }
                        className="bg-white px-2 py-0.5 rounded-lg border border-stone-200 text-stone-700 font-medium"
                      >
                        <option value="BOTH">HOT / ICE 둘 다</option>
                        <option value="ICE">ICE 전용</option>
                        <option value="HOT">HOT 전용</option>
                        <option value="NONE">디저트/해당없음</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom CTA */}
        {hasScanned && extractedList.length > 0 && (
          <div className="p-4 bg-stone-50 border-t border-stone-200 shrink-0">
            <button
              type="button"
              onClick={handleSaveToCafe}
              disabled={selectedCount === 0}
              className="w-full h-12 rounded-2xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-stone-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] transition-all"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>선택한 {selectedCount}개 메뉴 등록 완료하기</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
