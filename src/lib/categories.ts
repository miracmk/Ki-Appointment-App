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

// ─── Detailed Specialties per Category ───────────────────────────────────────
// Used in listing creation. Each specialty has a stable id (stored in Firestore)
// and a human-readable label.
// requiresKyc: true means the consultant must have verified credentials before
// the listing can go live (regulated professions: accounting, law, licensed finance).

export interface SpecialtyOption {
  id: string;
  label: string;
  requiresKyc: boolean;
}

export const SPECIALTIES: Record<MarketplaceCategory, SpecialtyOption[]> = {
  accounting_tax: [
    { id: 'corporate_tax',        label: 'Corporate Tax Advisory',           requiresKyc: false },
    { id: 'personal_income_tax',  label: 'Personal Income Tax Consulting',   requiresKyc: false },
    { id: 'vat_indirect_tax',     label: 'VAT & Indirect Tax Advisory',      requiresKyc: false },
    { id: 'transfer_pricing',     label: 'Transfer Pricing Consulting',      requiresKyc: false },
    { id: 'intl_tax_planning',    label: 'International Tax Planning',       requiresKyc: false },
    { id: 'ma_tax',               label: 'Mergers & Acquisitions Tax',       requiresKyc: false },
    { id: 'tax_compliance',       label: 'Tax Compliance & Filing',          requiresKyc: false },
    { id: 'audit_support',        label: 'Audit Support & Preparation',      requiresKyc: false },
    { id: 'bookkeeping',          label: 'Bookkeeping & Accounting',         requiresKyc: false },
    { id: 'financial_statements', label: 'Financial Statement Preparation',  requiresKyc: false },
    { id: 'payroll_tax',          label: 'Payroll Tax Advisory',             requiresKyc: false },
    { id: 'tax_dispute',          label: 'Tax Dispute Resolution',           requiresKyc: false },
    { id: 'crypto_tax',           label: 'Cryptocurrency Tax Advisory',      requiresKyc: false },
    { id: 'real_estate_tax',      label: 'Real Estate Tax Consulting',       requiresKyc: false },
  ],
  law_corporate: [
    { id: 'contract_review',       label: 'Contract Drafting & Review',            requiresKyc: false },
    { id: 'corporate_governance',  label: 'Corporate Governance',                  requiresKyc: false },
    { id: 'ma_legal',              label: 'Mergers & Acquisitions (Legal)',         requiresKyc: false },
    { id: 'commercial_litigation', label: 'Commercial Litigation',                 requiresKyc: false },
    { id: 'employment_law',        label: 'Employment & Labor Law',                requiresKyc: false },
    { id: 'shareholder_agr',       label: 'Shareholder Agreements',               requiresKyc: false },
    { id: 'company_formation',     label: 'Company Formation & Registration',      requiresKyc: false },
    { id: 'joint_venture',         label: 'Joint Venture Agreements',             requiresKyc: false },
    { id: 'regulatory_compliance', label: 'Regulatory Compliance',                requiresKyc: false },
    { id: 'arbitration',           label: 'Dispute Resolution & Arbitration',     requiresKyc: false },
    { id: 'gdpr_data',             label: 'Data Protection & Privacy (GDPR)',      requiresKyc: false },
    { id: 'debt_recovery',         label: 'Debt Recovery & Collections',          requiresKyc: false },
    { id: 'real_estate_law',       label: 'Real Estate Law',                      requiresKyc: false },
    { id: 'startup_legal',         label: 'Startup Legal Advisory',               requiresKyc: false },
  ],
  immigration_visa: [
    { id: 'us_b1b2',              label: 'US Tourist & Business Visa (B1/B2)',       requiresKyc: false },
    { id: 'us_f1_student',        label: 'US Student Visa (F-1)',                    requiresKyc: false },
    { id: 'us_h1b_work',          label: 'US Work Visa (H-1B, L-1, O-1)',            requiresKyc: false },
    { id: 'us_eb5_investor',      label: 'US Investor Visa (EB-5)',                  requiresKyc: false },
    { id: 'us_green_card',        label: 'US Green Card & Permanent Residency',      requiresKyc: false },
    { id: 'canada_pr',            label: 'Canada PR & Express Entry',                requiresKyc: false },
    { id: 'canada_work_permit',   label: 'Canada Work Permit & LMIA',               requiresKyc: false },
    { id: 'uk_skilled_worker',    label: 'UK Skilled Worker Visa',                  requiresKyc: false },
    { id: 'uk_student',           label: 'UK Student Visa',                         requiresKyc: false },
    { id: 'uk_investor',          label: 'UK Investor & Innovator Visa',             requiresKyc: false },
    { id: 'schengen_visa',        label: 'Schengen Visa Applications',               requiresKyc: false },
    { id: 'eu_citizenship',       label: 'EU Citizenship & Long-Term Residency',     requiresKyc: false },
    { id: 'golden_visa_portugal', label: 'Portugal Golden Visa',                     requiresKyc: false },
    { id: 'golden_visa_uae',      label: 'UAE Golden Visa',                          requiresKyc: false },
    { id: 'golden_visa_greece',   label: 'Greece Golden Visa',                       requiresKyc: false },
    { id: 'digital_nomad_visa',   label: 'Digital Nomad Visa Advisory',              requiresKyc: false },
    { id: 'family_reunification', label: 'Family Reunification Visa',                requiresKyc: false },
    { id: 'asylum_refugee',       label: 'Asylum & Refugee Status',                  requiresKyc: false },
    { id: 'citizenship_invest',   label: 'Citizenship by Investment (CBI)',          requiresKyc: false },
    { id: 'work_permit_general',  label: 'General Work Permit Applications',         requiresKyc: false },
  ],
  financial_investment: [
    { id: 'portfolio_mgmt',       label: 'Portfolio Management Advisory',      requiresKyc: false },
    { id: 'real_estate_inv',      label: 'Real Estate Investment Consulting',   requiresKyc: false },
    { id: 'startup_vc',           label: 'Startup & Venture Capital Advisory',  requiresKyc: false },
    { id: 'private_equity',       label: 'Private Equity Consulting',           requiresKyc: false },
    { id: 'forex_risk',           label: 'Forex & Currency Risk Management',    requiresKyc: false },
    { id: 'crypto_digital',       label: 'Cryptocurrency & Digital Assets',     requiresKyc: false },
    { id: 'retirement_pension',   label: 'Retirement & Pension Planning',       requiresKyc: false },
    { id: 'insurance_risk',       label: 'Insurance & Risk Management',         requiresKyc: false },
    { id: 'corporate_finance',    label: 'Corporate Finance Advisory',          requiresKyc: false },
    { id: 'fundraising_capital',  label: 'Fundraising & Capital Raising',       requiresKyc: false },
    { id: 'due_diligence',        label: 'Due Diligence Advisory',              requiresKyc: false },
    { id: 'esg_investing',        label: 'ESG & Sustainable Investing',         requiresKyc: false },
    { id: 'wealth_management',    label: 'Wealth Management',                   requiresKyc: false },
    { id: 'ipo_advisory',         label: 'IPO & Public Markets Advisory',       requiresKyc: false },
    { id: 'debt_restructuring',   label: 'Debt Restructuring Advisory',         requiresKyc: false },
  ],
  customs_trade: [
    { id: 'import_procedures',    label: 'Import Procedures & Advisory',                requiresKyc: false },
    { id: 'export_compliance',    label: 'Export Compliance & Documentation',           requiresKyc: false },
    { id: 'customs_clearance',    label: 'Customs Clearance Advisory',                  requiresKyc: false },
    { id: 'hs_code',              label: 'HS Code & Tariff Classification',              requiresKyc: false },
    { id: 'trade_compliance',     label: 'Trade Compliance & Regulations',              requiresKyc: false },
    { id: 'aeo_consulting',       label: 'AEO (Authorized Economic Operator)',          requiresKyc: false },
    { id: 'incoterms',            label: 'Incoterms & Delivery Terms Advisory',         requiresKyc: false },
    { id: 'fta_advisory',         label: 'Free Trade Agreement (FTA) Advisory',        requiresKyc: false },
    { id: 'anti_dumping',         label: 'Anti-Dumping & Countervailing Duties',        requiresKyc: false },
    { id: 'trade_finance_lc',     label: 'Letters of Credit & Trade Finance',           requiresKyc: false },
    { id: 'supply_chain_opt',     label: 'Logistics & Supply Chain Optimization',       requiresKyc: false },
    { id: 'sanctions_compliance', label: 'Trade Sanctions Compliance',                  requiresKyc: false },
    { id: 'cross_border_ecom',    label: 'Cross-Border E-commerce',                     requiresKyc: false },
    { id: 'free_trade_zones',     label: 'Free Trade Zone Advisory',                    requiresKyc: false },
    { id: 'customs_valuation',    label: 'Customs Valuation Disputes',                  requiresKyc: false },
  ],
  trademark_ip: [
    { id: 'trademark_domestic',   label: 'Trademark Registration (Domestic)',          requiresKyc: false },
    { id: 'trademark_eu',         label: 'EU Trademark Registration (EUIPO)',           requiresKyc: false },
    { id: 'trademark_us',         label: 'US Trademark Registration (USPTO)',           requiresKyc: false },
    { id: 'trademark_madrid',     label: 'International Trademark (Madrid System)',     requiresKyc: false },
    { id: 'patent_filing',        label: 'Patent Filing & Advisory',                   requiresKyc: false },
    { id: 'patent_intl_pct',      label: 'International Patent (PCT Application)',      requiresKyc: false },
    { id: 'copyright_protection', label: 'Copyright Registration & Protection',        requiresKyc: false },
    { id: 'trade_secret',         label: 'Trade Secret Protection',                    requiresKyc: false },
    { id: 'ip_portfolio',         label: 'IP Portfolio Management',                    requiresKyc: false },
    { id: 'brand_protection',     label: 'Brand Protection Strategy',                  requiresKyc: false },
    { id: 'ip_licensing',         label: 'IP Licensing & Agreements',                  requiresKyc: false },
    { id: 'domain_disputes',      label: 'Domain Name Disputes (UDRP)',                requiresKyc: false },
    { id: 'ip_infringement',      label: 'Counterfeit & Infringement Actions',         requiresKyc: false },
    { id: 'design_registration',  label: 'Industrial Design Registration',             requiresKyc: false },
    { id: 'software_ip',          label: 'Software IP & Technology Law',               requiresKyc: false },
  ],
};

export function specialtyRequiresKyc(categoryId: MarketplaceCategory, specialtyId: string): boolean {
  return SPECIALTIES[categoryId]?.find((s) => s.id === specialtyId)?.requiresKyc ?? false;
}
