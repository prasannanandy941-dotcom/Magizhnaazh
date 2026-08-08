import { CanvasElement, Invitation } from '../shared-types';

export interface CanvasTemplate {
  id: string;
  name: string;
  category: string;
  previewUrl: string;
  backgroundColor: string;
  elements: CanvasElement[];
}

export const INVITATION_TEMPLATES: CanvasTemplate[] = [
  {
    id: 'tmpl-royal-wedding',
    name: 'Royal Gold Wedding Invitation',
    category: 'Wedding',
    previewUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=600',
    backgroundColor: '#1E1B4B',
    elements: [
      {
        id: 'el-header',
        type: 'text',
        x: 40,
        y: 60,
        width: 320,
        height: 50,
        rotation: 0,
        content: 'TOGETHER WITH THEIR FAMILIES',
        fontFamily: 'Playfair Display',
        fontSize: 14,
        color: '#FCD34D',
        zIndex: 1,
      },
      {
        id: 'el-title',
        type: 'text',
        x: 20,
        y: 120,
        width: 360,
        height: 70,
        rotation: 0,
        content: 'FELIX & PRIYA',
        fontFamily: 'Great Vibes',
        fontSize: 36,
        color: '#F59E0B',
        zIndex: 2,
      },
      {
        id: 'el-sub',
        type: 'text',
        x: 40,
        y: 200,
        width: 320,
        height: 40,
        rotation: 0,
        content: 'INVITE YOU TO CELEBRATE THEIR WEDDING',
        fontFamily: 'Inter',
        fontSize: 12,
        color: '#E0E7FF',
        zIndex: 3,
      },
      {
        id: 'el-date',
        type: 'text',
        x: 40,
        y: 260,
        width: 320,
        height: 50,
        rotation: 0,
        content: 'DECEMBER 15, 2026 • 10:00 AM',
        fontFamily: 'Outfit',
        fontSize: 18,
        color: '#FCD34D',
        zIndex: 4,
      },
      {
        id: 'el-venue',
        type: 'text',
        x: 30,
        y: 330,
        width: 340,
        height: 60,
        rotation: 0,
        content: 'The Leela Palace Grand Ballroom, MRC Nagar, Chennai',
        fontFamily: 'Inter',
        fontSize: 13,
        color: '#FFFFFF',
        zIndex: 5,
      },
      {
        id: 'el-qr',
        type: 'qr',
        x: 140,
        y: 420,
        width: 120,
        height: 120,
        rotation: 0,
        content: 'https://magizhnaazh.com/invite/wed-felix-2026',
        zIndex: 6,
      },
    ],
  },
  {
    id: 'tmpl-modern-birthday',
    name: 'Vibrant Neon Birthday Splash',
    category: 'Birthday',
    previewUrl: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=600',
    backgroundColor: '#0F172A',
    elements: [
      {
        id: 'el-bday-header',
        type: 'text',
        x: 30,
        y: 70,
        width: 340,
        height: 60,
        rotation: 0,
        content: "YOU'RE INVITED TO",
        fontFamily: 'Outfit',
        fontSize: 18,
        color: '#38BDF8',
        zIndex: 1,
      },
      {
        id: 'el-bday-title',
        type: 'text',
        x: 20,
        y: 140,
        width: 360,
        height: 80,
        rotation: 0,
        content: "AARAV'S 1ST BIRTHDAY",
        fontFamily: 'Montserrat',
        fontSize: 32,
        color: '#F43F5E',
        zIndex: 2,
      },
      {
        id: 'el-bday-date',
        type: 'text',
        x: 40,
        y: 240,
        width: 320,
        height: 50,
        rotation: 0,
        content: 'SATURDAY, OCT 24, 2026 AT 6:00 PM',
        fontFamily: 'Inter',
        fontSize: 16,
        color: '#FACC15',
        zIndex: 3,
      },
      {
        id: 'el-bday-venue',
        type: 'text',
        x: 40,
        y: 310,
        width: 320,
        height: 60,
        rotation: 0,
        content: 'Radisson Blu Resort, ECR, Chennai',
        fontFamily: 'Inter',
        fontSize: 14,
        color: '#E2E8F0',
        zIndex: 4,
      },
    ],
  },
];

export function renderCanvasToSVG(elements: CanvasElement[], width = 400, height = 600, bgColor = '#1E1B4B'): string {
  let svgContent = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`;
  svgContent += `<rect width="100%" height="100%" fill="${bgColor}"/>`;

  // Sort by zIndex
  const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex);

  for (const el of sorted) {
    if (el.type === 'text') {
      svgContent += `<text x="${el.x}" y="${el.y + el.fontSize!}" font-family="${el.fontFamily || 'sans-serif'}" font-size="${el.fontSize || 16}" fill="${el.color || '#ffffff'}" font-weight="600">${el.content || ''}</text>`;
    } else if (el.type === 'shape') {
      svgContent += `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" rx="${el.borderRadius || 0}" fill="${el.backgroundColor || '#ffffff'}"/>`;
    }
  }

  svgContent += `</svg>`;
  return svgContent;
}
