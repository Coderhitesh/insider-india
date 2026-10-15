import { SITE_URL } from './config';

export function pageMetadata({ title, description, path = '/', images, noindex = false }) {
  const url = `${SITE_URL}${path}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: 'website', locale: 'en_IN', ...(images ? { images } : {}) },
    twitter: { card: 'summary_large_image', title, description },
    ...(noindex ? { robots: { index: false, follow: false } } : {}),
  };
}

export const breadcrumbLd = (items) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: `${SITE_URL}${it.path}` })),
});

export const faqLd = (faqs) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })),
});

export const serviceLd = ({ name, description, path, company }) => ({
  '@context': 'https://schema.org',
  '@type': 'Service',
  name,
  description,
  url: `${SITE_URL}${path}`,
  serviceType: 'Interior design',
  provider: { '@type': 'Organization', name: company.name, url: SITE_URL },
  areaServed: { '@type': 'Country', name: 'India' },
});

// Only includes fields the business has actually filled in via Admin settings.
export function localBusinessLd(company) {
  const ld = { '@context': 'https://schema.org', '@type': 'HomeAndConstructionBusiness', name: company.name, url: SITE_URL };
  if (company.logoUrl) ld.logo = company.logoUrl;
  if (company.phone) ld.telephone = company.phone;
  if (company.email) ld.email = company.email;
  if (company.address) ld.address = { '@type': 'PostalAddress', streetAddress: company.address, addressCountry: 'IN' };
  const sameAs = Object.values(company.social || {}).filter(Boolean);
  if (sameAs.length) ld.sameAs = sameAs;
  return ld;
}
