import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '.env') });

import { randomBytes } from 'crypto';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { connectDB } from '../../packages/shared-utils/db';
import { authMiddleware, requireRole } from '../../packages/shared-utils/auth';
import { requestLogger } from '../../packages/shared-utils/logging';
import { registerHealthRoute } from '../../packages/shared-utils/health';
import { renderCanvasToSVG, INVITATION_TEMPLATES } from '../../packages/canvas-engine';
import { InvitationModel } from './models/Invitation';
import { InvitationTemplateModel } from './models/InvitationTemplate';

const app = express();
const PORT = process.env.PORT || 8005;

app.use(cors());
app.use(express.json());
app.use(requestLogger('invitation-service'));
registerHealthRoute(app, 'invitation-service');

function generatePublicToken(): string {
  // Cryptographically secure, unguessable — public invitation links must never
  // expose predictable/sequential IDs.
  return randomBytes(12).toString('base64url');
}

async function seedIfEmpty() {
  const count = await InvitationModel.countDocuments();
  if (count > 0) return;

  await InvitationModel.create({
    id: 'inv-101',
    eventId: 'evt-101',
    inviteToken: generatePublicToken(),
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
        { id: 'el-1', type: 'text', x: 40, y: 60, width: 320, height: 40, rotation: 0, content: 'TOGETHER WITH THEIR FAMILIES', fontFamily: 'Playfair Display', fontSize: 14, color: '#FCD34D', zIndex: 1 },
        { id: 'el-2', type: 'text', x: 20, y: 120, width: 360, height: 70, rotation: 0, content: 'FELIX & PRIYA', fontFamily: 'Great Vibes', fontSize: 36, color: '#F59E0B', zIndex: 2 },
      ],
    },
  });
  console.log('[invitation-service] Seeded demo invitation.');
}

async function seedTemplatesIfEmpty() {
  if ((await InvitationTemplateModel.countDocuments()) > 0) return;

  await InvitationTemplateModel.insertMany(
    INVITATION_TEMPLATES.map((t) => ({
      id: t.id,
      name: t.name,
      category: t.category,
      previewUrl: t.previewUrl,
      backgroundColor: t.backgroundColor,
      elements: t.elements,
      isActive: true,
    }))
  );
  console.log('[invitation-service] Seeded invitation templates.');
}

// 1. Save a Canva-style invitation document
app.post('/api/v1/invitations', authMiddleware(), async (req: Request, res: Response) => {
  const { eventId, eventTitle, hostName, date, time, venueName, venueAddress, message, canvasData } = req.body;

  const invitation = await InvitationModel.create({
    id: `inv-${Date.now()}`,
    eventId: eventId || 'evt-101',
    inviteToken: generatePublicToken(),
    eventTitle: eventTitle || 'Wedding Invitation',
    hostName: hostName || 'Host Family',
    date: date || '2026-12-15',
    time: time || '10:00 AM',
    venueName: venueName || 'Grand Ballroom',
    venueAddress: venueAddress || 'Chennai',
    message: message || 'Please join us for our special day.',
    canvasData: canvasData || { width: 400, height: 600, backgroundColor: '#1E1B4B', elements: [] },
  });

  res.status(201).json({ success: true, message: 'Canva invitation document saved.', data: { invitation } });
});

// 2. Public invitation view by unguessable token — no auth required.
app.get('/api/v1/invitations/:token', async (req: Request, res: Response) => {
  const invitation = await InvitationModel.findOne({ inviteToken: req.params.token });
  if (!invitation) return res.status(404).json({ success: false, message: 'Invitation link invalid or expired.' });
  res.json({ success: true, data: { invitation } });
});

// 3. Public SVG render of the invitation canvas (server-side, via canvas-engine).
app.get('/api/v1/invitations/:token/svg', async (req: Request, res: Response) => {
  const invitation = await InvitationModel.findOne({ inviteToken: req.params.token });
  if (!invitation) return res.status(404).json({ success: false, message: 'Invitation link invalid or expired.' });

  const svg = renderCanvasToSVG(
    invitation.canvasData.elements,
    invitation.canvasData.width,
    invitation.canvasData.height,
    invitation.canvasData.backgroundColor
  );

  res.setHeader('Content-Type', 'image/svg+xml');
  res.send(svg);
});

// 4. Update invitation canvas
app.put('/api/v1/invitations/:id', authMiddleware(), async (req: Request, res: Response) => {
  const invitation = await InvitationModel.findOne({ id: req.params.id });
  if (!invitation) return res.status(404).json({ success: false, message: 'Invitation not found.' });

  const { canvasData } = req.body;
  if (canvasData) {
    invitation.canvasData = canvasData;
  }
  await invitation.save();

  res.json({ success: true, message: 'Invitation canvas updated.', data: { invitation } });
});

// --- Invitation templates (manageable by admin, consumed by the designer) ---
app.get('/api/v1/invitation-templates', async (req: Request, res: Response) => {
  const templates = await InvitationTemplateModel.find({ isActive: true });
  res.json({ success: true, data: { templates } });
});

app.post('/api/v1/invitation-templates', authMiddleware(), requireRole('admin'), async (req: Request, res: Response) => {
  const { name, category, previewUrl, backgroundColor, elements } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'name is required.' });

  const template = await InvitationTemplateModel.create({
    id: `tmpl-${Date.now()}`,
    name,
    category: category || 'Custom',
    previewUrl: previewUrl || '',
    backgroundColor: backgroundColor || '#1E1B4B',
    elements: elements || [],
  });

  res.status(201).json({ success: true, message: 'Invitation template added.', data: { template } });
});

app.delete('/api/v1/invitation-templates/:id', authMiddleware(), requireRole('admin'), async (req: Request, res: Response) => {
  await InvitationTemplateModel.deleteOne({ id: req.params.id });
  res.json({ success: true, message: 'Invitation template removed.' });
});

async function start() {
  await connectDB(process.env.MONGODB_URI, 'invitation-service');
  await seedIfEmpty();
  await seedTemplatesIfEmpty();
  app.listen(PORT, () => {
    console.log(`[Invitation Microservice] Running on http://localhost:${PORT}`);
  });
}

start();
// 2b. Host's own invitation for an event — авторized, returns the latest one (or null).
app.get('/api/v1/invitations/event/:eventId', authMiddleware(), async (req: Request, res: Response) => {
  const invitation = await InvitationModel.findOne({ eventId: req.params.eventId }).sort({ createdAt: -1 });
  res.json({ success: true, data: { invitation: invitation || null } });
});
