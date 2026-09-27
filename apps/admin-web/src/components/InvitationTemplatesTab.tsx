import React, { useEffect, useState } from 'react';
import { InvitationTemplateDoc } from '../../../../packages/shared-types';
import { fetchInvitationTemplates, addInvitationTemplate, deleteInvitationTemplate } from '../api';
import { useCachedList } from '../useCachedList';
import { CrudListPanel, DeleteButton } from './CrudListPanel';

export const InvitationTemplatesTab: React.FC<{ token: string }> = ({ token }) => {
  const { items: templates, setItems: setTemplates, loading, refreshing, reload: load } = useCachedList<InvitationTemplateDoc>('templates', async () => (await fetchInvitationTemplates()).data?.templates || []);
  const [busyId, setBusyId] = useState<string | null>(null);


  return (
    <CrudListPanel
      itemLabel="templates"
      title="Invitation Templates"
      subtitle="Templates available in the Canva-style invitation designer. New ones start with a blank canvas — customers fill it in."
      items={templates}
      loading={loading}
      refreshing={refreshing}
      rowKey={(t) => t.id}
      columns={[
        {
          label: 'Preview',
          render: (t) => (
            <div className="w-10 h-14 rounded-md border border-slate-800" style={{ backgroundColor: t.backgroundColor }} />
          ),
        },
        { label: 'Name', render: (t) => <span className="font-bold text-white">{t.name}</span> },
        { label: 'Category', render: (t) => t.category },
        { label: 'Elements', render: (t) => t.elements.length },
      ]}
      addFields={[
        { name: 'name', label: 'Template Name', placeholder: 'Minimalist Engagement' },
        { name: 'category', label: 'Category', placeholder: 'Engagement' },
        { name: 'backgroundColor', label: 'Background Color', placeholder: '#1E1B4B' },
      ]}
      addLabel="Add Template"
      onAdd={async (v) => {
        await addInvitationTemplate(token, { name: v.name, category: v.category || 'Custom', backgroundColor: v.backgroundColor || '#1E1B4B' });
        await load();
      }}
      rowAction={(t) => (
        <DeleteButton
          busy={busyId === t.id}
          onClick={async () => { setBusyId(t.id); await deleteInvitationTemplate(token, t.id); setTemplates((prev) => prev.filter((x) => x.id !== t.id)); setBusyId(null); }}
        />
      )}
      emptyText="No templates yet."
    />
  );
};
