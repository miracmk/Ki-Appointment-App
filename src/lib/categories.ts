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

export interface SpecialtyOption {
  id: string;
  label: string;
}

export const SPECIALTIES: Record<MarketplaceCategory, SpecialtyOption[]> = {
  accounting_tax: [
    { id: 'corporate_tax',        label: 'Corporate Tax Advisory' },
    { id: 'personal_income_tax',  label: 'Personal Income Tax Consulting' },
    { id: 'vat_indirect_tax',     label: 'VAT & Indirect Tax Advisory' },
    { id: 'transfer_pricing',     label: 'Transfer Pricing Consulting' },
    { id: 'intl_tax_planning',    label: 'International Tax Planning' },
    { id: 'ma_tax',               label: 'Mergers & Acquisitions Tax' },
    { id: 'tax_compliance',       label: 'Tax Compliance & Filing' },
    { id: 'audit_support',        label: 'Audit Support & Preparation' },
    { id: 'bookkeeping',          label: 'Bookkeeping & Accounting' },
    { id: 'financial_statements', label: 'Financial Statement Preparation' },
    { id: 'payroll_tax',          label: 'Payroll Tax Advisory' },
    { id: 'tax_dispute',          label: 'Tax Dispute Resolution' },
    { id: 'crypto_tax',           label: 'Cryptocurrency Tax Advisory' },
    { id: 'real_estate_tax',      label: 'Real Estate Tax Consulting' },
  ],
  law_corporate: [
    { id: 'contract_review',       label: 'Contract Drafting & Review' },
    { id: 'corporate_governance',  label: 'Corporate Governance' },
    { id: 'ma_legal',              label: 'Mergers & Acquisitions (Legal)' },
    { id: 'commercial_litigation', label: 'Commercial Litigation' },
    { id: 'employment_law',        label: 'Employment & Labor Law' },
    { id: 'shareholder_agr',       label: 'Shareholder Agreements' },
    { id: 'company_formation',     label: 'Company Formation & Registration' },
    { id: 'joint_venture',         label: 'Joint Venture Agreements' },
    { id: 'regulatory_compliance', label: 'Regulatory Compliance' },
    { id: 'arbitration',           label: 'Dispute Resolution & Arbitration' },
    { id: 'gdpr_data',             label: 'Data Protection & Privacy (GDPR)' },
    { id: 'debt_recovery',         label: 'Debt Recovery & Collections' },
    { id: 'real_estate_law',       label: 'Real Estate Law' },
    { id: 'startup_legal',         label: 'Startup Legal Advisory' },
  ],
  immigration_visa: [
    { id: 'us_b1b2',              label: 'US Tourist & Business Visa (B1/B2)' },
    { id: 'us_f1_student',        label: 'US Student Visa (F-1)' },
    { id: 'us_h1b_work',          label: 'US Work Visa (H-1B, L-1, O-1)' },
    { id: 'us_eb5_investor',      label: 'US Investor Visa (EB-5)' },
    { id: 'us_green_card',        label: 'US Green Card & Permanent Residency' },
    { id: 'canada_pr',            label: 'Canada PR & Express Entry' },
    { id: 'canada_work_permit',   label: 'Canada Work Permit & LMIA' },
    { id: 'uk_skilled_worker',    label: 'UK Skilled Worker Visa' },
    { id: 'uk_student',           label: 'UK Student Visa' },
    { id: 'uk_investor',          label: 'UK Investor & Innovator Visa' },
    { id: 'schengen_visa',        label: 'Schengen Visa Applications' },
    { id: 'eu_citizenship',       label: 'EU Citizenship & Long-Term Residency' },
    { id: 'golden_visa_portugal', label: 'Portugal Golden Visa' },
    { id: 'golden_visa_uae',      label: 'UAE Golden Visa' },
    { id: 'golden_visa_greece',   label: 'Greece Golden Visa' },
    { id: 'digital_nomad_visa',   label: 'Digital Nomad Visa Advisory' },
    { id: 'family_reunification', label: 'Family Reunification Visa' },
    { id: 'asylum_refugee',       label: 'Asylum & Refugee Status' },
    { id: 'citizenship_invest',   label: 'Citizenship by Investment (CBI)' },
    { id: 'work_permit_general',  label: 'General Work Permit Applications' },
  ],
  financial_investment: [
    { id: 'portfolio_mgmt',       label: 'Portfolio Management Advisory' },
    { id: 'real_estate_inv',      label: 'Real Estate Investment Consulting' },
    { id: 'startup_vc',           label: 'Startup & Venture Capital Advisory' },
    { id: 'private_equity',       label: 'Private Equity Consulting' },
    { id: 'forex_risk',           label: 'Forex & Currency Risk Management' },
    { id: 'crypto_digital',       label: 'Cryptocurrency & Digital Assets' },
    { id: 'retirement_pension',   label: 'Retirement & Pension Planning' },
    { id: 'insurance_risk',       label: 'Insurance & Risk Management' },
    { id: 'corporate_finance',    label: 'Corporate Finance Advisory' },
    { id: 'fundraising_capital',  label: 'Fundraising & Capital Raising' },
    { id: 'due_diligence',        label: 'Due Diligence Advisory' },
    { id: 'esg_investing',        label: 'ESG & Sustainable Investing' },
    { id: 'wealth_management',    label: 'Wealth Management' },
    { id: 'ipo_advisory',         label: 'IPO & Public Markets Advisory' },
    { id: 'debt_restructuring',   label: 'Debt Restructuring Advisory' },
  ],
  customs_trade: [
    { id: 'import_procedures',    label: 'Import Procedures & Advisory' },
    { id: 'export_compliance',    label: 'Export Compliance & Documentation' },
    { id: 'customs_clearance',    label: 'Customs Clearance Advisory' },
    { id: 'hs_code',              label: 'HS Code & Tariff Classification' },
    { id: 'trade_compliance',     label: 'Trade Compliance & Regulations' },
    { id: 'aeo_consulting',       label: 'AEO (Authorized Economic Operator)' },
    { id: 'incoterms',            label: 'Incoterms & Delivery Terms Advisory' },
    { id: 'fta_advisory',         label: 'Free Trade Agreement (FTA) Advisory' },
    { id: 'anti_dumping',         label: 'Anti-Dumping & Countervailing Duties' },
    { id: 'trade_finance_lc',     label: 'Letters of Credit & Trade Finance' },
    { id: 'supply_chain_opt',     label: 'Logistics & Supply Chain Optimization' },
    { id: 'sanctions_compliance', label: 'Trade Sanctions Compliance' },
    { id: 'cross_border_ecom',    label: 'Cross-Border E-commerce' },
    { id: 'free_trade_zones',     label: 'Free Trade Zone Advisory' },
    { id: 'customs_valuation',    label: 'Customs Valuation Disputes' },
  ],
  trademark_ip: [
    { id: 'trademark_domestic',   label: 'Trademark Registration (Domestic)' },
    { id: 'trademark_eu',         label: 'EU Trademark Registration (EUIPO)' },
    { id: 'trademark_us',         label: 'US Trademark Registration (USPTO)' },
    { id: 'trademark_madrid',     label: 'International Trademark (Madrid System)' },
    { id: 'patent_filing',        label: 'Patent Filing & Advisory' },
    { id: 'patent_intl_pct',      label: 'International Patent (PCT Application)' },
    { id: 'copyright_protection', label: 'Copyright Registration & Protection' },
    { id: 'trade_secret',         label: 'Trade Secret Protection' },
    { id: 'ip_portfolio',         label: 'IP Portfolio Management' },
    { id: 'brand_protection',     label: 'Brand Protection Strategy' },
    { id: 'ip_licensing',         label: 'IP Licensing & Agreements' },
    { id: 'domain_disputes',      label: 'Domain Name Disputes (UDRP)' },
    { id: 'ip_infringement',      label: 'Counterfeit & Infringement Actions' },
    { id: 'design_registration',  label: 'Industrial Design Registration' },
    { id: 'software_ip',          label: 'Software IP & Technology Law' },
  ],
};
