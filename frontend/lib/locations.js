// Areas served — Delhi first, then NCR. Each gets an SEO page at /interior-designer/<slug>.
const AREAS = [
  // South Delhi
  ['South Delhi', 'Delhi'], ['Greater Kailash', 'South Delhi'], ['Defence Colony', 'South Delhi'], ['Hauz Khas', 'South Delhi'],
  ['Saket', 'South Delhi'], ['Vasant Kunj', 'South Delhi'], ['Vasant Vihar', 'South Delhi'], ['Lajpat Nagar', 'South Delhi'],
  ['Malviya Nagar', 'South Delhi'], ['Kalkaji', 'South Delhi'], ['Chhatarpur', 'South Delhi'], ['Safdarjung Enclave', 'South Delhi'],
  ['Green Park', 'South Delhi'], ['Panchsheel Park', 'South Delhi'], ['Sainik Farm', 'South Delhi'], ['Jangpura', 'South Delhi'],
  // Central & New Delhi
  ['Connaught Place', 'Central Delhi'], ['Karol Bagh', 'Central Delhi'], ['Chanakyapuri', 'New Delhi'], ['Golf Links', 'New Delhi'],
  // West Delhi
  ['West Delhi', 'Delhi'], ['Rajouri Garden', 'West Delhi'], ['Punjabi Bagh', 'West Delhi'], ['Paschim Vihar', 'West Delhi'],
  ['Janakpuri', 'West Delhi'], ['Dwarka', 'South West Delhi'], ['Vikaspuri', 'West Delhi'], ['Patel Nagar', 'West Delhi'], ['Kirti Nagar', 'West Delhi'],
  // North Delhi
  ['North Delhi', 'Delhi'], ['Pitampura', 'North West Delhi'], ['Rohini', 'North West Delhi'], ['Model Town', 'North Delhi'],
  ['Ashok Vihar', 'North West Delhi'], ['Shalimar Bagh', 'North West Delhi'], ['Civil Lines', 'North Delhi'],
  // East Delhi
  ['East Delhi', 'Delhi'], ['Mayur Vihar', 'East Delhi'], ['Preet Vihar', 'East Delhi'], ['Laxmi Nagar', 'East Delhi'],
  ['Patparganj', 'East Delhi'], ['Vivek Vihar', 'East Delhi'],
  // NCR
  ['Noida', 'NCR'], ['Greater Noida', 'NCR'], ['Noida Extension', 'NCR'], ['Gurugram', 'NCR'], ['Ghaziabad', 'NCR'],
  ['Indirapuram', 'Ghaziabad'], ['Faridabad', 'NCR'],
];

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export const LOCATIONS = AREAS.map(([name, region]) => ({ name, region, slug: `interior-designer-in-${slugify(name)}` }));
export const locationBySlug = (slug) => LOCATIONS.find((l) => l.slug === slug) || null;
export const nearby = (loc, n = 8) => {
  const same = LOCATIONS.filter((l) => l.slug !== loc.slug && (l.region === loc.region || l.region === loc.name || loc.region === l.name));
  const rest = LOCATIONS.filter((l) => l.slug !== loc.slug && !same.includes(l));
  return [...same, ...rest].slice(0, n);
};
