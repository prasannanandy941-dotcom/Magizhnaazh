import { Schema, model } from 'mongoose';
import { Invitation } from '../../../packages/shared-types';

const canvasElementSchema = new Schema(
  {
    id: String,
    type: String,
    x: Number,
    y: Number,
    width: Number,
    height: Number,
    rotation: { type: Number, default: 0 },
    content: String,
    fontFamily: String,
    fontSize: Number,
    color: String,
    backgroundColor: String,
    borderRadius: Number,
    zIndex: { type: Number, default: 0 },
  },
  { _id: false }
);

const invitationSchema = new Schema<Invitation>({
  id: { type: String, required: true, unique: true },
  eventId: { type: String, required: true },
  inviteToken: { type: String, required: true, unique: true },
  templateId: String,
  eventTitle: { type: String, default: '' },
  hostName: { type: String, default: '' },
  date: { type: String, default: '' },
  time: { type: String, default: '' },
  venueName: { type: String, default: '' },
  venueAddress: { type: String, default: '' },
  mapLocationUrl: String,
  message: { type: String, default: '' },
  canvasData: {
    width: { type: Number, default: 400 },
    height: { type: Number, default: 600 },
    backgroundColor: { type: String, default: '#1E1B4B' },
    backgroundImageUrl: String,
    elements: { type: [canvasElementSchema], default: [] },
  },
  exportedImageUrl: String,
  createdAt: { type: String, default: () => new Date().toISOString() },
});

export const InvitationModel = model<Invitation>('Invitation', invitationSchema);
