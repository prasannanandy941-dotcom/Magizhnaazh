import express, { Request, Response } from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 8005;

app.use(cors());
app.use(express.json());

interface CanvasElement {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string;
  fontFamily?: string;
  fontSize?: number;
  color?: string;
}

interface Invitation {
  id: string;
  eventId: string;
  inviteToken: string;
  eventTitle: string;
  hostName: string;
  date: string;
  time: string;
  venueName: string;
  venueAddress: string;
  message: string;
  canvasData: {
    width: number;
    height: number;
    backgroundColor: string;
    elements: CanvasElement[];
  };
  createdAt: string;
}

const INVITATIONS: Invitation[] = [
  {
    id: 'inv-101',
    eventId: 'evt-101',
    inviteToken: 'wed-felix-2026',
    eventTitle: 'Felix & Priya Wedding Celebration',
    hostName: 'Felix & Family',
    date: '2026-12-15',
    time: '10:00 AM',
    venueName: 'The Leela Palace Grand Ballroom',
    venueAddress: 'Adyar Seaface, MRC Nagar, Chennai',
    message: 'We request the honor of your presence to celebrate the grand wedding of Felix & Priya.',
    canvasData: {
      width: 400,
      height: 600,
      backgroundColor: '#1E1B4B',
      elements: [
        { id: 'el-1', type: 'text', x: 40, y: 60, width: 320, height: 40, content: 'TOGETHER WITH THEIR FAMILIES', fontFamily: 'Playfair Display', fontSize: 14, color: '#FCD34D' },
        { id: 'el-2', type: 'text', x: 20, y: 120, width: 360, height: 70, content: 'FELIX & PRIYA', fontFamily: 'Great Vibes', fontSize: 36, color: '#F59E0B' },
      ],
    },
    createdAt: new Date().toISOString(),
  },
];

// 1. Create or Save Canva Invitation Design (Customer Role)
app.post('/api/v1/invitations', (req: Request, res: Response) => {
  const { eventId, eventTitle, hostName, date, time, venueName, venueAddress, message, canvasData } = req.body;

  const newInvite: Invitation = {
    id: `inv-${Date.now()}`,
    eventId: eventId || 'evt-101',
    inviteToken: `invite-${Date.now()}`,
    eventTitle: eventTitle || 'Wedding Invitation',
    hostName: hostName || 'Host Family',
    date: date || '2026-12-15',
    time: time || '10:00 AM',
    venueName: venueName || 'Grand Ballroom',
    venueAddress: venueAddress || 'Chennai',
    message: message || 'Please join us for our special day.',
    canvasData: canvasData || { width: 400, height: 600, backgroundColor: '#1E1B4B', elements: [] },
    createdAt: new Date().toISOString(),
  };

  INVITATIONS.push(newInvite);
  res.status(201).json({ success: true, message: 'Canva invitation document saved.', data: { invitation: newInvite } });
});

// 2. Get Public Invitation Web View by Token (Public / Guest Access)
app.get('/api/v1/invitations/:token', (req: Request, res: Response) => {
  const invite = INVITATIONS.find((i) => i.inviteToken === req.params.token || i.id === req.params.token);
  if (!invite) return res.status(404).json({ success: false, message: 'Invitation link invalid or expired.' });
  res.json({ success: true, data: { invitation: invite } });
});

// 3. Update Invitation Canvas (Customer Role)
app.put('/api/v1/invitations/:id', (req: Request, res: Response) => {
  const invite = INVITATIONS.find((i) => i.id === req.params.id);
  if (!invite) return res.status(404).json({ success: false, message: 'Invitation not found.' });

  const { canvasData } = req.body;
  if (canvasData) {
    invite.canvasData = canvasData;
  }

  res.json({ success: true, message: 'Invitation canvas updated.', data: { invitation: invite } });
});

app.listen(PORT, () => {
  console.log(`[Invitation Microservice] Running on http://localhost:${PORT}`);
});
