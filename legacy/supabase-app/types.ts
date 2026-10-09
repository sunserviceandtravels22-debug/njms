
export enum MetalType {
  GOLD = 'Gold',
  SILVER = 'Silver'
}

export enum ItemStatus {
  IN_INVENTORY = 'In Inventory',
  SOLD = 'Sold'
}

export enum SaleStatus {
  COMPLETED = 'Completed',
  EDITED = 'Edited',
  VOIDED = 'Voided'
}

export interface PurityStandard {
  standard: string;
  tunch: number;
  label: string;
}

export interface EditHistoryEntry {
  editedAt: string;
  editedBy: string;
  changes: Record<string, { from: any; to: any }>;
  reason?: string;
}

export interface InventoryItem {
  id: string;
  sku: string;
  barcode: string;
  metalType: MetalType;
  category: string;
  weight: number;
  tunch: number;
  purityStandard: string;
  labourCharges: number;
  purchasePrice: number;
  goldRateAtPurchase: number;
  silverRateAtPurchase: number;
  status: ItemStatus;
  purchaseDate: string;
  supplierName?: string;
  notes?: string;
  createdAt: string;
}

export interface SaleRecord {
  id: string;
  itemId: string;
  saleDate: string;
  sellingPrice: number;
  profit: number;
  profitPercent: number;
  profitMargin: number;
  goldRateAtSale: number;
  silverRateAtSale: number;
  weightAtSale: number; 
  customerName?: string;
  customerPhone?: string;
  paymentMethod: string;
  saleStatus: SaleStatus;
  voidReason?: string;
  createdAt: string;
  item?: InventoryItem;
}

export interface SKUMaster {
  skuCode: string;
  metalType: MetalType;
  category: string;
  description: string;
  defaultTunch: number;
  defaultPurityStandard: string;
  minStockLevel: number;
  active: boolean;
  createdDate: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  module: 'Purchase' | 'Sales' | 'SKU' | 'Inventory';
  recordId: string;
  recordType: 'Item' | 'Sale' | 'SKU';
  action: 'Created' | 'Edited' | 'Voided' | 'Deleted';
  userName: string;
  reason?: string;
  diff?: Record<string, { from: any; to: any }>;
}
