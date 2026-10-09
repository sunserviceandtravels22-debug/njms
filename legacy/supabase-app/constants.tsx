
import { MetalType, PurityStandard } from './types';

export const CATEGORIES = [
  'Ring', 'Bracelet', 'Necklace', 'Earrings', 'Pendant', 
  'Chain', 'Bangle', 'Anklet', 'Nose Pin', 'Mangalsutra', 'Custom'
];

export const PURITY_STANDARDS: Record<MetalType, PurityStandard[]> = {
  [MetalType.GOLD]: [
    { standard: "24K", tunch: 99.9, label: "24 Karat (99.9%)" },
    { standard: "22K", tunch: 91.6, label: "22 Karat (91.6%)" },
    { standard: "18K", tunch: 75.0, label: "18 Karat (75%)" },
    { standard: "14K", tunch: 58.5, label: "14 Karat (58.5%)" }
  ],
  [MetalType.SILVER]: [
    { standard: "999", tunch: 99.9, label: "Fine Silver (99.9%)" },
    { standard: "925", tunch: 92.5, label: "Sterling Silver (92.5%)" },
    { standard: "835", tunch: 83.5, label: "Coin Silver (83.5%)" }
  ]
};

export const COLORS = {
  primary: '#4285F4',
  success: '#34A853',
  warning: '#FBBC04',
  error: '#EA4335',
  gold: '#FFD700',
  silver: '#C0C0C0',
  edit: '#FF6F00',
  background: '#F8F9FA'
};

export const PAYMENT_METHODS = ['Cash', 'Card', 'UPI', 'Bank Transfer'];

export const LOGO_URL = 'https://raw.githubusercontent.com/narayan-jewellers/assets/main/logo.png';
