'use client';

import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import CrudResource from '@/components/admin/CrudResource';
import Button from '@/components/ui/Button';
import Notice from '@/components/ui/Notice';
import { Box, Pill } from '@/components/admin/Kit';
import { api, uploadFile } from '@/lib/api';
import { useApi } from '@/lib/useApi';

const published = (r) => <Pill tone={r.isPublished ? 'green' : 'outline'}>{r.isPublished ? 'Published' : 'Hidden'}</Pill>;
const thumb = (src) => (src ? <img src={src} alt="" className="size-12 object-cover" /> : <span className="block size-12 bg-stone/60" />);

/** Upload many photos at once into one category. */
function BulkUpload({ categories, onDone }) {
  const ref = useRef(null);
  const [cat, setCat] = useState('');
  const [busy, setBusy] = useState(null);
  const [msg, setMsg] = useState(null);
  const pick = async (files) => {
    if (!cat) { setMsg({ tone: 'error', text: 'Choose a category first' }); return; }
    const list = [...files].slice(0, 50);
    setMsg(null);
    const items = [];
    const failed = [];
    for (let i = 0; i < list.length; i += 1) {
      setBusy(`Uploading ${i + 1} of ${list.length}…`);
      try { const m = await uploadFile(list[i], 'CONTENT_IMAGE'); items.push({ image: m.url, alt: list[i].name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').slice(0, 200) }); } catch (x) { failed.push(`${list[i].name}: ${x.message}`); }
    }
    try {
      if (items.length) { const r = await api('/admin/gallery-images/bulk', { method: 'POST', body: { category: cat, items } }); onDone(); setMsg({ tone: failed.length ? 'error' : 'success', text: `${r.message}${failed.length ? `. Failed: ${failed.join('; ')}` : ''}` }); } else setMsg({ tone: 'error', text: `Nothing uploaded. ${failed.join('; ')}` });
    } catch (x) { setMsg({ tone: 'error', text: x.message }); } finally { setBusy(null); }
  };
  return (
    <Box title="Add photos" className="mb-5">
      <div className="flex flex-wrap items-center gap-2">
        <select aria-label="Category" className="h-10 min-w-56 border border-stone-deep bg-paper px-3 text-sm" value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">Choose category…</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}{c.isActive === false ? ' (hidden)' : ''}</option>)}
        </select>
        <Button size="sm" loading={Boolean(busy)} onClick={() => (cat ? ref.current?.click() : setMsg({ tone: 'error', text: 'Choose a category first' }))}><Upload className="size-4" />{busy || 'Upload photos'}</Button>
        <input ref={ref} type="file" multiple accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} onChange={(e) => { const f = e.target.files; if (f?.length) pick(f); e.target.value = ''; }} />
        <span className="text-xs text-graphite">Select up to 50 photos (JPG/PNG/WebP, landscape or portrait, 1600px+ wide). They go live at once.</span>
      </div>
      {msg && <Notice tone={msg.tone} className="mt-3">{msg.text}</Notice>}
    </Box>
  );
}

export function GalleryPhotos() {
  const { data } = useApi('/admin/gallery-categories?limit=200');
  const [v, setV] = useState(0);
  const cats = data?.items || [];
  const name = Object.fromEntries(cats.map((c) => [c.id, c.name]));
  const options = cats.map((c) => ({ value: c.id, label: c.name }));
  return (
    <>
      <BulkUpload categories={cats} onDone={() => setV((x) => x + 1)} />
      <CrudResource key={v} embedded endpoint="/admin/gallery-images" title="Gallery photos" managePerm="content.manage" reorder listDefaults={{ limit: '200' }}
        filters={[{ name: 'category', label: 'Category', options: cats.map((c) => [c.id, c.name]) }]}
        columns={[
          { key: 'image', label: 'Photo', render: (r) => thumb(r.image) },
          { key: 'title', label: 'Title / alt', render: (r) => r.title || r.alt || '—' },
          { key: 'category', label: 'Category', render: (r) => name[r.category] || '—' },
          { key: 'isPublished', label: 'Status', render: published },
        ]}
        defaults={{ category: cats[0]?.id || '', image: '', title: '', alt: '', isPublished: true }}
        toForm={({ id, createdAt, updatedAt, order, ...r }) => r}
        fields={[
          { name: 'image', label: 'Photo', type: 'image', wide: true },
          { name: 'category', label: 'Category', type: 'select', placeholder: false, options },
          { name: 'title', label: 'Title (optional)', hint: 'e.g. L-shaped kitchen, Gurugram' },
          { name: 'alt', label: 'Description for SEO / screen readers', wide: true },
          { name: 'isPublished', label: 'Published', type: 'switch', help: 'Visible on the gallery page' },
        ]} />
      <p className="mt-3 text-xs text-graphite">Published portfolio projects (Projects tab) also appear in the gallery under the matching category.</p>
    </>
  );
}

export function GalleryCategories() {
  return (
    <CrudResource embedded endpoint="/admin/gallery-categories" title="Gallery categories" managePerm="content.manage" reorder listDefaults={{ limit: '200' }}
      columns={[
        { key: 'coverImage', label: 'Cover', render: (r) => thumb(r.coverImage) },
        { key: 'name', label: 'Category' }, { key: 'slug', label: 'URL', render: (r) => `/gallery/${r.slug}` },
        { key: 'isActive', label: 'Status', render: (r) => <Pill tone={r.isActive === false ? 'outline' : 'green'}>{r.isActive === false ? 'Hidden' : 'Visible'}</Pill> },
      ]}
      defaults={{ name: '', slug: '', description: '', coverImage: '', seo: {}, isActive: true }}
      toForm={({ id, createdAt, updatedAt, order, ...r }) => ({ ...r, seo: r.seo || {} })}
      deleteLabel="Delete (hides if it has photos)"
      fields={[
        { name: 'name', label: 'Name', hint: 'e.g. Modular Kitchen' }, { name: 'slug', label: 'URL slug', hint: 'Leave blank to generate' },
        { name: 'description', label: 'Intro text (top of the category page)', type: 'textarea', rows: 3 },
        { name: 'coverImage', label: 'Cover image (optional — first photo is used otherwise)', type: 'image' },
        { name: 'seo.title', label: 'SEO title' }, { name: 'seo.description', label: 'SEO description' },
        { name: 'isActive', label: 'Visible', type: 'switch', help: 'Show this category on the website' },
      ]} />
  );
}
