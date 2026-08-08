import { CanvasElement } from './shared-types';

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
];
