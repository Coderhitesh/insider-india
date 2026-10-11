// Editorial content and image slots. No statistics, testimonials or claims live here —
// those come from the Admin panel. Add real photography by placing files in /public/images
// and setting the paths below (or use Cloudinary/S3 URLs).
export const IMAGES = {
  hero: null, // e.g. '/images/hero-living.jpg'
  interiors: null,
  kitchen: null,
  wardrobes: null,
  renovation: null,
  commercial: null,
  about: null,
};

export const NAV = [
  { href: '/interiors', label: 'Full home' },
  { href: '/kitchen', label: 'Kitchens' },
  { href: '/wardrobes', label: 'Wardrobes' },
  { href: '/renovation', label: 'Renovation' },
  { href: '/commercial-interiors', label: 'Commercial' },
  { href: '/packages', label: 'Packages' },
  { href: '/projects', label: 'Projects' },
  { href: '/how-it-works', label: 'How it works' },
];

// Shorter list for the desktop header; the full list lives in the mobile menu and footer.
export const HEADER_NAV = NAV.filter((n) => !['/commercial-interiors', '/how-it-works'].includes(n.href));

export const PROCESS = [
  { title: 'Tell us your requirements', body: 'Share your home, the rooms you want done and a rough budget. It takes a few minutes.' },
  { title: 'Get an indicative estimate', body: 'See a package-based budget range straight away — useful for planning, not a final price.' },
  { title: 'Book a site visit', body: 'An expert is assigned to your home and schedules a visit at a time that suits you.' },
  { title: 'Measurements & design consultation', body: 'We measure every room, study the site condition and talk through layouts, materials and finishes.' },
  { title: 'Receive a detailed quotation', body: 'Room-by-room, item-by-item pricing with materials, dimensions and quantities — reviewed by our team before it reaches you.' },
  { title: 'Approve the project', body: 'Accept the quotation online, or ask for changes. Every revision stays in your dashboard.' },
  { title: 'Execution begins', body: 'Design sign-off, material selection, production and site work, with progress updates in your dashboard.' },
  { title: 'Final handover', body: 'A quality check, a walkthrough of your finished home, and your warranty documents.' },
];

export const BENEFITS = [
  { title: 'Transparent quotation', body: 'Every item is listed with its material, finish, dimensions, quantity and rate. No lump sums.' },
  { title: 'Expert site measurements', body: 'Final pricing is based on measurements taken at your home, never on estimates alone.' },
  { title: 'Premium materials', body: 'Packages are defined by the materials, hardware and fittings that go into them.' },
  { title: 'Dedicated project manager', body: 'One point of contact from design sign-off to handover.' },
  { title: 'Warranty protection', body: 'Warranty cover depends on the package you choose and is documented at handover.' },
  { title: 'Verified contractors', body: 'Site work is carried out by experts assigned and supervised by our team.' },
  { title: 'Structured project tracking', body: 'Stages, milestones, payments and site photos in one dashboard.' },
];

export const SOLUTIONS = [
  { href: '/interiors', title: 'Full home interiors', body: 'Every room planned together, so the home reads as one.', tone: 'oak', category: 'FULL_HOME' },
  { href: '/kitchen', title: 'Modular kitchens', body: 'Layouts built around how you cook and store.', tone: 'charcoal', category: 'MODULAR_KITCHEN' },
  { href: '/wardrobes', title: 'Wardrobes & storage', body: 'Made to measure, from floor to loft.', tone: 'sand', category: 'WARDROBE' },
  { href: '/renovation', title: 'Renovation', body: 'Civil work and interiors under one plan.', tone: 'terracotta', category: 'RENOVATION' },
  { href: '/commercial-interiors', title: 'Commercial interiors', body: 'Offices, studios and retail spaces.', tone: 'stone', category: 'COMMERCIAL' },
];

export const PROJECT_CATEGORIES = [
  { value: '', label: 'All' },
  { value: 'FULL_HOME', label: 'Full home' },
  { value: 'MODULAR_KITCHEN', label: 'Modular kitchen' },
  { value: 'BEDROOM', label: 'Bedroom' },
  { value: 'WARDROBE', label: 'Wardrobe' },
  { value: 'LIVING_ROOM', label: 'Living room' },
  { value: 'RENOVATION', label: 'Renovation' },
  { value: 'COMMERCIAL', label: 'Commercial' },
];

export const SERVICE_PAGES = {
  interiors: {
    path: '/interiors', image: 'interiors', tone: 'oak', category: 'FULL_HOME',
    title: 'Full home interiors', metaTitle: 'Full home interior design',
    lede: 'Living, dining, bedrooms, kitchen and storage planned as one home — measured on site and priced item by item.',
    includes: ['Space planning for every room', 'Modular kitchen and wardrobes', 'Living and TV units, pooja units, false ceiling and wall panelling', 'Painting, lighting plan and loose furniture selection', 'Site supervision through to handover'],
    points: [
      { title: 'One design language', body: 'Materials, colours and proportions are chosen for the whole home, so rooms connect instead of competing.' },
      { title: 'Measured, then priced', body: 'Your final quotation is built from measurements taken at your home, room by room.' },
      { title: 'A package to anchor the budget', body: 'Choose a package for the finish level; your quotation shows exactly what is included.' },
    ],
  },
  kitchen: {
    path: '/kitchen', image: 'kitchen', tone: 'charcoal', category: 'MODULAR_KITCHEN',
    title: 'Modular kitchens', metaTitle: 'Modular kitchen design',
    lede: 'Kitchens planned around how you cook, clean and store — with carcass, shutter, hardware and countertop choices spelled out.',
    includes: ['Layout planning (straight, L, U, parallel, island)', 'Base, wall and tall units', 'Shutter finishes and hardware options', 'Countertop, backsplash and sink planning', 'Appliance and chimney integration'],
    points: [
      { title: 'Work triangle first', body: 'We plan hob, sink and storage positions before choosing finishes.' },
      { title: 'Hardware you can name', body: 'Hinges, channels and fittings are listed on your quotation, not left as a line item.' },
      { title: 'Measured to the millimetre', body: 'Site measurements account for plumbing, electrical points and wall conditions.' },
    ],
  },
  wardrobes: {
    path: '/wardrobes', image: 'wardrobes', tone: 'sand', category: 'WARDROBE',
    title: 'Wardrobes & storage', metaTitle: 'Custom wardrobes and storage',
    lede: 'Hinged, sliding and walk-in wardrobes, lofts and storage units, sized to your walls and the way you store.',
    includes: ['Hinged, sliding and walk-in wardrobes', 'Internal layouts: drawers, hanging, shelves, accessories', 'Lofts and overhead storage', 'Crockery, shoe and utility storage', 'Study and bookshelf units'],
    points: [
      { title: 'Inside matters most', body: 'We design the internal layout around what you own before the outside finish.' },
      { title: 'Every wall measured', body: 'Floor-to-ceiling units are sized from site measurements, not catalogue sizes.' },
      { title: 'Finishes you can see', body: 'Material and finish options are shown on samples during your consultation.' },
    ],
  },
  renovation: {
    path: '/renovation', image: 'renovation', tone: 'terracotta', category: 'RENOVATION',
    title: 'Renovation', metaTitle: 'Home renovation and civil work',
    lede: 'Civil changes and new interiors under one plan, for resale homes and homes that need more than a refresh.',
    includes: ['Site assessment of existing condition', 'Civil work: wall changes, flooring, bathrooms', 'Electrical and plumbing updates', 'New interiors across rooms', 'Painting and finishing'],
    points: [
      { title: 'Condition assessed first', body: 'The site visit records the current condition so the scope reflects what your home actually needs.' },
      { title: 'Civil and interiors together', body: 'One quotation covers both, sequenced so work is not redone.' },
      { title: 'Clear stages', body: 'Track demolition, civil, carpentry and finishing as separate stages in your dashboard.' },
    ],
  },
  commercial: {
    path: '/commercial-interiors', image: 'commercial', tone: 'stone', category: 'COMMERCIAL',
    title: 'Commercial interiors', metaTitle: 'Commercial and office interiors',
    lede: 'Offices, studios, clinics and retail spaces, planned around how your team and customers use the space.',
    includes: ['Workspace and circulation planning', 'Reception, meeting and work areas', 'Storage and display units', 'False ceiling, lighting and wall finishes', 'Execution with minimal disruption'],
    points: [
      { title: 'Planned by area', body: 'Commercial projects are priced by area and scope after a site visit.' },
      { title: 'Brand-aware finishes', body: 'Materials and colours chosen to suit your brand and how the space is used.' },
      { title: 'Scheduled execution', body: 'Work stages are planned to fit your operating hours where possible.' },
    ],
  },
};
