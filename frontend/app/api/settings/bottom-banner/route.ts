import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const dataPath = path.join(process.cwd(), process.cwd().endsWith('frontend') ? 'data/bottom-banner.json' : 'frontend/data/bottom-banner.json');

function getData() {
  try {
    if (!fs.existsSync(dataPath)) {
        // Return default if file doesn't exist
        return [
            { "id": "home", "label": "Главная", "href": "/home", "icon": "home", "enabled": true },
            { "id": "shop", "label": "Каталог", "href": "/shop", "icon": "shop", "enabled": true },
            { "id": "cart", "label": "Корзина", "href": "/cart", "icon": "cart", "enabled": true },
            { "id": "support", "label": "Поддержка", "href": "https://t.me/etra_info", "icon": "support", "enabled": true }
        ];
    }
    const fileContent = fs.readFileSync(dataPath, 'utf8');
    return JSON.parse(fileContent);
  } catch (error) {
    return [];
  }
}

function saveData(data: any[]) {
  // Ensure directory exists
  const dir = path.dirname(dataPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf8');
}

export async function GET() {
  const data = getData();
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  try {
    const newData = await request.json();
    saveData(newData);
    return NextResponse.json(newData);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
