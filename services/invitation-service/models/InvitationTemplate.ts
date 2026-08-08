import { Schema, model } from 'mongoose';
import { InvitationTemplateDoc } from '../../../packages/shared-types';

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

const invitationTemplateSchema = new Schema<InvitationTemplateDoc>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  category: { type: String, default: 'Wedding' },
  previewUrl: { type: String, default: '' },
  backgroundColor: { type: String, default: '#1E1B4B' },
  elements: { type: [canvasElementSchema], default: [] },
  isActive: { type: Boolean, default: true },
  createdAt: { type: String, default: () => new Date().toISOString() },
});

export const InvitationTemplateModel = model<InvitationTemplateDoc>('InvitationTemplate', invitationTemplateSchema);
