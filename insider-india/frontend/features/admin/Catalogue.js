'use client';

import { useState } from 'react';
import CrudResource from '@/components/admin/CrudResource';
import { Header, Pill, Tabs } from '@/components/admin/Kit';
import { useRefData } from '@/components/admin/refData';
import { inr } from '@/lib/admin';

const BHK = [['1BHK', 'Studio / 1 BHK'], ['2BHK', '2 BHK'], ['3BHK', '3 BHK'], ['4BHK', '4 BHK'], ['5BHK_PLUS', '5 BHK+']].map(([value, label]) => ({ value, label }));
const active = (r) => <Pill value={r.isActive === false ? 'INACTIVE' : 'ACTIVE'} />;
const published = (r) => <Pill tone={r.isPublished ? 'green' : 'outline'}>{r.isPublished ? 'Published' : 'Draft'}</Pill>;
const strip = ({ id, createdAt, updatedAt, order, ...rest }) => rest;

export function Packages() {
  return (
    <CrudResource endpoint="/admin/packages" title="Packages" subtitle="Pricing here drives the estimator and package pages. Every change is audited." managePerm="packages.manage" reorder
      columns={[
        { key: 'name', label: 'Package', render: (r) => <><span className="font-medium">{r.name}</span>{r.isRecommended && <span className="ml-2"><Pill tone="wine">Recommended</Pill></span>}</> },
        { key: 'pricing', label: 'BHK ranges', render: (r) => r.pricing.map((p) => `${p.bhk}: ${inr(p.min)}–${inr(p.max)}`).join(', ') || 'None' },
        { key: 'areaRate', label: 'Per sq ft', render: (r) => (r.areaRate?.minPerSqft ? `${inr(r.areaRate.minPerSqft)}–${inr(r.areaRate.maxPerSqft)}` : 'On request') },
        { key: 'warranty', label: 'Warranty', render: (r) => (r.warranty?.years ? `${r.warranty.years} yrs` : '—') },
        { key: 'isActive', label: 'Status', render: active },
      ]}
      defaults={{ name: '', headline: '', description: '', features: [], warranty: { years: null, text: '' }, image: '', accent: '', pricing: [], areaRate: { minPerSqft: null, maxPerSqft: null }, isRecommended: false, isActive: true }}
      toForm={(r) => ({ ...strip(r), warranty: r.warranty || {}, areaRate: r.areaRate || {} })}
      fromForm={(f) => ({ ...f, reason: f.reason || undefined, warranty: { years: f.warranty?.years || undefined, text: f.warranty?.text || undefined }, areaRate: { minPerSqft: f.areaRate?.minPerSqft || undefined, maxPerSqft: f.areaRate?.maxPerSqft || undefined } })}
      fields={[
        { name: 'name', label: 'Name' }, { name: 'slug', label: 'URL slug', hint: 'Leave blank to generate' },
        { name: 'headline', label: 'Headline', wide: true }, { name: 'description', label: 'Description', type: 'textarea' },
        { name: 'features', label: 'Features', type: 'tags' },
        { name: 'pricing', label: 'Indicative ranges by BHK (₹)', type: 'rows', addLabel: 'Add BHK range', newRow: { bhk: '2BHK', min: 0, max: 0 }, fields: [
          { name: 'bhk', label: 'BHK', type: 'select', options: BHK, placeholder: false }, { name: 'min', label: 'Min ₹', type: 'number', min: 0 }, { name: 'max', label: 'Max ₹', type: 'number', min: 0 },
        ] },
        { name: 'areaRate.minPerSqft', label: 'Custom/commercial: min ₹ per sq ft', type: 'number', nullable: true }, { name: 'areaRate.maxPerSqft', label: 'Max ₹ per sq ft', type: 'number', nullable: true },
        { name: 'warranty.years', label: 'Warranty (years)', type: 'number', nullable: true }, { name: 'warranty.text', label: 'Warranty text' },
        { name: 'image', label: 'Image', type: 'image' },
        { name: 'accent', label: 'Swatch tone', type: 'select', options: ['sand', 'terracotta', 'stone', 'brass'] },
        { name: 'isRecommended', label: 'Recommended', type: 'switch', help: 'Mark as recommended' }, { name: 'isActive', label: 'Active', type: 'switch', help: 'Show on site and in estimator' },
        { name: 'reason', label: 'Reason for change (audit log)', wide: true },
      ]} />
  );
}

export function Services() {
  return (
    <CrudResource endpoint="/admin/services" title="Services" subtitle="Options in step 10 of the booking funnel" managePerm="packages.manage" reorder
      columns={[
        { key: 'title', label: 'Service' }, { key: 'icon', label: 'Icon' },
        { key: 'showInBooking', label: 'In booking funnel', render: (r) => (r.showInBooking ? 'Yes' : 'No') }, { key: 'isActive', label: 'Status', render: active },
      ]}
      defaults={{ title: '', icon: '', image: '', description: '', showInBooking: true, isActive: true }}
      toForm={strip}
      fields={[
        { name: 'title', label: 'Title' }, { name: 'slug', label: 'Slug', hint: 'Leave blank to generate' },
        { name: 'icon', label: 'Icon (lucide name)', hint: 'e.g. CookingPot, Archive, Tv, Flame' }, { name: 'image', label: 'Image', type: 'image' },
        { name: 'description', label: 'Description', type: 'textarea' },
        { name: 'showInBooking', label: 'Booking funnel', type: 'switch', help: 'Offer in booking funnel' }, { name: 'isActive', label: 'Active', type: 'switch', help: 'Active' },
      ]} />
  );
}

export function EstimateRules() {
  const { packages } = useRefData();
  return (
    <CrudResource endpoint="/admin/estimate-rules" title="Estimate rules" subtitle="Adjustments added to the package base range: extra rooms and add-ons. Rules flagged “demo” were seeded as placeholders." managePerm="packages.manage" reorder
      filters={[{ name: 'type', label: 'Type', options: [['ROOM', 'Extra room'], ['ADDON', 'Add-on']] }]}
      columns={[
        { key: 'label', label: 'Rule', render: (r) => <>{r.label}{r.isDemoValue && <span className="ml-2"><Pill tone="amber">Demo value</Pill></span>}</> },
        { key: 'type', label: 'Type', render: (r) => (r.type === 'ROOM' ? `Extra ${r.room?.replace(/s$/, '')}` : 'Add-on') },
        { key: 'amount', label: 'Adds', render: (r) => (r.mode === 'PERCENT' ? `${r.min}–${r.max}%` : `${inr(r.min)}–${inr(r.max)}`) },
        { key: 'overrides', label: 'Package overrides', render: (r) => r.packageOverrides?.length || '—' },
        { key: 'isActive', label: 'Status', render: active },
      ]}
      defaults={{ key: '', label: '', type: 'ADDON', room: null, mode: 'FLAT', min: 0, max: 0, packageOverrides: [], icon: '', description: '', isDemoValue: false, isActive: true }}
      toForm={({ id, createdAt, updatedAt, order, ...r }) => r}
      fromForm={(f) => ({ ...f, room: f.type === 'ROOM' ? f.room : null, reason: f.reason || undefined })}
      fields={[
        { name: 'label', label: 'Label shown to customers' }, { name: 'key', label: 'Key', hint: 'lower_snake_case, unique' },
        { name: 'type', label: 'Type', type: 'select', placeholder: false, options: [{ value: 'ADDON', label: 'Add-on (step 3)' }, { value: 'ROOM', label: 'Extra room (step 2)' }] },
        { name: 'room', label: 'Room', type: 'select', nullable: true, options: [{ value: 'kitchens', label: 'Kitchens' }, { value: 'bedrooms', label: 'Bedrooms' }, { value: 'washrooms', label: 'Washrooms' }], hideIf: (v) => v.type !== 'ROOM' },
        { name: 'mode', label: 'Mode', type: 'select', placeholder: false, options: [{ value: 'FLAT', label: 'Flat ₹ per unit' }, { value: 'PERCENT', label: '% of package base' }] },
        { name: 'min', label: 'Min', type: 'number', min: 0 }, { name: 'max', label: 'Max', type: 'number', min: 0 },
        { name: 'packageOverrides', label: 'Different amounts for specific packages', type: 'rows', addLabel: 'Add override', newRow: { package: '', min: 0, max: 0 }, fields: [
          { name: 'package', label: 'Package', type: 'select', options: packages.map((p) => ({ value: p.id, label: p.name })) }, { name: 'min', label: 'Min', type: 'number' }, { name: 'max', label: 'Max', type: 'number' },
        ] },
        { name: 'icon', label: 'Icon (lucide name)' }, { name: 'image', label: 'Image', type: 'image' }, { name: 'description', label: 'Description', type: 'textarea' },
        { name: 'isDemoValue', label: 'Demo value', type: 'switch', help: 'Still a placeholder — review before launch' }, { name: 'isActive', label: 'Active', type: 'switch', help: 'Active' },
        { name: 'reason', label: 'Reason for change (audit log)', wide: true },
      ]} />
  );
}

const CATS = [['FULL_HOME', 'Full home'], ['MODULAR_KITCHEN', 'Modular kitchen'], ['BEDROOM', 'Bedroom'], ['WARDROBE', 'Wardrobe'], ['LIVING_ROOM', 'Living room'], ['RENOVATION', 'Renovation'], ['COMMERCIAL', 'Commercial']];

export function Content() {
  const [tab, setTab] = useState('projects');
  return (
    <>
      <Header title="Website content" subtitle="Projects, testimonials and FAQs. Unpublished items never appear on the site." />
      <Tabs tabs={[['projects', 'Projects'], ['testimonials', 'Testimonials'], ['faqs', 'FAQs']]} value={tab} onChange={setTab} />
      {tab === 'projects' && (
        <CrudResource embedded endpoint="/admin/projects" title="Projects" managePerm="content.manage" reorder
          filters={[{ name: 'category', label: 'Category', options: CATS }]}
          columns={[
            { key: 'title', label: 'Project', render: (r) => <span className="flex items-center gap-3">{r.coverImage && <img src={r.coverImage} alt="" className="size-10 rounded-none object-cover" />}{r.title}</span> },
            { key: 'category', label: 'Category', render: (r) => CATS.find(([k]) => k === r.category)?.[1] }, { key: 'city', label: 'City' },
            { key: 'isFeatured', label: 'Featured', render: (r) => (r.isFeatured ? 'Yes' : '') }, { key: 'isPublished', label: 'Status', render: published },
          ]}
          defaults={{ title: '', category: 'FULL_HOME', city: '', locality: '', bhk: '', summary: '', description: '', coverImage: '', images: [], tags: [], seo: {}, isFeatured: false, isPublished: false }}
          toForm={({ id, createdAt, updatedAt, order, ...r }) => ({ ...r, seo: r.seo || {} })}
          fromForm={(f) => ({ ...f, area: f.area || undefined, completedOn: f.completedOn || undefined })}
          fields={[
            { name: 'title', label: 'Title' }, { name: 'slug', label: 'Slug', hint: 'Leave blank to generate' },
            { name: 'category', label: 'Category', type: 'select', placeholder: false, options: CATS.map(([value, label]) => ({ value, label })) },
            { name: 'bhk', label: 'Configuration' }, { name: 'city', label: 'City' }, { name: 'locality', label: 'Locality' },
            { name: 'area', label: 'Area (sq ft)', type: 'number' }, { name: 'packageName', label: 'Package' }, { name: 'completedOn', label: 'Completed on', type: 'date' },
            { name: 'summary', label: 'Summary', type: 'textarea', rows: 2 }, { name: 'description', label: 'Description', type: 'textarea', rows: 6 },
            { name: 'coverImage', label: 'Cover image', type: 'image' },
            { name: 'images', label: 'Gallery & before/after', type: 'rows', addLabel: 'Add image', newRow: { url: '', kind: 'GALLERY' }, fields: [
              { name: 'url', label: 'Image', type: 'image' }, { name: 'kind', label: 'Type', type: 'select', placeholder: false, options: [{ value: 'GALLERY', label: 'Gallery' }, { value: 'BEFORE', label: 'Before' }, { value: 'AFTER', label: 'After' }] },
              { name: 'alt', label: 'Alt text' }, { name: 'caption', label: 'Caption' },
            ] },
            { name: 'tags', label: 'Tags', type: 'tags' },
            { name: 'seo.title', label: 'SEO title' }, { name: 'seo.description', label: 'SEO description' },
            { name: 'isFeatured', label: 'Featured', type: 'switch', help: 'Show on home page' }, { name: 'isPublished', label: 'Published', type: 'switch', help: 'Visible on site' },
          ]} />
      )}
      {tab === 'testimonials' && (
        <CrudResource embedded endpoint="/admin/testimonials" title="Testimonials" managePerm="content.manage" reorder
          columns={[{ key: 'name', label: 'Name' }, { key: 'city', label: 'City' }, { key: 'quote', label: 'Quote', render: (r) => `${r.quote.slice(0, 90)}${r.quote.length > 90 ? '…' : ''}` }, { key: 'isPublished', label: 'Status', render: published }]}
          defaults={{ name: '', city: '', quote: '', rating: null, photo: '', isPublished: false }}
          toForm={({ id, createdAt, updatedAt, order, ...r }) => r}
          fromForm={(f) => ({ ...f, rating: f.rating || undefined, project: f.project || undefined })}
          fields={[
            { name: 'name', label: 'Customer name' }, { name: 'city', label: 'City' },
            { name: 'quote', label: 'Quote', type: 'textarea', hint: 'Use real customer words only, with their permission.' },
            { name: 'rating', label: 'Rating (1–5)', type: 'number', min: 1, max: 5, nullable: true }, { name: 'photo', label: 'Photo', type: 'image' },
            { name: 'isPublished', label: 'Published', type: 'switch', help: 'Visible on site' },
          ]} />
      )}
      {tab === 'faqs' && (
        <CrudResource embedded endpoint="/admin/faqs" title="FAQs" managePerm="content.manage" reorder
          columns={[{ key: 'question', label: 'Question' }, { key: 'category', label: 'Category' }, { key: 'isPublished', label: 'Status', render: published }]}
          defaults={{ question: '', answer: '', category: 'GENERAL', isPublished: true }}
          toForm={({ id, createdAt, updatedAt, order, ...r }) => r}
          fields={[
            { name: 'question', label: 'Question', wide: true }, { name: 'answer', label: 'Answer', type: 'textarea' },
            { name: 'category', label: 'Category', hint: 'GENERAL shows on the home page; PROCESS on How it works' },
            { name: 'isPublished', label: 'Published', type: 'switch', help: 'Visible on site' },
          ]} />
      )}
    </>
  );
}

