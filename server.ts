import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import fs from 'fs';
import path from 'path';

dotenv.config();

const app = express();
const port = 3000;

// Increase JSON payload limit for base64 menu board photos (up to 20MB)
app.use(express.json({ limit: '20mb' }));

// Shared Gemini Client on server-side
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

/**
 * Menu OCR & Extraction Endpoint
 * Takes base64 image data of a cafe menu board and returns structured menu items.
 */
app.post('/api/ocr-menu', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', cafeName = '동네 카페' } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: '메뉴판 이미지 데이터가 필요합니다.' });
    }

    // Strip header prefix if present (e.g., data:image/png;base64,...)
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const prompt = `
당신은 한국 카페 메뉴판 분석 및 데이터 변환 전문가입니다.
첨부된 메뉴판 사진에서 카페 메뉴 이름, 가격(원 단위), 추천 카테고리, 그리고 주문 옵션(HOT/ICE 전용 여부 등)을 정확하게 인식해서 JSON 배열로 추출해주세요.

[규칙]
1. category는 반드시 다음 중 하나여야 합니다:
   - "커피"
   - "논커피"
   - "티"
   - "에이드 / 주스"
   - "프라푸치노 / 블렌디드"
   - "디저트"
2. price는 숫자(원화)여야 합니다. 
   - 예: '3.5' 또는 '3,500'은 3500으로 변환
   - HOT/ICE 가격이 다를 경우 기본(더 낮은) 가격을 적거나 HOT 가격 기준
3. name은 정확한 한국어 메뉴 이름으로 기재
4. temperature는:
   - 일반 커피류(아메리카노, 라떼 등)나 둘 다 가능한 음료: "BOTH"
   - 에이드, 주스, 스무디, 블렌디드, 콜드브루 등 시원한 음료: "ICE"
   - 따뜻한 차류 전용: "HOT"
   - 케이크, 빵, 쿠키 등 디저트/푸드류: "NONE"
5. 메뉴판에서 식별 가능한 모든 메뉴를 최대한 누락 없이 추출하세요.
6. 설명(description)은 메뉴의 간단한 특징(1문장)을 적어주세요.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          inlineData: {
            mimeType: mimeType || 'image/jpeg',
            data: cleanBase64,
          },
        },
        {
          text: prompt,
        },
      ],
      config: {
        systemInstruction: 'You extract cafe menu names, categories, and prices from Korean menu photos into structured JSON.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            cafeNameSuggestion: {
              type: Type.STRING,
              description: '메뉴판 상단이나 로고에서 발견된 카페 이름 (없으면 입력된 기본값)',
            },
            menus: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  category: {
                    type: Type.STRING,
                    description: '커피, 논커피, 티, 에이드 / 주스, 프라푸치노 / 블렌디드, 디저트 중 하나',
                  },
                  price: { type: Type.INTEGER },
                  description: { type: Type.STRING },
                  temperature: {
                    type: Type.STRING,
                    description: 'BOTH, ICE, HOT, NONE 중 하나',
                  },
                  isPopular: { type: Type.BOOLEAN },
                },
                required: ['name', 'category', 'price', 'temperature'],
              },
            },
          },
          required: ['menus'],
        },
      },
    });

    const parsedData = JSON.parse(response.text || '{}');
    return res.json({
      success: true,
      cafeNameSuggestion: parsedData.cafeNameSuggestion || cafeName,
      menus: parsedData.menus || [],
    });
  } catch (error: any) {
    console.error('OCR Menu extraction error:', error);
    return res.status(500).json({
      error: '메뉴판 이미지를 분석하는 중 오류가 발생했습니다.',
      details: error?.message,
    });
  }
});

// Persistent Live Order Rooms & Shared Orders
export interface LiveRoomMember {
  id: string;
  name: string;
  status?: 'ordered' | 'pending' | 'passed';
  passReason?: string;
  updatedAt?: number;
}

export interface LiveRoomMenuRestriction {
  enabled: boolean;
  allowedMenuIds: string[];
  allowedMenuNames: string[];
  allowedCategories?: string[];
  maxPrice?: number;
  customNotice?: string;
}

interface LiveRoom {
  roomId: string;
  cafeId: string;
  cafeName: string;
  title: string;
  createdAt: number;
  lastUpdated: number;
  status: 'open' | 'closed';
  members: LiveRoomMember[];
  items: any[];
  totalQuantity: number;
  totalAmount: number;
  accountInfo?: {
    bank: string;
    accountNumber: string;
    accountHolder: string;
  };
  menuRestriction?: LiveRoomMenuRestriction;
  targetMemberCount?: number;
  viewCount?: number;
}

const ROOMS_FILE = path.join(process.cwd(), 'order_rooms_data.json');
const rooms = new Map<string, LiveRoom>();

function loadRooms() {
  try {
    if (fs.existsSync(ROOMS_FILE)) {
      const content = fs.readFileSync(ROOMS_FILE, 'utf-8');
      const list = JSON.parse(content) as LiveRoom[];
      list.forEach((r) => rooms.set(r.roomId, r));
      console.log(`Loaded ${rooms.size} active order rooms from disk.`);
    }
  } catch (e) {
    console.error('Failed to load rooms from disk:', e);
  }
}
loadRooms();

function saveRooms() {
  try {
    const list = Array.from(rooms.values()).slice(-200);
    fs.writeFileSync(ROOMS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to save rooms to disk:', e);
  }
}

function updateRoomTotals(room: LiveRoom) {
  room.totalQuantity = room.items.reduce((sum, it) => sum + (it.quantity || 1), 0);
  room.totalAmount = room.items.reduce((sum, it) => sum + (it.totalPrice || 0), 0);
  room.lastUpdated = Date.now();
  saveRooms();
}

/**
 * Create or sync a Live Collaborative Room
 */
app.post('/api/rooms', (req, res) => {
  try {
    const {
      roomId: requestedId,
      cafeId,
      cafeName,
      title,
      members = [],
      items = [],
      accountInfo,
      status = 'open',
      menuRestriction,
      targetMemberCount,
    } = req.body;

    if (!cafeId || !cafeName) {
      return res.status(400).json({ error: '카페 정보가 필요합니다.' });
    }

    const roomId = requestedId || Math.random().toString(36).substring(2, 8);
    const existing = rooms.get(roomId);

    const room: LiveRoom = {
      roomId,
      cafeId,
      cafeName,
      title: title || `${cafeName} 실시간 주문방`,
      createdAt: existing ? existing.createdAt : Date.now(),
      lastUpdated: Date.now(),
      status: status || (existing ? existing.status : 'open'),
      members: members.length > 0 ? members : (existing?.members || []),
      items: items.length > 0 ? items : (existing?.items || []),
      totalQuantity: 0,
      totalAmount: 0,
      accountInfo: accountInfo || existing?.accountInfo,
      menuRestriction: menuRestriction !== undefined ? menuRestriction : existing?.menuRestriction,
      targetMemberCount: targetMemberCount !== undefined ? targetMemberCount : existing?.targetMemberCount,
      viewCount: existing?.viewCount || 0,
    };

    updateRoomTotals(room);
    rooms.set(roomId, room);

    return res.json({
      success: true,
      room,
    });
  } catch (err: any) {
    return res.status(500).json({ error: '방 생성 실패', details: err?.message });
  }
});

/**
 * Update Room Settings (Menu restrictions, target member count)
 */
app.post('/api/rooms/:roomId/settings', (req, res) => {
  const { roomId } = req.params;
  const { menuRestriction, targetMemberCount } = req.body;

  const room = rooms.get(roomId);
  if (!room) {
    return res.status(404).json({ error: '주문방을 찾을 수 없습니다.' });
  }

  if (menuRestriction !== undefined) {
    room.menuRestriction = menuRestriction;
  }
  if (targetMemberCount !== undefined) {
    room.targetMemberCount = targetMemberCount;
  }
  room.lastUpdated = Date.now();
  saveRooms();

  return res.json({
    success: true,
    room,
  });
});

/**
 * Get Room State (For polling by organizer & participants)
 */
app.get('/api/rooms/:roomId', (req, res) => {
  const { roomId } = req.params;
  const room = rooms.get(roomId);
  if (!room) {
    return res.status(404).json({ error: '주문방을 찾을 수 없습니다.' });
  }
  return res.json({
    success: true,
    room,
  });
});

/**
 * Record a link view by a participant
 */
app.post('/api/rooms/:roomId/view', (req, res) => {
  const { roomId } = req.params;
  const room = rooms.get(roomId);
  if (!room) {
    return res.status(404).json({ error: '주문방을 찾을 수 없습니다.' });
  }
  room.viewCount = (room.viewCount || 0) + 1;
  saveRooms();
  return res.json({ success: true, viewCount: room.viewCount });
});

/**
 * Add Item to Room (Called by participant on their own device)
 */
app.post('/api/rooms/:roomId/add-item', (req, res) => {
  const { roomId } = req.params;
  const { memberName, item } = req.body;

  const room = rooms.get(roomId);
  if (!room) {
    return res.status(404).json({ error: '주문방을 찾을 수 없습니다.' });
  }

  if (room.status === 'closed') {
    return res.status(400).json({ error: '이미 주문이 마감된 방입니다.' });
  }

  const cleanName = (memberName || '동료').trim();
  let member = room.members.find((m) => m.name === cleanName);
  if (!member) {
    member = {
      id: `mem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: cleanName,
      status: 'ordered',
      updatedAt: Date.now(),
    };
    room.members.push(member);
  } else {
    member.status = 'ordered';
    member.updatedAt = Date.now();
  }

  const newItem = {
    ...item,
    id: item.id || `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    memberId: member.id,
  };

  room.items.push(newItem);
  updateRoomTotals(room);

  return res.json({
    success: true,
    room,
    addedItem: newItem,
    memberName: cleanName,
  });
});

/**
 * Register expected members (Target list of who should order)
 */
app.post('/api/rooms/:roomId/members', (req, res) => {
  const { roomId } = req.params;
  const { names = [] } = req.body; // e.g. ["김대리", "이과장"]

  const room = rooms.get(roomId);
  if (!room) {
    return res.status(404).json({ error: '주문방을 찾을 수 없습니다.' });
  }

  names.forEach((rawName: string) => {
    const name = rawName.trim();
    if (!name) return;
    const existing = room.members.find((m) => m.name === name);
    if (!existing) {
      room.members.push({
        id: `mem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name,
        status: 'pending',
        updatedAt: Date.now(),
      });
    }
  });

  room.lastUpdated = Date.now();
  saveRooms();

  return res.json({
    success: true,
    room,
  });
});

/**
 * Mark a member as passed ("안 마심 / 패스")
 */
app.post('/api/rooms/:roomId/pass', (req, res) => {
  const { roomId } = req.params;
  const { memberName, reason = '오늘은 안 마셔요' } = req.body;

  const room = rooms.get(roomId);
  if (!room) {
    return res.status(404).json({ error: '주문방을 찾을 수 없습니다.' });
  }

  const cleanName = (memberName || '동료').trim();
  let member = room.members.find((m) => m.name === cleanName);
  if (!member) {
    member = {
      id: `mem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: cleanName,
      status: 'passed',
      passReason: reason,
      updatedAt: Date.now(),
    };
    room.members.push(member);
  } else {
    member.status = 'passed';
    member.passReason = reason;
    member.updatedAt = Date.now();
  }

  // If they previously had items in the cart, remove them since they passed
  room.items = room.items.filter((it) => it.memberId !== member.id);
  updateRoomTotals(room);

  return res.json({
    success: true,
    room,
    memberName: cleanName,
  });
});

/**
 * Delete a member from the room
 */
app.delete('/api/rooms/:roomId/members/:memberId', (req, res) => {
  const { roomId, memberId } = req.params;
  const room = rooms.get(roomId);
  if (!room) {
    return res.status(404).json({ error: '주문방을 찾을 수 없습니다.' });
  }

  room.members = room.members.filter((m) => m.id !== memberId);
  room.items = room.items.filter((it) => it.memberId !== memberId);
  updateRoomTotals(room);

  return res.json({
    success: true,
    room,
  });
});

/**
 * Delete Item from Room
 */
app.delete('/api/rooms/:roomId/items/:itemId', (req, res) => {
  const { roomId, itemId } = req.params;
  const room = rooms.get(roomId);
  if (!room) {
    return res.status(404).json({ error: '주문방을 찾을 수 없습니다.' });
  }

  room.items = room.items.filter((it) => it.id !== itemId);
  updateRoomTotals(room);

  return res.json({
    success: true,
    room,
  });
});

/**
 * Close / Reopen Room
 */
app.post('/api/rooms/:roomId/status', (req, res) => {
  const { roomId } = req.params;
  const { status } = req.body;
  const room = rooms.get(roomId);
  if (!room) {
    return res.status(404).json({ error: '주문방을 찾을 수 없습니다.' });
  }

  room.status = status === 'closed' ? 'closed' : 'open';
  room.lastUpdated = Date.now();
  saveRooms();

  return res.json({
    success: true,
    room,
  });
});

// Backward compatibility with legacy /api/orders/share
app.post('/api/orders/share', (req, res) => {
  try {
    const { orderData } = req.body;
    if (!orderData) return res.status(400).json({ error: '주문 데이터 필요' });

    const shareId = Math.random().toString(36).substring(2, 8);
    const room: LiveRoom = {
      roomId: shareId,
      cafeId: orderData.cafeId,
      cafeName: orderData.cafeName,
      title: `${orderData.cafeName} 주문서`,
      createdAt: Date.now(),
      lastUpdated: Date.now(),
      status: 'open',
      members: orderData.members || [],
      items: orderData.items || [],
      totalQuantity: orderData.totalQuantity || 0,
      totalAmount: orderData.totalAmount || 0,
      accountInfo: orderData.accountInfo,
    };
    rooms.set(shareId, room);
    saveRooms();

    return res.json({ success: true, shareId });
  } catch (err: any) {
    return res.status(500).json({ error: '생성 실패', details: err?.message });
  }
});

app.get('/api/orders/share/:shareId', (req, res) => {
  const { shareId } = req.params;
  const room = rooms.get(shareId);
  if (!room) return res.status(404).json({ error: '찾을 수 없음' });
  return res.json({ success: true, data: room });
});

// Vite Middleware Integration
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    app.use(express.static('dist'));
    app.get('*', (_req, res) => {
      res.sendFile('index.html', { root: 'dist' });
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening at http://localhost:${port}`);
  });
}

startServer();
