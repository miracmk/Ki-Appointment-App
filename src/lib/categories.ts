import type { MarketplaceCategory } from '@/types/marketplace';

export interface CategoryMeta {
  id: MarketplaceCategory;
  label: string;
  labelTr: string;
  description: string;
  icon: string;
  color: 'cyan' | 'blue' | 'purple' | 'pink' | 'green' | 'orange';
  subSpecialties: string[];
}

export const CATEGORIES: CategoryMeta[] = [
  {
    id: 'accounting_tax',
    label: 'Accounting & Tax',
    labelTr: 'Muhasebe & Vergi',
    description: 'Financial reporting, tax planning, auditing and compliance services.',
    icon: '📊',
    color: 'cyan',
    subSpecialties: [
      'Corporate Tax', 'VAT Consulting', 'Financial Reporting',
      'Audit & Compliance', 'Payroll Services', 'Transfer Pricing',
    ],
  },
  {
    id: 'law_corporate',
    label: 'Law & Corporate Law',
    labelTr: 'Hukuk & Şirket Hukuku',
    description: 'Corporate governance, contracts, M&A, and legal compliance.',
    icon: '⚖️',
    color: 'purple',
    subSpecialties: [
      'Contract Law', 'M&A Advisory', 'Corporate Governance',
      'Labor Law', 'Commercial Litigation', 'Due Diligence',
    ],
  },
  {
    id: 'immigration_visa',
    label: 'Immigration & Visa',
    labelTr: 'Göç & Vize',
    description: 'Work permits, residence visas, citizenship and relocation services.',
    icon: '✈️',
    color: 'blue',
    subSpecialties: [
      'Work Permits', 'Investor Visas', 'Family Reunion',
      'Citizenship by Investment', 'Relocation Advisory', 'Asylum Services',
    ],
  },
  {
    id: 'financial_investment',
    label: 'Financial & Investment',
    labelTr: 'Finansal & Yatırım',
    description: 'Investment strategy, portfolio management, and financial planning.',
    icon: '💹',
    color: 'green',
    subSpecialties: [
      'Investment Strategy', 'Portfolio Management', 'Financial Planning',
      'Risk Analysis', 'Private Equity', 'Startup Funding',
    ],
  },
  {
    id: 'customs_trade',
    label: 'Customs & Foreign Trade',
    labelTr: 'Gümrük & Dış Ticaret',
    description: 'Import/export compliance, customs clearance, and trade regulations.',
    icon: '🚢',
    color: 'orange',
    subSpecialties: [
      'Import Advisory', 'Export Compliance', 'Customs Classification',
      'Trade Finance', 'Free Trade Zones', 'Sanctions Compliance',
    ],
  },
  {
    id: 'trademark_ip',
    label: 'Trademark & IP',
    labelTr: 'Marka & Fikri Mülkiyet',
    description: 'Trademark registration, patent protection, and IP strategy.',
    icon: '™️',
    color: 'pink',
    subSpecialties: [
      'Trademark Registration', 'Patent Filing', 'IP Strategy',
      'Brand Protection', 'Copyright Law', 'Domain Disputes',
    ],
  },
];

export function getCategoryMeta(id: MarketplaceCategory): CategoryMeta | undefined {
  return CATEGORIES.find((c) => c.id === id);
}

export function getCategoryLabel(id: MarketplaceCategory): string {
  return getCategoryMeta(id)?.label ?? id;
}
