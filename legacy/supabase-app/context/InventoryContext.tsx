
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { 
  InventoryItem, 
  SKUMaster, 
  AuditLogEntry, 
  MetalType, 
  ItemStatus, 
  SaleStatus, 
  SaleRecord 
} from '../types';

interface InventoryContextType {
  inventory: InventoryItem[];
  skus: SKUMaster[];
  sales: SaleRecord[];
  auditLog: AuditLogEntry[];
  isLoading: boolean;
  goldRate: number;
  silverRate: number;
  updateRates: (gold: number, silver: number) => Promise<void>;
  addPurchase: (item: any) => Promise<void>;
  updateItem: (id: string, updates: any, reason: string) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  bulkDeleteItems: (ids: string[]) => Promise<void>;
  addSale: (itemId: string, saleDetails: any) => Promise<void>;
  updateSale: (id: string, updates: any, reason: string) => Promise<void>;
  voidSale: (saleId: string, reason: string) => Promise<void>;
  deleteSale: (id: string) => Promise<void>;
  bulkDeleteSales: (ids: string[]) => Promise<void>;
  addSKU: (skuData: any) => Promise<void>;
  updateSKU: (skuCode: string, updates: any) => Promise<void>;
  deleteSKU: (skuCode: string) => Promise<void>;
  bulkDeleteSKUs: (skuCodes: string[]) => Promise<void>;
  deleteAuditEntry: (id: string) => Promise<void>;
  bulkDeleteAuditEntries: (ids: string[]) => Promise<void>;
  isBarcodeAvailable: (barcode: string) => Promise<boolean>;
  fetchData: () => Promise<void>;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

const mapItem = (item: any): InventoryItem => ({
  ...item,
  metalType: item.metal_type as MetalType,
  labourCharges: Number(item.labour_charges || 0),
  purchasePrice: Number(item.purchase_price || 0),
  goldRateAtPurchase: Number(item.gold_rate_at_purchase || 0),
  silverRateAtPurchase: Number(item.silver_rate_at_purchase || 0),
  purchaseDate: item.purchase_date,
  supplierName: item.supplier_name,
  createdAt: item.created_at,
  purityStandard: item.purity_standard
});

const mapSKU = (sku: any): SKUMaster => ({
  ...sku,
  skuCode: sku.sku_code,
  metalType: sku.metal_type as MetalType,
  defaultTunch: Number(sku.default_tunch || 0),
  defaultPurityStandard: sku.default_purity_standard,
  minStockLevel: Number(sku.min_stock_level || 0),
  createdDate: sku.created_at,
  active: sku.active ?? true
});

const mapSale = (sale: any): SaleRecord => ({
  ...sale,
  itemId: sale.item_id,
  saleDate: sale.sale_date,
  sellingPrice: Number(sale.selling_price || 0),
  profit: Number(sale.profit || 0),
  profitPercent: Number(sale.profit_percent || 0),
  profitMargin: Number(sale.profit_margin || 0),
  goldRateAtSale: Number(sale.gold_rate_at_sale || 0),
  silverRateAtSale: Number(sale.silver_rate_at_sale || 0),
  weightAtSale: Number(sale.weight_at_sale || 0),
  customerName: sale.customer_name,
  customerPhone: sale.customer_phone,
  paymentMethod: sale.payment_method,
  saleStatus: sale.sale_status as SaleStatus,
  voidReason: sale.void_reason,
  createdAt: sale.created_at,
  item: sale.item ? mapItem(sale.item) : undefined
});

const mapAudit = (log: any): AuditLogEntry => ({
  ...log,
  recordId: log.record_id,
  recordType: log.record_type,
  userName: log.user_name
});

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [skus, setSkus] = useState<SKUMaster[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [goldRate, setGoldRate] = useState(72000);
  const [silverRate, setSilverRate] = useState(85000);

  const createAudit = async (module: string, recordId: string, recordType: string, action: string, reason: string = '') => {
    try {
      await supabase.from('audit_log').insert({
        module, record_id: recordId, record_type: recordType, action, user_name: 'Admin', reason
      });
    } catch (e) { console.error("Audit fail:", e); }
  };

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [skr, inr, slr, adr, str] = await Promise.all([
        supabase.from('skus').select('*').order('sku_code'),
        supabase.from('inventory').select('*').order('purchase_date', { ascending: false }),
        supabase.from('sales').select('*, item:inventory(*)').order('sale_date', { ascending: false }),
        supabase.from('audit_log').select('*').order('timestamp', { ascending: false }).limit(300),
        supabase.from('settings').select('*')
      ]);

      if (skr.data) setSkus(skr.data.map(mapSKU));
      if (inr.data) setInventory(inr.data.map(mapItem));
      if (slr.data) setSales(slr.data.map(mapSale));
      if (adr.data) setAuditLog(adr.data.map(mapAudit));
      
      if (str.data) {
        const g = str.data.find(r => r.key === 'gold_rate');
        const s = str.data.find(r => r.key === 'silver_rate');
        if (g) setGoldRate(Number(g.value));
        if (s) setSilverRate(Number(s.value));
      }
    } catch (error: any) {
      console.error("Critical Sync Error:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const updateRates = async (gold: number, silver: number) => {
    await supabase.from('settings').upsert([{ key: 'gold_rate', value: String(gold) }, { key: 'silver_rate', value: String(silver) }]);
    setGoldRate(gold);
    setSilverRate(silver);
    await fetchData();
  };

  const isBarcodeAvailable = async (barcode: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from('inventory')
      .select('barcode')
      .eq('barcode', barcode)
      .maybeSingle();
    if (error) return false;
    return !data;
  };

  const addPurchase = async (item: any) => {
    const { error } = await supabase.from('inventory').insert([{
      sku: item.sku, 
      barcode: item.barcode, 
      metal_type: item.metalType, 
      category: item.category,
      weight: item.weight, 
      tunch: item.tunch, 
      purity_standard: String(item.purityStandard),
      labour_charges: item.labourCharges, 
      purchase_price: item.purchasePrice,
      gold_rate_at_purchase: item.goldRateAtPurchase, 
      silver_rate_at_purchase: item.silverRateAtPurchase,
      status: item.status, 
      purchase_date: item.purchaseDate, 
      supplier_name: item.supplierName, 
      notes: item.notes
    }]);
    
    if (error) {
      if (error.code === '23505') throw new Error(`Barcode [${item.barcode}] is already registered in the system.`);
      throw error;
    }
    
    await createAudit('Purchase', item.barcode, 'Item', 'Created', `Registered Asset ${item.sku}`);
    await fetchData();
  };

  const updateItem = async (id: string, updates: any, reason: string) => {
    const { error } = await supabase.from('inventory').update({
      sku: updates.sku, 
      weight: Number(updates.weight),
      tunch: Number(updates.tunch),
      purity_standard: String(updates.purityStandard),
      labour_charges: Number(updates.labourCharges), 
      purchase_price: Number(updates.purchasePrice),
      supplier_name: updates.supplierName, 
      notes: updates.notes
    }).eq('id', id);
    
    if (error) throw error;
    await createAudit('Inventory', updates.barcode, 'Item', 'Edited', reason);
    await fetchData();
  };

  const deleteItem = async (id: string) => {
    const item = inventory.find(i => i.id === id);
    const { error } = await supabase.from('inventory').delete().eq('id', id);
    if (error) {
      if (error.code === '23503') throw new Error("Cannot delete item that has existing sales records. Void the sale first.");
      throw error;
    }
    await createAudit('Inventory', item?.barcode || id, 'Item', 'Deleted');
    await fetchData();
  };

  const bulkDeleteItems = async (ids: string[]) => {
    const { error } = await supabase.from('inventory').delete().in('id', ids);
    if (error) throw error;
    await createAudit('Inventory', 'BULK', 'Item', 'Deleted', `${ids.length} assets purged`);
    await fetchData();
  };

  const addSale = async (itemId: string, details: any) => {
    // We snapshot the purchase value (basis cost) for historical reporting
    const item = inventory.find(i => i.id === itemId);
    const purchaseValueAtSale = item ? (item.purchasePrice + item.labourCharges) : 0;

    const { error: saleError } = await supabase.from('sales').insert([{
      item_id: itemId, 
      sale_date: details.saleDate, 
      selling_price: details.sellingPrice,
      profit: details.profit, 
      profit_percent: details.profitPercent, 
      profit_margin: details.profitMargin,
      gold_rate_at_sale: details.goldRateAtSale, 
      silver_rate_at_sale: details.silverRateAtSale,
      weight_at_sale: details.weightAtSale, 
      payment_method: details.paymentMethod,
      customer_name: details.customerName, 
      customer_phone: details.customerPhone, 
      sale_status: details.saleStatus,
      purchase_value_at_sale: purchaseValueAtSale
    }]);
    
    if (saleError) throw saleError;

    const { error: invError } = await supabase.from('inventory')
      .update({ status: ItemStatus.SOLD })
      .eq('id', itemId);
      
    if (invError) throw invError;

    await createAudit('Sales', itemId, 'Sale', 'Created');
    await fetchData();
  };

  const updateSale = async (id: string, updates: any, reason: string) => {
    const mappedUpdates = {
      selling_price: updates.sellingPrice,
      profit: updates.profit,
      payment_method: updates.paymentMethod,
      customer_name: updates.customerName,
      sale_status: updates.saleStatus
    };
    const { error } = await supabase.from('sales').update(mappedUpdates).eq('id', id);
    if (error) throw error;
    await createAudit('Sales', id, 'Sale', 'Edited', reason);
    await fetchData();
  };

  const voidSale = async (id: string, reason: string) => {
    const sale = sales.find(s => s.id === id);
    if (sale) {
      await supabase.from('sales').update({ 
        sale_status: SaleStatus.VOIDED, 
        void_reason: reason 
      }).eq('id', id);
      
      await supabase.from('inventory').update({ 
        status: ItemStatus.IN_INVENTORY 
      }).eq('id', sale.itemId);
      
      await createAudit('Sales', id, 'Sale', 'Voided', reason);
    }
    await fetchData();
  };

  const deleteSale = async (id: string) => {
    const { error } = await supabase.from('sales').delete().eq('id', id);
    if (error) throw error;
    await createAudit('Sales', id, 'Sale', 'Deleted');
    await fetchData();
  };

  const bulkDeleteSales = async (ids: string[]) => {
    const { error } = await supabase.from('sales').delete().in('id', ids);
    if (error) throw error;
    await createAudit('Sales', 'BULK', 'Sale', 'Deleted', `${ids.length} records purged`);
    await fetchData();
  };

  const addSKU = async (skuData: any) => {
    const { error } = await supabase.from('skus').insert([{
      sku_code: skuData.skuCode, 
      metal_type: skuData.metalType, 
      category: skuData.category,
      description: skuData.description, 
      default_tunch: skuData.defaultTunch,
      default_purity_standard: skuData.defaultPurityStandard, 
      min_stock_level: skuData.minStockLevel, 
      active: skuData.active
    }]);
    if (error) throw error;
    await createAudit('SKU', skuData.skuCode, 'SKU', 'Created');
    await fetchData();
  };

  const updateSKU = async (skuCode: string, updates: any) => {
    const { error } = await supabase.from('skus').update({
      metal_type: updates.metalType, 
      category: updates.category, 
      description: updates.description,
      default_tunch: Number(updates.defaultTunch), 
      default_purity_standard: updates.defaultPurityStandard,
      min_stock_level: Number(updates.minStockLevel), 
      active: updates.active
    }).eq('sku_code', skuCode);
    if (error) throw error;
    await createAudit('SKU', skuCode, 'SKU', 'Edited');
    await fetchData();
  };

  const deleteSKU = async (skuCode: string) => {
    const { error } = await supabase.from('skus').delete().eq('sku_code', skuCode);
    if (error) throw error;
    await createAudit('SKU', skuCode, 'SKU', 'Deleted');
    await fetchData();
  };

  const bulkDeleteSKUs = async (skuCodes: string[]) => {
    const { error } = await supabase.from('skus').delete().in('sku_code', skuCodes);
    if (error) throw error;
    await createAudit('SKU', 'BULK', 'SKU', 'Deleted', `${skuCodes.length} codes purged`);
    await fetchData();
  };

  const deleteAuditEntry = async (id: string) => {
    const { error } = await supabase.from('audit_log').delete().eq('id', id);
    if (error) throw error;
    await fetchData();
  };

  const bulkDeleteAuditEntries = async (ids: string[]) => {
    const { error } = await supabase.from('audit_log').delete().in('id', ids);
    if (error) throw error;
    await fetchData();
  };

  return (
    <InventoryContext.Provider value={{
      inventory, skus, sales, auditLog, isLoading, goldRate, silverRate, updateRates,
      addPurchase, updateItem, deleteItem, bulkDeleteItems, addSale, updateSale, voidSale, deleteSale, bulkDeleteSales,
      addSKU, updateSKU, deleteSKU, bulkDeleteSKUs, deleteAuditEntry, bulkDeleteAuditEntries, isBarcodeAvailable, fetchData
    }}>
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) throw new Error('useInventory must be within Provider');
  return context;
};
