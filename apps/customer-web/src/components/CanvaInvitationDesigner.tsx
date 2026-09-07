import React, { useState, useEffect } from 'react';
import { Sparkles, Type, Palette, QrCode, Download, Share2, Eye, Plus, Trash2, Layout, RotateCw, Check, Pencil } from 'lucide-react';
import { CanvasElement, Invitation } from '../../../../packages/shared-types';
import { INVITATION_TEMPLATES } from '../../../../packages/canvas-engine';
import { inviteUrl } from '../publicUrl';

interface CanvaInvitationDesignerProps {
  invitation: Invitation;
  onSaveInvitation: (updated: Invitation) => void;
  onOpenPublicView: (token: string) => void;
}

export const CanvaInvitationDesigner: React.FC<CanvaInvitationDesignerProps> = ({
  invitation,
  onSaveInvitation,
  onOpenPublicView,
}) => {
  const [elements, setElements] = useState<CanvasElement[]>(invitation.canvasData.elements);
  const [backgroundColor, setBackgroundColor] = useState<string>(invitation.canvasData.backgroundColor || '#1E1B4B');
  const [selectedElId, setSelectedElId] = useState<string>(elements[0]?.id || '');
  const [exportNotice, setExportNotice] = useState('');

  // Re-sync the canvas whenever the invitation being edited changes (the active
  // event switched, or its invitation finished loading). Without this, useState
  // keeps the canvas frozen on the FIRST invitation it mounted with — which made
  // the designer show one event (e.g. the wedding) while the share link pointed
  // at another (the baby shower). Keyed on invitation.id so in-progress edits to
  // the same invitation aren't wiped on every save.
  useEffect(() => {
    setElements(invitation.canvasData.elements);
    setBackgroundColor(invitation.canvasData.backgroundColor || '#1E1B4B');
    setSelectedElId(invitation.canvasData.elements[0]?.id || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invitation.id]);

  const selectedElement = elements.find((el) => el.id === selectedElId) || elements[0];

  const handleUpdateElement = (updatedFields: Partial<CanvasElement>) => {
    if (!selectedElId) return;
    setElements((prev) =>
      prev.map((el) => (el.id === selectedElId ? { ...el, ...updatedFields } : el))
    );
  };

  const handleAddText = () => {
    const newEl: CanvasElement = {
      id: `el-${Date.now()}`,
      type: 'text',
      x: 50,
      y: 200,
      width: 300,
      height: 40,
      rotation: 0,
      content: 'NEW CUSTOM TEXT',
      fontFamily: 'Outfit',
      fontSize: 18,
      color: '#FCD34D',
      zIndex: elements.length + 1,
    };
    setElements([...elements, newEl]);
    setSelectedElId(newEl.id);
  };

  const handleAddQR = () => {
    // One RSVP QR code per invitation is all that ever makes sense — re-clicking
    // "Add RSVP QR" should just jump to editing the existing one, not stack up
    // duplicates on the canvas.
    const existingQR = elements.find((el) => el.type === 'qr');
    if (existingQR) {
      setSelectedElId(existingQR.id);
      return;
    }

    const newEl: CanvasElement = {
      id: `el-qr-${Date.now()}`,
      type: 'qr',
      x: 140,
      y: 420,
      width: 120,
      height: 120,
      rotation: 0,
      content: inviteUrl(invitation.inviteToken),
      zIndex: elements.length + 1,
    };
    setElements([...elements, newEl]);
    setSelectedElId(newEl.id);
  };

  const handleDeleteElement = (id: string) => {
    setElements(elements.filter((el) => el.id !== id));
    if (selectedElId === id) setSelectedElId('');
  };

  const handleLoadTemplate = (tmplId: string) => {
    const tmpl = INVITATION_TEMPLATES.find((t) => t.id === tmplId);
    if (tmpl) {
      setBackgroundColor(tmpl.backgroundColor);
      setElements(tmpl.elements);
      setSelectedElId(tmpl.elements[0]?.id || '');
    }
  };

  const handleSave = () => {
    const updated: Invitation = {
      ...invitation,
      canvasData: {
        width: 400,
        height: 600,
        backgroundColor,
        elements,
      },
    };
    onSaveInvitation(updated);
    setExportNotice('Invitation canvas design saved successfully!');
    setTimeout(() => setExportNotice(''), 3000);
  };

  const handleSimulateExport = (format: 'PNG' | 'PDF') => {
    setExportNotice(`Exporting high-resolution invitation vector file (${format})... Download complete!`);
    setTimeout(() => setExportNotice(''), 4000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/10 text-pink-400 text-xs font-bold border border-pink-500/20 mb-2">
            <Sparkles className="w-3.5 h-3.5" /> Canva-Style HTML5 Invitation Editor
          </div>
          <h2 className="font-display font-bold text-3xl text-gradient-gold">Digital Invitation Designer</h2>
          <p className="text-slate-400 text-sm mt-1">
            Customize typography, background colors, drag elements, and add dynamic RSVP QR codes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => onOpenPublicView(invitation.inviteToken)}
            className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-pink-500 text-slate-200 font-bold text-xs flex items-center gap-2 transition-all"
          >
            <Eye className="w-4 h-4 text-pink-400" /> Preview Web Link
          </button>

          <button
            onClick={() => handleSimulateExport('PNG')}
            className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-amber-500 text-slate-200 font-bold text-xs flex items-center gap-2 transition-all"
          >
            <Download className="w-4 h-4 text-amber-400" /> Export PNG / PDF
          </button>

          <button
            onClick={handleSave}
            className="shine-sweep px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#e85d8a] to-[#b8336a] hover:from-[#f2a6c4] hover:to-[#e85d8a] text-white font-bold text-xs shadow-lg shadow-[#e85d8a]/20 flex items-center gap-2 transition-all hover:scale-105"
          >
            <Check className="w-4 h-4" /> Save Design
          </button>
        </div>
      </div>

      {exportNotice && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold text-xs text-center animate-pulse">
          {exportNotice}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-4 glass-card p-6 rounded-3xl border border-slate-800 space-y-6">
          <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
            <Layout className="w-5 h-5 text-indigo-400" /> Designer Toolkit
          </h3>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Preset Templates</label>
            <div className="grid grid-cols-2 gap-2">
              {INVITATION_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.id}
                  onClick={() => handleLoadTemplate(tmpl.id)}
                  className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-indigo-500 text-left text-xs font-semibold text-slate-300 hover:text-white transition-all"
                >
                  {tmpl.name}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 space-y-2">
            <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Add Elements</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleAddText}
                className="py-2.5 px-3 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4 text-indigo-400" /> Add Text
              </button>

              <button
                onClick={handleAddQR}
                className="py-2.5 px-3 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <QrCode className="w-4 h-4 text-amber-400" /> Add RSVP QR
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800">
            <label className="block text-xs font-bold uppercase text-slate-400 mb-2 flex items-center gap-1">
              <Palette className="w-4 h-4 text-pink-400" /> Canvas Background Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                className="w-10 h-10 rounded-xl bg-transparent border-0 cursor-pointer"
              />
              <span className="text-xs font-mono text-slate-300">{backgroundColor}</span>
            </div>
          </div>

          {selectedElement && (
            <div className="pt-4 border-t border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase text-amber-400">Edit Selected Element</label>
                <button
                  onClick={() => handleDeleteElement(selectedElement.id)}
                  className="text-rose-400 hover:text-rose-300 text-xs flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>

              {selectedElement.type === 'text' && (
                <>
                  <div className="px-2.5 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-[11px] font-semibold text-indigo-300 truncate">
                    Editing: {selectedElement.content || '(empty text)'}
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Text Content</label>
                    <input
                      type="text"
                      value={selectedElement.content || ''}
                      onChange={(e) => handleUpdateElement({ content: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-semibold text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Font Family</label>
                    <select
                      value={selectedElement.fontFamily || 'Inter'}
                      onChange={(e) => handleUpdateElement({ fontFamily: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-semibold text-xs focus:outline-none cursor-pointer"
                    >
                      <option value="Playfair Display">Playfair Display (Serif)</option>
                      <option value="Great Vibes">Great Vibes (Script / Cursive)</option>
                      <option value="Outfit">Outfit (Display)</option>
                      <option value="Inter">Inter (Sans)</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Font Size (px)</label>
                      <input
                        type="number"
                        min={10}
                        max={60}
                        value={selectedElement.fontSize || 16}
                        onChange={(e) => handleUpdateElement({ fontSize: Number(e.target.value) })}
                        className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-semibold text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Text Color</label>
                      <input
                        type="color"
                        value={selectedElement.color || '#ffffff'}
                        onChange={(e) => handleUpdateElement({ color: e.target.value })}
                        className="w-full h-9 rounded-xl bg-transparent border-0 cursor-pointer"
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedElId('')}
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Check className="w-4 h-4" /> OK
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <div className="lg:col-span-8 flex flex-col items-center">
          <div className="text-xs text-slate-400 mb-3 flex items-center gap-2">
            <span>Interactive 400 x 600 Canvas Area</span>
            <span className="text-slate-600">•</span>
            <span className="text-amber-400 font-semibold">Click elements on canvas to edit</span>
          </div>

          <div
            style={{
              background: `radial-gradient(120% 80% at 50% 0%, rgba(255,255,255,0.10), rgba(255,255,255,0) 55%), linear-gradient(165deg, ${backgroundColor} 0%, rgba(0,0,0,0.55) 100%), ${backgroundColor}`,
            }}
            className="w-[380px] sm:w-[400px] h-[600px] rounded-3xl shadow-2xl relative overflow-hidden ring-1 ring-amber-200/20"
          >
            {/* Ornamental gold frame — layered borders + corner flourishes, purely
                decorative so it never intercepts clicks on the editable elements. */}
            <div className="pointer-events-none absolute inset-3 rounded-[20px] border border-amber-200/45" />
            <div className="pointer-events-none absolute inset-[18px] rounded-2xl border border-amber-200/15" />
            <span className="pointer-events-none absolute top-2.5 left-3.5 text-amber-200/70 text-sm leading-none">✦</span>
            <span className="pointer-events-none absolute top-2.5 right-3.5 text-amber-200/70 text-sm leading-none">✦</span>
            <span className="pointer-events-none absolute bottom-2.5 left-3.5 text-amber-200/70 text-sm leading-none">✦</span>
            <span className="pointer-events-none absolute bottom-2.5 right-3.5 text-amber-200/70 text-sm leading-none">✦</span>
            {/* Top monogram emblem */}
            <div className="pointer-events-none absolute top-7 left-1/2 -translate-x-1/2 text-amber-200/85 text-2xl leading-none">❦</div>

            {/* Content column — elements stay in order and remain individually
                clickable to edit, but are now centered and elegantly spaced. */}
            <div className="relative h-full flex flex-col items-center justify-center gap-4 px-10 py-16 text-center">
              {elements.map((el, i) => {
                const isSelected = selectedElId === el.id;

                if (el.type === 'text') {
                  return (
                    <React.Fragment key={el.id}>
                      {/* A little gold flourish under the opening line (the header). */}
                      {i === 1 && (
                        <div className="pointer-events-none flex items-center justify-center gap-2 text-amber-200/60 -my-1">
                          <span className="h-px w-10 bg-gradient-to-r from-transparent to-amber-200/50" />
                          <span className="text-[10px] leading-none">◆</span>
                          <span className="h-px w-10 bg-gradient-to-l from-transparent to-amber-200/50" />
                        </div>
                      )}
                      <div
                        onClick={() => setSelectedElId(el.id)}
                        style={{
                          fontFamily: el.fontFamily || 'sans-serif',
                          fontSize: `${el.fontSize || 16}px`,
                          color: el.color || '#ffffff',
                        }}
                        title="Click to edit this text"
                        className={`group/el relative cursor-pointer transition-all leading-tight font-semibold max-w-full tracking-wide ${
                          isSelected
                            ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-950/50 px-2 py-1 rounded-lg'
                            : 'px-2 py-1 rounded-lg border border-dashed border-transparent hover:border-amber-200/40'
                        }`}
                      >
                        {el.content}
                        {!isSelected && (
                          <Pencil className="w-3 h-3 absolute -top-2 -right-2 text-slate-950 bg-amber-200 rounded-full p-0.5 opacity-0 group-hover/el:opacity-100 transition-opacity" />
                        )}
                      </div>
                    </React.Fragment>
                  );
                }

                if (el.type === 'qr') {
                  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=0&data=${encodeURIComponent(el.content || '')}`;
                  return (
                    <div
                      key={el.id}
                      onClick={() => setSelectedElId(el.id)}
                      className={`w-28 h-28 bg-white p-2 rounded-2xl shadow-xl flex flex-col items-center justify-center cursor-pointer ${
                        isSelected ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-950' : ''
                      }`}
                    >
                      <img
                        src={qrImageUrl}
                        alt="RSVP QR code"
                        className="w-20 h-20 object-contain"
                      />
                      <span className="text-[9px] font-bold text-slate-950 uppercase mt-1">Scan for RSVP</span>
                    </div>
                  );
                }

                return null;
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};