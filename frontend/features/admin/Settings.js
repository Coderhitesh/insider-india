'use client';

import { useEffect, useState } from 'react';
import Button from '@/components/ui/Button';
import Notice from '@/components/ui/Notice';
import { Header, Box, Tabs, Loader, Failed } from '@/components/admin/Kit';
import { Fields } from '@/components/admin/Form';
import { api } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { useAuth } from '@/store/auth';
import { can } from '@/lib/admin';

const optionRows = (extra = []) => ({ type: 'rows', addLabel: 'Add option', newRow: { value: '', label: '', active: true, order: 0 }, fields: [
  { name: 'value', label: 'Value (stored)' }, { name: 'label', label: 'Label (shown)' }, ...extra, { name: 'active', label: 'Active', type: 'switch', help: 'Active' },
] });
const secret = (name, label) => ({ name, label, type: 'password', autoComplete: 'new-password', hint: 'Stored encrypted. Leave the masked value to keep it.' });

const SCHEMAS = {
  'company.profile': ['Company', [
    { name: 'name', label: 'Company name' }, { name: 'tagline', label: 'Tagline' }, { name: 'phone', label: 'Phone' }, { name: 'whatsapp', label: 'WhatsApp number' },
    { name: 'email', label: 'Email' }, { name: 'gstNumber', label: 'GST number' }, { name: 'address', label: 'Office address', type: 'textarea', rows: 2 },
    { name: 'logoUrl', label: 'Logo (PNG/JPG for PDFs)', type: 'image' }, { name: 'faviconUrl', label: 'Favicon', type: 'image' },
    { name: 'social.instagram', label: 'Instagram URL' }, { name: 'social.facebook', label: 'Facebook URL' }, { name: 'social.youtube', label: 'YouTube URL' }, { name: 'social.linkedin', label: 'LinkedIn URL' },
    { name: 'quotationFooter', label: 'Quotation PDF footer', type: 'textarea', rows: 2 },
    { name: 'warrantyContent', label: 'Warranty terms (website + PDF)', type: 'textarea', rows: 6 }, { name: 'terms', label: 'Terms & conditions (website + PDF)', type: 'textarea', rows: 8 },
  ]],
  'site.stats': ['Homepage stats', [{ name: 'items', label: 'Trust indicators — only visible items with a real value are shown', type: 'rows', addLabel: 'Add stat', newRow: { key: '', label: '', value: null, visible: false }, fields: [
    { name: 'key', label: 'Key' }, { name: 'label', label: 'Label' }, { name: 'value', label: 'Value', hint: 'Leave empty to hide' }, { name: 'visible', label: 'Visible', type: 'switch', help: 'Show on home page' },
  ] }]],
  'site.hero': ['Home banner', [
    { name: 'top', label: 'Top banner — right side (slides rotate; first image shows first)', type: 'rows', addLabel: 'Add image', newRow: { image: '', alt: '' }, fields: [
      { name: 'image', label: 'Image (landscape, 1600px+ wide)', type: 'image' }, { name: 'alt', label: 'Description (for SEO / screen readers)' },
    ] },
    { name: 'bottom', label: 'Bottom banner — right side', type: 'rows', addLabel: 'Add image', newRow: { image: '', alt: '' }, fields: [
      { name: 'image', label: 'Image (landscape, 1600px+ wide)', type: 'image' }, { name: 'alt', label: 'Description (for SEO / screen readers)' },
    ] },
    { name: 'intervalSeconds', label: 'Seconds per slide', type: 'number', min: 2, max: 30, hint: 'Leave a list empty to use the built-in photo.' },
  ]],
  'funnel.options': ['Funnel options', [
    { name: 'cities', label: 'Cities (step 1)', ...optionRows() },
    { name: 'requirementTypes', label: 'Requirement types (step 2)', ...optionRows([{ name: 'description', label: 'Description' }]) },
    { name: 'possessionOptions', label: 'Possession (step 4)', ...optionRows() },
    { name: 'propertyTypes', label: 'Property types (step 7)', ...optionRows([{ name: 'image', label: 'Image', type: 'image' }]) },
    { name: 'bhkOptions', label: 'Configurations (step 8)', ...optionRows() },
    { name: 'projectTypes', label: 'Project types (step 9)', ...optionRows() },
  ]],
  'estimate.config': ['Estimator', [
    { name: 'residentialSizes', label: 'Residential sizes', ...optionRows() },
    { name: 'commercialTypes', label: 'Commercial space types (asked after carpet area)', ...optionRows([{ name: 'icon', label: 'Icon', hint: 'e.g. Building2, Store, Coffee' }]) },
    { name: 'roundTo', label: 'Round results to nearest ₹', type: 'number' },
    { name: 'areaLimits.min', label: 'Min area (sq ft)', type: 'number' }, { name: 'areaLimits.max', label: 'Max area (sq ft)', type: 'number' },
    { name: 'counterLimits.kitchens.max', label: 'Max kitchens', type: 'number' }, { name: 'counterLimits.bedrooms.max', label: 'Max bedrooms', type: 'number' },
    { name: 'counterLimits.washrooms.max', label: 'Max washrooms', type: 'number' },
    { name: 'disclaimer', label: 'Disclaimer shown with every estimate', type: 'textarea', rows: 3 },
    { name: 'includedRooms', label: 'Rooms included in the base price, per size (JSON)', type: 'json' },
    { name: 'defaultCounters', label: 'Default counter values, per size (JSON)', type: 'json' },
  ]],
  'pricing.config': ['Pricing', [
    { name: 'floorPlanAssistanceCharge', label: 'Expert measurement assistance charge (₹)', type: 'number', min: 0 },
    { name: 'defaultGstPercent', label: 'Default GST % for quotations', type: 'number', min: 0, max: 28 },
  ]],
  'operations.config': ['Operations', [
    { name: 'validityDays', label: 'Quotation validity (days)', type: 'number', nullable: true, hint: 'Leave empty for no expiry' },
    { name: 'reminderHoursBefore', label: 'Site visit reminder (hours before)', type: 'number' },
    { name: 'siteVideosEnabled', label: 'Site videos', type: 'switch', help: 'Allow contractors to upload site videos' },
    { name: 'paymentSchedule', label: 'Default payment schedule for new quotations (must total 100%)', type: 'rows', addLabel: 'Add milestone', newRow: { label: '', percent: 0 }, fields: [{ name: 'label', label: 'Milestone' }, { name: 'percent', label: '%', type: 'number' }] },
  ]],
  'maps.config': ['Google Maps', [
    { name: 'autocompleteEnabled', label: 'Address autocomplete', type: 'switch', help: 'Use Google Places in the booking funnel (key is set on the server)' },
    { name: 'regionCodes', label: 'Country codes', type: 'tags', hint: 'e.g. in' },
  ]],
  'otp.config': ['OTP', [
    { name: 'length', label: 'Code length', type: 'number', min: 4, max: 8 }, { name: 'expiryMinutes', label: 'Expiry (minutes)', type: 'number' },
    { name: 'resendCooldownSeconds', label: 'Resend cooldown (seconds)', type: 'number' }, { name: 'maxAttempts', label: 'Max wrong attempts', type: 'number' },
    { name: 'maxSendsPerHour', label: 'Max codes per hour', type: 'number' },
    { name: 'channels', label: 'Channels', type: 'multiselect', options: [{ value: 'SMS', label: 'SMS' }, { value: 'WHATSAPP', label: 'WhatsApp' }] },
  ]],
  storage: ['Storage', [
    { name: 'active', label: 'Active storage provider', type: 'select', placeholder: false, options: [{ value: 'CLOUDINARY', label: 'Cloudinary' }, { value: 'S3', label: 'AWS S3' }], hint: 'New uploads go to the active provider. Existing files stay where they are.' },
    { name: 'cloudinary.cloudName', label: 'Cloudinary cloud name' }, { name: 'cloudinary.apiKey', label: 'Cloudinary API key' }, secret('cloudinary.apiSecret', 'Cloudinary API secret'), { name: 'cloudinary.folder', label: 'Cloudinary folder' },
    { name: 's3.accessKeyId', label: 'S3 access key' }, secret('s3.secretAccessKey', 'S3 secret key'), { name: 's3.region', label: 'S3 region' }, { name: 's3.bucket', label: 'S3 bucket' },
    { name: 's3.cdnUrl', label: 'CDN URL (optional)' }, { name: 's3.prefix', label: 'Key prefix' },
  ], 'storage'],
  'providers.sms': ['SMS', [
    { name: 'active', label: 'Active SMS provider', type: 'select', placeholder: false, options: ['LOG', 'MSG91', 'TWILIO'], hint: 'LOG only prints to the server log (development).' },
    secret('msg91.authKey', 'MSG91 auth key'), { name: 'msg91.senderId', label: 'MSG91 sender ID' },
    { name: 'twilio.accountSid', label: 'Twilio account SID' }, secret('twilio.authToken', 'Twilio auth token'), { name: 'twilio.from', label: 'Twilio from number' },
  ], 'sms'],
  'providers.whatsapp': ['WhatsApp', [
    { name: 'active', label: 'Active WhatsApp provider', type: 'select', placeholder: false, options: ['LOG', 'META', 'INTERAKT', 'GUPSHUP', 'TWILIO'] },
    secret('meta.accessToken', 'Meta access token'), { name: 'meta.phoneNumberId', label: 'Meta phone number ID' }, { name: 'meta.apiVersion', label: 'Graph API version' },
    secret('interakt.apiKey', 'Interakt API key'),
    secret('gupshup.apiKey', 'Gupshup API key'), { name: 'gupshup.source', label: 'Gupshup source number' }, { name: 'gupshup.appName', label: 'Gupshup app name' },
    { name: 'twilio.accountSid', label: 'Twilio account SID' }, secret('twilio.authToken', 'Twilio auth token'), { name: 'twilio.from', label: 'Twilio WhatsApp from' },
  ], 'whatsapp'],
  'referral.config': ['Refer & Earn', [
    { name: 'enabled', label: 'Programme', type: 'switch', help: 'Open Refer & Earn to customers (join, submit, share links)' },
    { name: 'programName', label: 'Programme name' },
    { name: 'slabs', label: 'Project value slabs — reward per successful referral (1st, 2nd, 3rd…)', type: 'rows', addLabel: 'Add slab', newRow: { key: '', label: '', from: 0, fromInclusive: true, rewards: [] }, fields: [
      { name: 'key', label: 'Key', hint: 'A, B, C…' }, { name: 'label', label: 'Label (shown)', hint: 'e.g. Up to ₹15 lakh' },
      { name: 'from', label: 'Starts at project value (₹)', type: 'number', min: 0, hint: 'First slab must be 0. Slab ends where the next starts.' },
      { name: 'fromInclusive', label: 'Includes start value', type: 'switch', help: 'Value exactly equal to the start belongs to this slab' },
      { name: 'rewards', label: 'Rewards by level (₹)', type: 'tags', hint: 'In order: 1st, 2nd, 3rd referral… e.g. 25000, 45000, 55000' },
    ] },
    { name: 'afterLastLevel', label: 'After the last level', type: 'select', placeholder: false, options: [{ value: 'REPEAT_LAST', label: 'Keep paying the last level amount' }, { value: 'NONE', label: 'No more rewards' }] },
    { name: 'countingPeriod', label: 'Levels are counted', type: 'select', placeholder: false, options: [{ value: 'LIFETIME', label: 'Lifetime (never reset)' }, { value: 'FINANCIAL_YEAR', label: 'Per financial year (resets 1 April)' }, { value: 'CALENDAR_YEAR', label: 'Per calendar year' }] },
    { name: 'payoutTrigger', label: 'Reward qualifies when', type: 'select', placeholder: false, options: [{ value: 'ADVANCE', label: 'Quotation accepted + advance received' }, { value: 'AGREEMENT', label: 'Quotation accepted (agreement) only' }] },
    { name: 'minAdvancePercent', label: 'Qualifying advance (% of project value)', type: 'number', min: 0, max: 100 },
    { name: 'valueBasis', label: 'Project value used for slab', type: 'select', placeholder: false, options: [{ value: 'EXCL_GST', label: 'Excluding GST' }, { value: 'INCL_GST', label: 'Including GST' }] },
    { name: 'maxRedeemPercent', label: 'Wallet credit can pay up to (% of a project)', type: 'number', min: 1, max: 100, hint: 'Rewards are not paid in cash — they become wallet credit for the referrer’s own next project.' },
    { name: 'duplicateWindowDays', label: 'Flag if the customer enquired directly in the last (days)', type: 'number', min: 0 },
    { name: 'maxSubmissionsPerDay', label: 'Max referrals a referrer can submit per day', type: 'number', min: 1 },
    { name: 'terms', label: 'Terms (one per line)', type: 'textarea', rows: 12 },
  ]],
  'providers.payment': ['Online payments', [
    { name: 'active', label: 'Online payment gateway', type: 'select', placeholder: false, options: [{ value: 'NONE', label: 'Off — record offline payments only' }, { value: 'RAZORPAY', label: 'Razorpay' }], hint: 'Customers see a “Pay online” button on their project when Razorpay is on.' },
    { name: 'razorpay.keyId', label: 'Razorpay Key ID', hint: 'rzp_test_… or rzp_live_…' }, secret('razorpay.keySecret', 'Razorpay Key Secret'),
    secret('razorpay.webhookSecret', 'Webhook secret'),
  ], 'payment'],
  'providers.email': ['Email', [
    { name: 'active', label: 'Active email provider', type: 'select', placeholder: false, options: ['LOG', 'SMTP'] },
    { name: 'smtp.host', label: 'SMTP host' }, { name: 'smtp.port', label: 'Port', type: 'number' }, { name: 'smtp.secure', label: 'TLS', type: 'switch', help: 'Use SSL/TLS (port 465)' },
    { name: 'smtp.user', label: 'Username' }, secret('smtp.pass', 'Password'), { name: 'smtp.from', label: 'From address', hint: 'e.g. INSIDER INDIA <hello@yourdomain.in>' },
  ], 'email'],
};

function ProviderTest({ kind }) {
  const [to, setTo] = useState('');
  const [tpl, setTpl] = useState('');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true); setMsg(null);
    try { const r = kind === 'storage' ? await api('/admin/settings/storage/test', { method: 'POST' }) : await api(`/admin/settings/providers/${kind}/test`, { method: 'POST', body: { to, templateName: tpl || undefined } }); setMsg({ tone: 'success', text: r.message }); } catch (x) { setMsg({ tone: 'error', text: x.message }); } finally { setBusy(false); }
  };
  return (
    <Box title="Test connection" className="mt-4">
      <p className="mb-3 text-sm text-graphite">{kind === 'storage' ? 'Uploads, signs and deletes a 1-pixel image with the saved settings.' : kind === 'payment' ? 'Checks the saved Razorpay keys (no money moves). Webhook URL for the Razorpay dashboard: <your API domain>/api/v1/payments/razorpay/webhook — events payment.captured, order.paid, payment.failed.' : 'Sends a test message with the saved settings. Save first.'}</p>
      <div className="flex flex-wrap gap-2">
        {kind !== 'storage' && kind !== 'payment' && <input aria-label="Recipient" className="h-9 w-64 rounded-none border border-stone-deep bg-paper px-3 text-sm" placeholder={kind === 'email' ? 'you@example.com' : '10-digit mobile'} value={to} onChange={(e) => setTo(e.target.value)} />}
        {kind === 'whatsapp' && <input aria-label="Template name" className="h-9 w-56 rounded-none border border-stone-deep bg-paper px-3 text-sm" placeholder="Approved template (optional)" value={tpl} onChange={(e) => setTpl(e.target.value)} />}
        <Button size="sm" variant="secondary" onClick={run} loading={busy}>Run test</Button>
      </div>
      {msg && <Notice tone={msg.tone} className="mt-3">{msg.text}</Notice>}
    </Box>
  );
}

function SettingForm({ settingKey }) {
  const user = useAuth((s) => s.user);
  const { data, error, loading, reload } = useApi(`/admin/settings/${settingKey}`);
  const [value, setValue] = useState(null);
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (data) setValue(data.value); }, [data]);
  if (loading || !value) return error ? <Failed error={error} retry={reload} /> : <Loader />;
  const [, fields, test] = SCHEMAS[settingKey];
  const save = async () => {
    setBusy(true); setMsg(null); setErrors({});
    try { const r = await api(`/admin/settings/${settingKey}`, { method: 'PUT', body: { value, reason: reason || undefined } }); setValue(r.data.value); setReason(''); setMsg({ tone: 'success', text: 'Saved' }); } catch (x) {
      setErrors(Object.fromEntries((x.errors || []).map((e) => [e.field, e.message])));
      setMsg({ tone: 'error', text: x.errors?.length ? `${x.message}: ${x.errors.slice(0, 4).map((e) => `${e.field} — ${e.message}`).join('; ')}` : x.message });
    } finally { setBusy(false); }
  };
  const manage = can(user, 'settings.manage');
  return (
    <>
      <Box>
        <fieldset disabled={!manage}><Fields fields={fields} value={value} onChange={setValue} errors={errors} /></fieldset>
        {manage && (
          <div className="mt-6 flex flex-wrap items-end gap-3 border-t border-stone pt-4">
            <label className="flex-1 text-xs text-graphite">Reason for change (audit log)<input className="mt-1 w-full rounded-none border border-stone-deep bg-paper px-3 py-2 text-sm" value={reason} onChange={(e) => setReason(e.target.value)} /></label>
            <Button onClick={save} loading={busy}>Save settings</Button>
          </div>
        )}
        {msg && <Notice tone={msg.tone} className="mt-3">{msg.text}</Notice>}
      </Box>
      {test && manage && <ProviderTest kind={test} />}
    </>
  );
}

export default function Settings() {
  const { data, error, loading, reload } = useApi('/admin/settings');
  const [tab, setTab] = useState('company.profile');
  if (loading) return <Loader />;
  if (error) return <Failed error={error} retry={reload} />;
  const keys = data.keys.filter((k) => SCHEMAS[k]);
  return (
    <>
      <Header title="Settings" subtitle={data.logProvidersAllowed ? 'LOG providers are allowed on this server (development).' : undefined} />
      <Tabs tabs={keys.map((k) => [k, SCHEMAS[k][0]])} value={tab} onChange={setTab} />
      <SettingForm key={tab} settingKey={tab} />
    </>
  );
}
