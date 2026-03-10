import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  Warehouse, 
  Layers, 
  Ruler, 
  Plus, 
  Search, 
  Save, 
  X, 
  ChevronRight,
  ChevronDown,
  Box,
  Settings,
  Menu,
  Database,
  Tag,
  Truck,
  Download,
  Upload,
  Printer,
  FileSpreadsheet,
  FileText,
  Filter,
  Edit,
  Trash2,
  Eye,
  Image as ImageIcon,
  MoreVertical,
  MousePointer2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- Types ---
interface Category {
  CategoryID: string;
  CategoryName: string;
  UpCategoryID: string;
  AccId: string;
}

interface Unit {
  UnitID: number;
  UnitName: string;
}

interface Store {
  ID: number;
  StoreID: string;
  StoreName: string;
  Address: string;
  Phone: string;
  Mobile: string;
  SellerID: number;
  IsStoped: boolean;
  IsRealStock: boolean;
  AccId: string;
}

interface Product {
  ProductID: string;
  productname: string;
  ProdEngName: string;
  CategoryId: string;
  ProductNo: string;
  StoreId: string;
  PurchPrice: number;
  SalePrice?: number;
  stockQuantity?: number;
  ImagePath1?: string;
}

// --- Components ---

const SidebarItem = ({ icon: Icon, label, active, onClick }: any) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
      active 
        ? 'bg-[#714B67] text-white' 
        : 'text-gray-400 hover:bg-[#4d3346] hover:text-white'
    }`}
  >
    <Icon size={18} />
    <span>{label}</span>
  </button>
);

const FormField = React.forwardRef(({ label, name, type = "text", placeholder, required = false, value, onChange, disabled = false, readOnly = false, defaultValue }: any, ref: any) => (
  <div className="space-y-1">
    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</label>
    <input
      ref={ref}
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      required={required}
      placeholder={placeholder}
      disabled={disabled || readOnly}
      defaultValue={defaultValue}
      className={`w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#714B67] focus:border-transparent outline-none transition-all text-sm ${disabled || readOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
    />
  </div>
));

const CheckboxField = ({ label, name, defaultChecked, disabled }: any) => (
  <label className={`flex items-center gap-2 cursor-pointer group ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
    <input
      type="checkbox"
      name={name}
      defaultChecked={defaultChecked}
      disabled={disabled}
      className="w-4 h-4 text-[#714B67] border-gray-300 rounded focus:ring-[#714B67]"
    />
    <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">{label}</span>
  </label>
);

const getDescendantCategoryIds = (parentId: string, allCategories: Category[]): string[] => {
  const children = allCategories.filter(c => c.UpCategoryID === parentId);
  let ids = children.map(c => c.CategoryID);
  children.forEach(child => {
    ids = [...ids, ...getDescendantCategoryIds(child.CategoryID, allCategories)];
  });
  return ids;
};

const getCategoryPath = (categoryId: string, allCategories: Category[]): string => {
  const cat = allCategories.find(c => c.CategoryID === categoryId);
  if (!cat) return '';
  const parentPath = cat.UpCategoryID ? getCategoryPath(cat.UpCategoryID, allCategories) : '';
  return parentPath ? `${parentPath} - ${cat.CategoryName}` : cat.CategoryName;
};

const CategoryTreeNode = ({ category, allCategories, expandedIds, toggleExpand, handleView, handleEdit, handleDelete, level = 0, onContextMenu }: any) => {
  const children = allCategories.filter((c: any) => c.UpCategoryID === category.CategoryID);
  const isExpanded = expandedIds.has(category.CategoryID);
  const hasChildren = children.length > 0;

  return (
    <div 
      className={`${level === 0 ? 'border border-gray-100 rounded-xl overflow-hidden bg-white shadow-sm' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        e.currentTarget.classList.add('bg-blue-50');
      }}
      onDragLeave={(e) => {
        e.currentTarget.classList.remove('bg-blue-50');
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.currentTarget.classList.remove('bg-blue-50');
        const droppedId = e.dataTransfer.getData('categoryId');
        if (droppedId && droppedId !== category.CategoryID) {
          window.dispatchEvent(new CustomEvent('categoryDropped', { detail: { droppedId, targetId: category.CategoryID } }));
        }
      }}
    >
      <div 
        className={`px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors ${level === 0 ? 'bg-gray-50' : ''} ${isExpanded && hasChildren ? 'border-b border-gray-100' : ''}`}
        style={{ paddingRight: `${level * 24 + 16}px`, paddingLeft: '16px' }}
        onClick={() => hasChildren && toggleExpand(category.CategoryID)}
        onContextMenu={(e) => onContextMenu(e, category, 'category')}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('categoryId', category.CategoryID);
        }}
      >
        <div className="flex items-center gap-3">
          {hasChildren ? (
            isExpanded ? <ChevronDown size={16} className="text-[#714B67]" /> : <ChevronRight size={16} className="text-gray-400" />
          ) : (
            <div className="w-4" />
          )}
          <Layers size={16} className="text-[#714B67]" />
          <span className={`${level === 0 ? 'font-bold' : ''} text-sm text-gray-700`}>{category.CategoryName}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] bg-white px-2 py-0.5 rounded-full border border-gray-200 text-gray-400">{category.CategoryID}</span>
          <div className="flex items-center gap-1">
            <button onClick={(e) => { e.stopPropagation(); handleView(category); }} className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"><Eye size={14} /></button>
            <button onClick={(e) => { e.stopPropagation(); handleEdit(category); }} className="p-1 text-amber-600 hover:bg-amber-50 rounded transition-colors"><Edit size={14} /></button>
            <button onClick={(e) => { e.stopPropagation(); handleDelete(category.CategoryID); }} className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 size={14} /></button>
            <button onClick={(e) => onContextMenu(e, category)} className="p-1 text-gray-400 hover:text-gray-600"><MoreVertical size={14} /></button>
          </div>
        </div>
      </div>
      {isExpanded && hasChildren && (
        <div className="divide-y divide-gray-50">
          {children.map((child: any) => (
            <CategoryTreeNode 
              key={child.CategoryID}
              category={child}
              allCategories={allCategories}
              expandedIds={expandedIds}
              toggleExpand={toggleExpand}
              handleView={handleView}
              handleEdit={handleEdit}
              handleDelete={handleDelete}
              level={level + 1}
              onContextMenu={onContextMenu}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const ProductTreeNode = ({ category, allCategories, products, expandedIds, toggleExpand, level = 0, onContextMenu }: any) => {
  const children = allCategories.filter((c: any) => c.UpCategoryID === category.CategoryID);
  const catProducts = products.filter((p: any) => p.CategoryId === category.CategoryID);
  const isExpanded = expandedIds.has(category.CategoryID);
  const hasContent = children.length > 0 || catProducts.length > 0;

  if (!hasContent && level === 0) return null;

  return (
    <div 
      className={`${level === 0 ? 'border border-gray-100 rounded-xl overflow-hidden bg-white shadow-sm' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        e.currentTarget.classList.add('bg-blue-50');
      }}
      onDragLeave={(e) => {
        e.currentTarget.classList.remove('bg-blue-50');
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.currentTarget.classList.remove('bg-blue-50');
        const droppedId = e.dataTransfer.getData('categoryId');
        if (droppedId && droppedId !== category.CategoryID) {
          window.dispatchEvent(new CustomEvent('categoryDropped', { detail: { droppedId, targetId: category.CategoryID } }));
        }
      }}
    >
      <div 
        className={`px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors ${level === 0 ? 'bg-gray-50' : ''} ${isExpanded && hasContent ? 'border-b border-gray-100' : ''}`}
        style={{ paddingRight: `${level * 24 + 16}px`, paddingLeft: '16px' }}
        onClick={() => hasContent && toggleExpand(category.CategoryID)}
        onContextMenu={(e) => onContextMenu(e, category, 'category')}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('categoryId', category.CategoryID);
        }}
      >
        <div className="flex items-center gap-3">
          {hasContent ? (
            isExpanded ? <ChevronDown size={16} className="text-[#714B67]" /> : <ChevronRight size={16} className="text-gray-400" />
          ) : (
            <div className="w-4" />
          )}
          <Layers size={16} className="text-[#714B67]" />
          <span className={`${level === 0 ? 'font-bold' : ''} text-sm text-gray-700`}>{category.CategoryName}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] bg-white px-2 py-0.5 rounded-full border border-gray-200 text-gray-400">
            {catProducts.length} صنف {children.length > 0 ? `+ ${children.length} مجموعة` : ''}
          </span>
          <button onClick={(e) => onContextMenu(e, category, 'category')} className="p-1 text-gray-400 hover:text-gray-600">
            <MoreVertical size={14} />
          </button>
        </div>
      </div>
      {isExpanded && (
        <div className="divide-y divide-gray-50">
          {catProducts.map((p: any) => (
            <div 
              key={p.ProductID} 
              className="py-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors" 
              style={{ paddingRight: `${(level + 1) * 24 + 16}px`, paddingLeft: '16px' }}
              onContextMenu={(e) => onContextMenu(e, p, 'product')}
            >
              <div className="flex items-center gap-3">
                {p.ImagePath1 ? (
                  <img src={p.ImagePath1} alt="" className="w-6 h-6 rounded object-cover border border-gray-100" />
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full bg-[#714B67]/40" />
                )}
                <span className="text-sm text-gray-600">{p.productname}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs font-bold text-[#714B67]">${p.PurchPrice}</span>
                <span className="text-xs font-mono text-gray-400">{p.ProductID}</span>
                <button onClick={(e) => onContextMenu(e, p, 'product')} className="p-1 text-gray-400 hover:text-gray-600">
                  <MoreVertical size={14} />
                </button>
              </div>
            </div>
          ))}
          {children.map((child: any) => (
            <ProductTreeNode 
              key={child.CategoryID}
              category={child}
              allCategories={allCategories}
              products={products}
              expandedIds={expandedIds}
              toggleExpand={toggleExpand}
              level={level + 1}
              onContextMenu={onContextMenu}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [stats, setStats] = useState({ products: 0, stores: 0, categories: 0 });
  
  // Data States
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // View States
  const [viewMode, setViewMode] = useState<'list' | 'kanban' | 'tree'>('list');
  const [showSearchModal, setShowSearchModal] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter States
  const [columnFilters, setColumnFilters] = useState<{ [key: string]: string }>({});

  // Modal States
  const [showModal, setShowModal] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, item: any, type: 'category' | 'product' } | null>(null);
  const [bulkPriceModal, setBulkPriceModal] = useState<{ type: 'PurchPrice' | 'SalePrice', category: Category } | null>(null);

  useEffect(() => {
    const handleDrop = async (e: any) => {
      const { droppedId, targetId } = e.detail;
      if (droppedId === targetId) return;
      
      const droppedCat = categories.find(c => c.CategoryID === droppedId);
      if (droppedCat) {
        await fetch(`/api/categories/${droppedId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...droppedCat, UpCategoryID: targetId })
        });
        fetchData();
      }
    };
    window.addEventListener('categoryDropped', handleDrop);
    return () => window.removeEventListener('categoryDropped', handleDrop);
  }, [categories]);

  const handleContextMenu = (e: React.MouseEvent, item: any, type: 'category' | 'product' = 'category') => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, item, type });
  };

  const handleBulkPriceUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!bulkPriceModal) return;
    
    const formData = new FormData(e.currentTarget);
    const price = Number(formData.get('price'));
    const descendantIds = getDescendantCategoryIds(bulkPriceModal.category.CategoryID, categories);
    const categoryIds = [bulkPriceModal.category.CategoryID, ...descendantIds];

    const res = await fetch('/api/products/bulk-price-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryIds, price, type: bulkPriceModal.type })
    });

    if (res.ok) {
      fetchData();
      setBulkPriceModal(null);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedIds(new Set(categories.map(c => c.CategoryID)));
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  useEffect(() => {
    fetchStats();
    fetchData();
    setColumnFilters({}); // Reset filters on tab change
    if (activeTab !== 'products' && activeTab !== 'categories') setViewMode('list');
  }, [activeTab]);

  useEffect(() => {
    if (showModal) {
      setTimeout(() => {
        // Find the first non-disabled input
        const firstInput = formRef.current?.querySelector('input:not([disabled]), select:not([disabled])') as HTMLElement;
        firstInput?.focus();
      }, 100);
    }
  }, [showModal]);

  const fetchStats = async () => {
    const res = await fetch('/api/stats');
    const data = await res.json();
    setStats(data);
  };

  const fetchData = async () => {
    const [catRes, unitRes, storeRes, prodRes] = await Promise.all([
      fetch('/api/categories'),
      fetch('/api/units'),
      fetch('/api/stores'),
      fetch('/api/products')
    ]);
    setCategories(await catRes.json());
    setUnits(await unitRes.json());
    setStores(await storeRes.json());
    setProducts(await prodRes.json());
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>, endpoint: string, saveAndNew: boolean = false) => {
    e.preventDefault();
    try {
      const form = e.currentTarget;
      const formData = new FormData(form);
      const data: any = Object.fromEntries(formData.entries());
      
      // Convert checkboxes to 1/0
      const checkboxes = form.querySelectorAll('input[type="checkbox"]');
      checkboxes.forEach((cb: any) => {
        data[cb.name] = cb.checked ? 1 : 0;
      });

      // Ensure numeric fields are numbers for the database
      const numericFields = [
        'PurchPrice', 'GomlaPrice', 'PartPrice', 'UserPrice', 'MinPrice', 'MaxPrice', 
        'TaxPercent', 'SalePrice', 'stockQuantity', 'UseUnitQty', 'SubUnitQty', 
        'UseUnitPrice', 'SubUnitPrice', 'MainUnitPrice', 'AgentPrice', 'MainDesc',
        'TaxDiscP1', 'TaxDiscP2', 'ComitionV', 'ProductCost', 'Param1', 'Param2', 'Param3', 'Param4'
      ];
      numericFields.forEach(field => {
        if (data[field] !== undefined && data[field] !== '') {
          data[field] = Number(data[field]);
        }
      });

      const id = selectedItem ? (selectedItem.CategoryID || selectedItem.UnitID || selectedItem.StoreID || selectedItem.ProductID) : null;
      const url = id ? `/api/${endpoint}/${id}` : `/api/${endpoint}`;
      const method = id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        await fetchData();
        await fetchStats();
        if (saveAndNew) {
          form.reset();
          setSelectedItem(null);
          setIsReadOnly(false);
          setTimeout(() => {
            const firstInput = form.querySelector('input:not([disabled]), select:not([disabled])') as HTMLElement;
            firstInput?.focus();
          }, 50);
        } else {
          setShowModal(null);
          setSelectedItem(null);
          setIsReadOnly(false);
        }
      } else {
        const errData = await res.json();
        alert(`خطأ في الحفظ: ${errData.error || res.statusText}`);
      }
    } catch (error: any) {
      console.error('Submit error:', error);
      alert(`حدث خطأ غير متوقع: ${error.message}`);
    }
  };

  const handleDelete = async (id: string | number) => {
    if (activeTab === 'categories') {
      const hasSubCategories = categories.some(c => c.UpCategoryID === String(id));
      const hasProducts = products.some(p => p.CategoryId === String(id));
      if (hasSubCategories || hasProducts) {
        alert('لا يمكن حذف تصنيف رئيسى وتحتيه أصناف فرعية');
        return;
      }
    }
    if (!confirm('هل تريد حذف الصنف ام لا؟')) return;
    try {
      const res = await fetch(`/api/${activeTab}/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
        fetchStats();
      }
    } catch (error) {
      console.error('Error deleting:', error);
    }
  };

  const handleEdit = (item: any) => {
    setSelectedItem(item);
    setIsReadOnly(false);
    setShowModal(activeTab);
  };

  const handleView = (item: any) => {
    setSelectedItem(item);
    setIsReadOnly(true);
    setShowModal(activeTab);
  };

  // --- Filter Logic ---
  const filteredData = useMemo(() => {
    let data: any[] = [];
    if (activeTab === 'stores') data = stores;
    if (activeTab === 'units') data = units;
    if (activeTab === 'categories') data = categories;
    if (activeTab === 'products') {
      data = products.map(p => {
        const cat = categories.find(c => c.CategoryID === p.CategoryId);
        return { ...p, CategoryName: cat ? cat.CategoryName : '' };
      });
    }

    return data.filter(item => {
      return Object.keys(columnFilters).every(key => {
        if (!columnFilters[key]) return true;
        
        // Special logic for Category filtering in products tab to include sub-categories
        if (activeTab === 'products' && key === 'CategoryName') {
          const selectedCatName = columnFilters[key];
          const selectedCat = categories.find(c => c.CategoryName === selectedCatName);
          if (selectedCat) {
            const descendantIds = getDescendantCategoryIds(selectedCat.CategoryID, categories);
            const allowedIds = [selectedCat.CategoryID, ...descendantIds];
            return allowedIds.includes(item.CategoryId);
          }
        }

        const val = String(item[key] || '').toLowerCase();
        return val.includes(columnFilters[key].toLowerCase());
      });
    });
  }, [activeTab, stores, units, categories, products, columnFilters]);

  const handleFilterChange = (key: string, value: string) => {
    setColumnFilters(prev => ({ ...prev, [key]: value }));
  };

  // --- Export/Import/Print ---
  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, activeTab);
    XLSX.writeFile(wb, `${activeTab}_export.xlsx`);
  };

  const printToPDF = () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const title = activeTab === 'products' ? 'تقرير الأصناف' : 
                  activeTab === 'categories' ? 'تقرير المجموعات' :
                  activeTab === 'stores' ? 'تقرير المخازن' :
                  activeTab === 'units' ? 'تقرير الوحدات' : activeTab.toUpperCase();

    // Mapping keys to Arabic headers for better readability
    const headersMap: { [key: string]: string } = {
      'ProductID': 'كود الصنف',
      'productname': 'اسم الصنف',
      'ProdEngName': 'الاسم (EN)',
      'CategoryId': 'كود المجموعة',
      'CategoryName': 'المجموعة',
      'PurchPrice': 'سعر الشراء',
      'SalePrice': 'سعر البيع',
      'stockQuantity': 'الكمية',
      'CategoryID': 'كود المجموعة',
      'UpCategoryID': 'المجموعة الأم',
      'StoreID': 'كود المخزن',
      'StoreName': 'اسم المخزن',
      'Address': 'العنوان',
      'UnitID': 'كود الوحدة',
      'UnitName': 'اسم الوحدة'
    };

    const keys = Object.keys(filteredData[0] || {}).filter(k => !['ImagePath1', 'ID'].includes(k));
    const headers = keys.map(k => headersMap[k] || k);
    const data = filteredData.map(item => keys.map(k => item[k]));

    autoTable(doc, {
      head: [headers],
      body: data,
      startY: 20,
      styles: {
        fontSize: 10,
        cellPadding: 3,
        halign: 'right',
      },
      headStyles: {
        fillColor: [113, 75, 103], // #714B67
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      margin: { top: 20 },
    });

    doc.save(`${activeTab}_report.pdf`);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);
      
      // Basic batch import (sequential for simplicity)
      for (const item of data) {
        await fetch(`/api/${activeTab}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item)
        });
      }
      fetchData();
      fetchStats();
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="flex h-screen bg-[#f1f2f6] overflow-hidden font-sans" dir="rtl">
      {/* Sidebar */}
      <aside className={`bg-[#2c3e50] text-white transition-all duration-300 flex flex-col ${isSidebarOpen ? 'w-64' : 'w-0 overflow-hidden'}`}>
        <div className="p-6 flex items-center gap-3 border-b border-white/5">
          <div className="bg-[#714B67] p-2 rounded-lg">
            <Database size={20} />
          </div>
          <span className="font-bold text-lg tracking-tight">إدارة المخازن</span>
        </div>
        
        <nav className="flex-1 py-4">
          <SidebarItem icon={LayoutDashboard} label="لوحة التحكم" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <div className="mt-6 px-4 mb-2">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">التكويد</p>
          </div>
          <SidebarItem icon={Warehouse} label="المخازن" active={activeTab === 'stores'} onClick={() => setActiveTab('stores')} />
          <SidebarItem icon={Ruler} label="الوحدات" active={activeTab === 'units'} onClick={() => setActiveTab('units')} />
          <SidebarItem icon={Layers} label="مجموعات الأصناف" active={activeTab === 'categories'} onClick={() => setActiveTab('categories')} />
          <SidebarItem icon={Package} label="الأصناف" active={activeTab === 'products'} onClick={() => setActiveTab('products')} />
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white h-16 border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
              <Menu size={20} />
            </button>
            <h2 className="text-xl font-bold text-gray-800">
              {activeTab === 'dashboard' && 'لوحة التحكم'}
              {activeTab === 'stores' && 'المخازن'}
              {activeTab === 'units' && 'الوحدات'}
              {activeTab === 'categories' && 'مجموعات الأصناف'}
              {activeTab === 'products' && 'الأصناف'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {viewMode === 'tree' && (activeTab === 'products' || activeTab === 'categories') && (
              <div className="flex items-center gap-2 ml-4 bg-gray-100 p-1 rounded-lg">
                <button 
                  onClick={expandAll}
                  className="px-3 py-1.5 text-[10px] font-bold bg-white text-gray-700 rounded-md shadow-sm hover:bg-gray-50 transition-all"
                >
                  توسيع الكل
                </button>
                <button 
                  onClick={collapseAll}
                  className="px-3 py-1.5 text-[10px] font-bold bg-white text-gray-700 rounded-md shadow-sm hover:bg-gray-50 transition-all"
                >
                  طي الكل
                </button>
              </div>
            )}
            {(activeTab === 'products' || activeTab === 'categories') && (
              <div className="flex items-center bg-gray-100 rounded-lg p-1 ml-4">
                <button 
                  onClick={() => setViewMode('list')} 
                  className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white text-[#714B67] shadow-sm' : 'text-gray-500 hover:bg-white/50'}`}
                  title="عرض القائمة"
                >
                  <Menu size={18} />
                </button>
                {activeTab === 'products' && (
                  <button 
                    onClick={() => setViewMode('kanban')} 
                    className={`p-2 rounded-md transition-all ${viewMode === 'kanban' ? 'bg-white text-[#714B67] shadow-sm' : 'text-gray-500 hover:bg-white/50'}`}
                    title="عرض كانبان"
                  >
                    <LayoutDashboard size={18} />
                  </button>
                )}
                <button 
                  onClick={() => setViewMode('tree')} 
                  className={`p-2 rounded-md transition-all ${viewMode === 'tree' ? 'bg-white text-[#714B67] shadow-sm' : 'text-gray-500 hover:bg-white/50'}`}
                  title="عرض شجري"
                >
                  <Layers size={18} />
                </button>
              </div>
            )}
            {activeTab !== 'dashboard' && (
              <>
                <div className="flex items-center bg-gray-100 rounded-lg p-1">
                  <button onClick={exportToExcel} className="p-2 hover:bg-white rounded-md text-gray-600 transition-all" title="تصدير إكسيل">
                    <FileSpreadsheet size={18} />
                  </button>
                  <button onClick={printToPDF} className="p-2 hover:bg-white rounded-md text-gray-600 transition-all" title="طباعة PDF">
                    <Printer size={18} />
                  </button>
                  <label className="p-2 hover:bg-white rounded-md text-gray-600 transition-all cursor-pointer" title="استيراد إكسيل">
                    <Upload size={18} />
                    <input type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleImport} />
                  </label>
                </div>
                <button 
                  onClick={() => setShowModal(activeTab)}
                  className="flex items-center gap-2 px-6 py-2 bg-[#714B67] text-white rounded-lg text-sm font-bold shadow-lg shadow-[#714B67]/20 hover:bg-[#5d3d55] transition-all"
                >
                  <Plus size={18} />
                  إنشاء جديد
                </button>
              </>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <p className="text-sm text-gray-500 font-bold uppercase mb-1">إجمالي الأصناف</p>
                  <h3 className="text-3xl font-black text-[#714B67]">{stats.products}</h3>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <p className="text-sm text-gray-500 font-bold uppercase mb-1">إجمالي المخازن</p>
                  <h3 className="text-3xl font-black text-[#714B67]">{stats.stores}</h3>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <p className="text-sm text-gray-500 font-bold uppercase mb-1">المجموعات</p>
                  <h3 className="text-3xl font-black text-[#714B67]">{stats.categories}</h3>
                </div>
              </motion.div>
            )}

            {/* Data Tables */}
            {activeTab !== 'dashboard' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  {viewMode === 'list' && (
                    <table className="w-full text-right">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                          {activeTab === 'stores' && (
                            <>
                              <th className="px-6 py-4">
                                <div className="flex flex-col gap-2">
                                  <span className="text-xs font-bold text-gray-500 uppercase">كود المخزن</span>
                                  <input type="text" placeholder="فلتر..." className="text-[10px] p-1 border rounded w-full font-normal" onChange={(e) => handleFilterChange('StoreID', e.target.value)} />
                                </div>
                              </th>
                              <th className="px-6 py-4">
                                <div className="flex flex-col gap-2">
                                  <span className="text-xs font-bold text-gray-500 uppercase">اسم المخزن</span>
                                  <input type="text" placeholder="فلتر..." className="text-[10px] p-1 border rounded w-full font-normal" onChange={(e) => handleFilterChange('StoreName', e.target.value)} />
                                </div>
                              </th>
                              <th className="px-6 py-4">
                                <div className="flex flex-col gap-2">
                                  <span className="text-xs font-bold text-gray-500 uppercase">العنوان</span>
                                  <input type="text" placeholder="فلتر..." className="text-[10px] p-1 border rounded w-full font-normal" onChange={(e) => handleFilterChange('Address', e.target.value)} />
                                </div>
                              </th>
                              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">الحالة</th>
                              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">الإجراءات</th>
                            </>
                          )}
                          {activeTab === 'units' && (
                            <>
                              <th className="px-6 py-4">
                                <div className="flex flex-col gap-2">
                                  <span className="text-xs font-bold text-gray-500 uppercase">كود الوحدة</span>
                                  <input type="text" placeholder="فلتر..." className="text-[10px] p-1 border rounded w-full font-normal" onChange={(e) => handleFilterChange('UnitID', e.target.value)} />
                                </div>
                              </th>
                              <th className="px-6 py-4">
                                <div className="flex flex-col gap-2">
                                  <span className="text-xs font-bold text-gray-500 uppercase">اسم الوحدة</span>
                                  <input type="text" placeholder="فلتر..." className="text-[10px] p-1 border rounded w-full font-normal" onChange={(e) => handleFilterChange('UnitName', e.target.value)} />
                                </div>
                              </th>
                              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">الإجراءات</th>
                            </>
                          )}
                          {activeTab === 'categories' && (
                            <>
                              <th className="px-6 py-4">
                                <div className="flex flex-col gap-2">
                                  <span className="text-xs font-bold text-gray-500 uppercase">كود المجموعة</span>
                                  <input type="text" placeholder="فلتر..." className="text-[10px] p-1 border rounded w-full font-normal" onChange={(e) => handleFilterChange('CategoryID', e.target.value)} />
                                </div>
                              </th>
                              <th className="px-6 py-4">
                                <div className="flex flex-col gap-2">
                                  <span className="text-xs font-bold text-gray-500 uppercase">اسم المجموعة</span>
                                  <input type="text" placeholder="فلتر..." className="text-[10px] p-1 border rounded w-full font-normal" onChange={(e) => handleFilterChange('CategoryName', e.target.value)} />
                                </div>
                              </th>
                              <th className="px-6 py-4">
                                <div className="flex flex-col gap-2">
                                  <span className="text-xs font-bold text-gray-500 uppercase">المجموعة الأم</span>
                                  <input type="text" placeholder="فلتر..." className="text-[10px] p-1 border rounded w-full font-normal" onChange={(e) => handleFilterChange('UpCategoryID', e.target.value)} />
                                </div>
                              </th>
                              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">الإجراءات</th>
                            </>
                          )}
                          {activeTab === 'products' && (
                            <>
                              <th className="px-6 py-4">
                                <div className="flex flex-col gap-2">
                                  <span className="text-xs font-bold text-gray-500 uppercase">كود الصنف</span>
                                  <input type="text" placeholder="فلتر..." className="text-[10px] p-1 border rounded w-full font-normal" onChange={(e) => handleFilterChange('ProductID', e.target.value)} />
                                </div>
                              </th>
                              <th className="px-6 py-4">
                                <div className="flex flex-col gap-2">
                                  <span className="text-xs font-bold text-gray-500 uppercase">اسم الصنف</span>
                                  <input type="text" placeholder="فلتر..." className="text-[10px] p-1 border rounded w-full font-normal" onChange={(e) => handleFilterChange('productname', e.target.value)} />
                                </div>
                              </th>
                              <th className="px-6 py-4">
                                <div className="flex flex-col gap-2">
                                  <span className="text-xs font-bold text-gray-500 uppercase">الاسم (EN)</span>
                                  <input type="text" placeholder="فلتر..." className="text-[10px] p-1 border rounded w-full font-normal" onChange={(e) => handleFilterChange('ProdEngName', e.target.value)} />
                                </div>
                              </th>
                              <th className="px-6 py-4">
                                <div className="flex flex-col gap-2">
                                  <span className="text-xs font-bold text-gray-500 uppercase">المجموعة</span>
                                  <select 
                                    className="text-[10px] p-1 border rounded w-full font-normal" 
                                    onChange={(e) => handleFilterChange('CategoryName', e.target.value)}
                                    value={columnFilters['CategoryName'] || ''}
                                  >
                                    <option value="">الكل</option>
                                    {categories.map(cat => (
                                      <option key={cat.CategoryID} value={cat.CategoryName}>{cat.CategoryName}</option>
                                    ))}
                                  </select>
                                </div>
                              </th>
                              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">سعر الشراء</th>
                              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">الإجراءات</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {activeTab === 'stores' && filteredData.map((s: Store) => (
                          <tr key={s.ID} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 text-sm font-bold text-gray-900">{s.StoreID}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{s.StoreName}</td>
                            <td className="px-6 py-4 text-sm text-gray-500">{s.Address}</td>
                            <td className="px-6 py-4">
                              <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${s.IsStoped ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                {s.IsStoped ? 'متوقف' : 'نشط'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <button onClick={() => handleView(s)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="عرض"><Eye size={16} /></button>
                                <button onClick={() => handleEdit(s)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="تعديل"><Edit size={16} /></button>
                                <button onClick={() => handleDelete(s.StoreID)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="حذف"><Trash2 size={16} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {activeTab === 'units' && filteredData.map((u: Unit) => (
                          <tr key={u.UnitID} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 text-sm font-bold text-gray-900">{u.UnitID}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{u.UnitName}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <button onClick={() => handleView(u)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="عرض"><Eye size={16} /></button>
                                <button onClick={() => handleEdit(u)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="تعديل"><Edit size={16} /></button>
                                <button onClick={() => handleDelete(u.UnitID)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="حذف"><Trash2 size={16} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {activeTab === 'categories' && filteredData.map((c: Category) => (
                          <tr key={c.CategoryID} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 text-sm font-bold text-gray-900">{c.CategoryID}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{c.CategoryName}</td>
                            <td className="px-6 py-4 text-sm text-gray-500">{c.UpCategoryID || '-'}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <button onClick={() => handleView(c)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="عرض"><Eye size={16} /></button>
                                <button onClick={() => handleEdit(c)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="تعديل"><Edit size={16} /></button>
                                <button onClick={() => handleDelete(c.CategoryID)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="حذف"><Trash2 size={16} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {activeTab === 'products' && filteredData.map((p: any) => (
                          <tr key={p.ProductID} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 text-sm font-bold text-gray-900">
                              <div className="flex items-center gap-3">
                                {p.ImagePath1 && <img src={p.ImagePath1} alt="" className="w-8 h-8 rounded-lg object-cover border border-gray-100" />}
                                {p.ProductID}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">{p.productname}</td>
                            <td className="px-6 py-4 text-sm text-gray-500">{p.ProdEngName || '-'}</td>
                            <td className="px-6 py-4 text-sm text-gray-500">{p.CategoryName || p.CategoryId || '-'}</td>
                            <td className="px-6 py-4 text-sm font-bold text-[#714B67]">{p.PurchPrice}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <button onClick={() => handleView(p)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="عرض"><Eye size={16} /></button>
                                <button onClick={() => handleEdit(p)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="تعديل"><Edit size={16} /></button>
                                <button onClick={() => handleDelete(p.ProductID)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="حذف"><Trash2 size={16} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {viewMode === 'kanban' && activeTab === 'products' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6 bg-gray-50">
                      {filteredData.map((p: Product) => (
                        <div key={p.ProductID} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all group">
                          <div className="h-32 bg-[#714B67]/5 flex items-center justify-center text-[#714B67]/20">
                            <Box size={48} />
                          </div>
                          <div className="p-4">
                            <div className="flex justify-between items-start mb-1">
                              <h4 className="font-bold text-gray-900 truncate flex-1">{p.productname}</h4>
                              <span className="text-sm font-bold text-[#714B67]">${p.PurchPrice}</span>
                            </div>
                            <p className="text-[10px] text-gray-400 mb-3">كود: {p.ProductID}</p>
                            <div className="flex justify-between items-center pt-3 border-t border-gray-50">
                              <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded">{(p as any).CategoryName || p.CategoryId}</span>
                              <div className="flex items-center gap-1">
                                <button onClick={() => handleView(p)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="عرض"><Eye size={14} /></button>
                                <button onClick={() => handleEdit(p)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="تعديل"><Edit size={14} /></button>
                                <button onClick={() => handleDelete(p.ProductID)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="حذف"><Trash2 size={14} /></button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {viewMode === 'tree' && activeTab === 'categories' && (
                    <div className="p-6 space-y-4">
                      {categories.filter(c => !c.UpCategoryID).map(root => (
                        <CategoryTreeNode 
                          key={root.CategoryID}
                          category={root}
                          allCategories={categories}
                          expandedIds={expandedIds}
                          toggleExpand={toggleExpand}
                          handleView={handleView}
                          handleEdit={handleEdit}
                          handleDelete={handleDelete}
                          onContextMenu={handleContextMenu}
                        />
                      ))}
                    </div>
                  )}

                  {viewMode === 'tree' && activeTab === 'products' && (
                    <div className="p-6 space-y-4">
                      {categories.filter(c => !c.UpCategoryID).map(root => (
                        <ProductTreeNode 
                          key={root.CategoryID}
                          category={root}
                          allCategories={categories}
                          products={products}
                          expandedIds={expandedIds}
                          toggleExpand={toggleExpand}
                          onContextMenu={handleContextMenu}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setContextMenu(null)} />
          <div 
            className="fixed z-[70] bg-white rounded-xl shadow-2xl border border-gray-100 py-2 w-56 animate-in fade-in zoom-in duration-100"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <div className="px-4 py-2 border-b border-gray-50 mb-1">
              <p className="text-[10px] font-bold text-gray-400 uppercase">خيارات {contextMenu.type === 'category' ? 'المجموعة' : 'الصنف'}</p>
              <p className="text-xs font-bold text-gray-700 truncate">{contextMenu.item.CategoryName || contextMenu.item.productname}</p>
            </div>
            
            <button 
              className="w-full text-right px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-3"
              onClick={() => {
                if (contextMenu.type === 'category') {
                  handleEdit(contextMenu.item);
                } else {
                  setActiveTab('products');
                  handleEdit(contextMenu.item);
                }
                setContextMenu(null);
              }}
            >
              <Edit size={14} className="text-amber-600" /> تعديل البيانات
            </button>

            {contextMenu.type === 'category' && (
              <>
                <button 
                  className="w-full text-right px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-3"
                  onClick={() => {
                    setSelectedItem({ UpCategoryID: contextMenu.item.CategoryID });
                    setShowModal('categories');
                    setContextMenu(null);
                  }}
                >
                  <Plus size={14} /> إضافة مجموعة فرعية
                </button>
                <button 
                  className="w-full text-right px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-3"
                  onClick={() => {
                    setBulkPriceModal({ type: 'PurchPrice', category: contextMenu.item });
                    setContextMenu(null);
                  }}
                >
                  <Tag size={14} /> توحيد سعر الشراء
                </button>
                <button 
                  className="w-full text-right px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-3"
                  onClick={() => {
                    setBulkPriceModal({ type: 'SalePrice', category: contextMenu.item });
                    setContextMenu(null);
                  }}
                >
                  <Truck size={14} /> توحيد سعر البيع
                </button>
              </>
            )}

            <div className="border-t border-gray-50 my-1" />
            <button 
              className="w-full text-right px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"
              onClick={() => {
                if (contextMenu.type === 'category') {
                  handleDelete(contextMenu.item.CategoryID);
                } else {
                  setActiveTab('products');
                  handleDelete(contextMenu.item.ProductID);
                }
                setContextMenu(null);
              }}
            >
              <Trash2 size={14} /> حذف {contextMenu.type === 'category' ? 'المجموعة' : 'الصنف'}
            </button>
          </div>
        </>
      )}

      {/* Bulk Price Modal */}
      {bulkPriceModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setBulkPriceModal(null)} />
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 bg-[#714B67] text-white">
              <h3 className="text-lg font-bold">توحيد {bulkPriceModal.type === 'PurchPrice' ? 'سعر الشراء' : 'سعر البيع'}</h3>
              <p className="text-xs opacity-80 mt-1">سيتم تطبيق السعر على جميع الأصناف في مجموعة "{bulkPriceModal.category.CategoryName}" وفروعها</p>
            </div>
            <form onSubmit={handleBulkPriceUpdate} className="p-6 space-y-4">
              <FormField label="السعر الجديد" name="price" type="number" required placeholder="أدخل السعر..." />
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 py-2 bg-[#714B67] text-white rounded-lg font-bold text-sm">حفظ التعديلات</button>
                <button type="button" onClick={() => setBulkPriceModal(null)} className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-lg font-bold text-sm">إلغاء</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(null)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-[#714B67] text-white shrink-0">
                <h3 className="text-xl font-bold">
                  {isReadOnly ? 'عرض بيانات ' : selectedItem ? 'تعديل بيانات ' : 'تكويد جديد '}
                  {showModal === 'stores' && 'مخزن'}
                  {showModal === 'units' && 'وحدة'}
                  {showModal === 'categories' && 'مجموعة أصناف'}
                  {showModal === 'products' && 'صنف'}
                </h3>
                <button onClick={() => { setShowModal(null); setSelectedItem(null); setIsReadOnly(false); }} className="p-2 hover:bg-white/10 rounded-lg">
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8">
                <form ref={formRef} id="modal-form" onSubmit={(e) => handleSubmit(e, showModal!, false)} className="space-y-8">
                  {showModal === 'stores' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField label="كود المخزن (تلقائي)" name="StoreID" placeholder="سيتم التوليد تلقائياً" disabled defaultValue={selectedItem?.StoreID} />
                      <FormField label="اسم المخزن" name="StoreName" required ref={nameInputRef} defaultValue={selectedItem?.StoreName} readOnly={isReadOnly} />
                      <FormField label="العنوان" name="Address" defaultValue={selectedItem?.Address} readOnly={isReadOnly} />
                      <FormField label="التليفون" name="Phone" defaultValue={selectedItem?.Phone} readOnly={isReadOnly} />
                      <FormField label="الموبايل" name="Mobile" defaultValue={selectedItem?.Mobile} readOnly={isReadOnly} />
                      <FormField label="كود الحساب" name="AccId" defaultValue={selectedItem?.AccId} readOnly={isReadOnly} />
                      <div className="flex gap-6 pt-4">
                        <CheckboxField label="مخزن متوقف" name="IsStoped" defaultChecked={selectedItem?.IsStoped} disabled={isReadOnly} />
                        <CheckboxField label="رصيد حقيقي" name="IsRealStock" defaultChecked={selectedItem?.IsRealStock} disabled={isReadOnly} />
                      </div>
                    </div>
                  )}

                  {showModal === 'units' && (
                    <div className="grid grid-cols-1 gap-6">
                      <FormField label="اسم الوحدة" name="UnitName" required ref={nameInputRef} defaultValue={selectedItem?.UnitName} readOnly={isReadOnly} />
                    </div>
                  )}

                  {showModal === 'categories' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField label="كود المجموعة (تلقائي)" name="CategoryID" placeholder="سيتم التوليد تلقائياً" disabled defaultValue={selectedItem?.CategoryID} />
                      <FormField label="اسم المجموعة" name="CategoryName" required ref={nameInputRef} defaultValue={selectedItem?.CategoryName} readOnly={isReadOnly} />
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">المجموعة الأم (F3 للبحث)</label>
                        <select 
                          name="UpCategoryID" 
                          disabled={isReadOnly}
                          defaultValue={selectedItem?.UpCategoryID || ''}
                          className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none text-sm focus:ring-2 focus:ring-[#714B67]"
                          onKeyDown={(e) => {
                            if (e.key === 'F3' && !isReadOnly) {
                              e.preventDefault();
                              setShowSearchModal('categories');
                            }
                          }}
                        >
                          <option value="">اختر المجموعة الأم</option>
                          {categories.map(c => <option key={c.CategoryID} value={c.CategoryID}>{c.CategoryName}</option>)}
                        </select>
                      </div>
                      <FormField label="كود الحساب" name="AccId" defaultValue={selectedItem?.AccId} readOnly={isReadOnly} />
                    </div>
                  )}

                  {showModal === 'products' && (
                    <div className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
                          <FormField label="كود الصنف (تلقائي)" name="ProductID" placeholder="سيتم التوليد تلقائياً" disabled defaultValue={selectedItem?.ProductID} />
                          <FormField label="اسم الصنف (عربي)" name="productname" required ref={nameInputRef} defaultValue={selectedItem?.productname} readOnly={isReadOnly} />
                          <FormField label="اسم الصنف (إنجليزي)" name="ProdEngName" defaultValue={selectedItem?.ProdEngName} readOnly={isReadOnly} />
                          <FormField label="رقم الصنف" name="ProductNo" defaultValue={selectedItem?.ProductNo} readOnly={isReadOnly} />
                          <div className="space-y-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">المجموعة</label>
                            <select 
                              name="CategoryId" 
                              disabled={isReadOnly} 
                              defaultValue={selectedItem?.CategoryId || ''} 
                              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none text-sm"
                              onChange={(e) => {
                                const catId = e.target.value;
                                if (catId && !selectedItem?.ProductID) {
                                  const path = getCategoryPath(catId, categories);
                                  const nameInput = formRef.current?.querySelector('input[name="productname"]') as HTMLInputElement;
                                  if (nameInput) {
                                    nameInput.value = path + ' ';
                                    nameInput.focus();
                                  }
                                }
                              }}
                            >
                              <option value="">اختر المجموعة</option>
                              {categories.map(c => <option key={c.CategoryID} value={c.CategoryID}>{c.CategoryName}</option>)}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">المخزن</label>
                            <select name="StoreId" disabled={isReadOnly} defaultValue={selectedItem?.StoreId || ''} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none text-sm">
                              <option value="">اختر المخزن</option>
                              {stores.map(s => <option key={s.StoreID} value={s.StoreID}>{s.StoreName}</option>)}
                            </select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">صورة الصنف</label>
                          <div className="aspect-square bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-gray-400 overflow-hidden relative group">
                            {selectedItem?.ImagePath1 ? (
                              <img src={selectedItem.ImagePath1} alt="Product" className="w-full h-full object-cover" />
                            ) : (
                              <>
                                <ImageIcon size={32} strokeWidth={1.5} />
                                <span className="text-[10px] mt-2">اضغط للرفع</span>
                              </>
                            )}
                            {!isReadOnly && (
                              <input 
                                type="file" 
                                accept="image/*" 
                                className="absolute inset-0 opacity-0 cursor-pointer" 
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onload = (evt) => {
                                      const base64 = evt.target?.result as string;
                                      setSelectedItem((prev: any) => ({ ...prev, ImagePath1: base64 }));
                                      const hiddenInput = document.getElementById('ImagePath1-input') as HTMLInputElement;
                                      if (hiddenInput) hiddenInput.value = base64;
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                              />
                            )}
                          </div>
                          <input type="hidden" name="ImagePath1" id="ImagePath1-input" defaultValue={selectedItem?.ImagePath1} />
                        </div>
                      </div>

                      <div className="border-t border-gray-100 pt-8">
                        <h4 className="text-sm font-bold text-[#714B67] mb-6">الأسعار والوحدات</h4>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                          <FormField label="سعر الشراء" name="PurchPrice" type="number" defaultValue={selectedItem?.PurchPrice} readOnly={isReadOnly} />
                          <FormField label="سعر الجملة" name="GomlaPrice" type="number" defaultValue={selectedItem?.GomlaPrice} readOnly={isReadOnly} />
                          <FormField label="سعر التجزئة" name="PartPrice" type="number" defaultValue={selectedItem?.PartPrice} readOnly={isReadOnly} />
                          <FormField label="سعر المستهلك" name="UserPrice" type="number" defaultValue={selectedItem?.UserPrice} readOnly={isReadOnly} />
                          <FormField label="أقل سعر" name="MinPrice" type="number" defaultValue={selectedItem?.MinPrice} readOnly={isReadOnly} />
                          <FormField label="أقصى سعر" name="MaxPrice" type="number" defaultValue={selectedItem?.MaxPrice} readOnly={isReadOnly} />
                          <FormField label="نسبة الضريبة" name="TaxPercent" type="number" defaultValue={selectedItem?.TaxPercent} readOnly={isReadOnly} />
                        </div>
                      </div>

                      <div className="border-t border-gray-100 pt-8">
                        <h4 className="text-sm font-bold text-[#714B67] mb-6">حدود المخزون</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <FormField label="الحد الأقصى" name="MaxLimitQty" defaultValue={selectedItem?.MaxLimitQty} readOnly={isReadOnly} />
                          <FormField label="حد الطلب" name="LimitQty" defaultValue={selectedItem?.LimitQty} readOnly={isReadOnly} />
                          <FormField label="الحد الأدنى" name="MinLimitQty" defaultValue={selectedItem?.MinLimitQty} readOnly={isReadOnly} />
                        </div>
                      </div>

                      <div className="border-t border-gray-100 pt-8">
                        <h4 className="text-sm font-bold text-[#714B67] mb-6">خيارات إضافية</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <CheckboxField label="طباعة باركود" name="IsPrintBarcode" defaultChecked={selectedItem?.IsPrintBarcode} disabled={isReadOnly} />
                          <CheckboxField label="أرشفة الصنف" name="IsArchif" defaultChecked={selectedItem?.IsArchif} disabled={isReadOnly} />
                          <CheckboxField label="صنف مجمع" name="IsAssemb" defaultChecked={selectedItem?.IsAssemb} disabled={isReadOnly} />
                          <CheckboxField label="صنف خدمي" name="IsService" defaultChecked={selectedItem?.IsService} disabled={isReadOnly} />
                          <CheckboxField label="له تاريخ صلاحية" name="IsValidDates" defaultChecked={selectedItem?.IsValidDates} disabled={isReadOnly} />
                          <CheckboxField label="له سيريال" name="IsHasSerialNo" defaultChecked={selectedItem?.IsHasSerialNo} disabled={isReadOnly} />
                        </div>
                      </div>
                    </div>
                  )}
                </form>
              </div>

              <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-4 shrink-0">
                {!isReadOnly && (
                  <>
                    <button type="submit" form="modal-form" className="flex-1 py-3 bg-[#714B67] text-white rounded-xl font-bold shadow-lg shadow-[#714B67]/20 hover:bg-[#5d3d55] transition-all flex items-center justify-center gap-2">
                      <Save size={18} />
                      حفظ
                    </button>
                    <button 
                      type="button" 
                      onClick={() => {
                        const form = formRef.current;
                        if (form && form.reportValidity()) {
                          const event = { preventDefault: () => {}, currentTarget: form } as any;
                          handleSubmit(event, showModal!, true);
                        }
                      }}
                      className="flex-1 py-3 bg-white border-2 border-[#714B67] text-[#714B67] rounded-xl font-bold hover:bg-[#714B67]/5 transition-all flex items-center justify-center gap-2"
                    >
                      <Plus size={18} />
                      حفظ وجديد
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        if (confirm('هل تريد إلغاء التغييرات والخروج؟')) {
                          setShowModal(null);
                          setSelectedItem(null);
                          setIsReadOnly(false);
                        }
                      }}
                      className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
                    >
                      <X size={18} />
                      إلغاء (Undo)
                    </button>
                  </>
                )}
                {isReadOnly && (
                  <button onClick={() => { setShowModal(null); setSelectedItem(null); setIsReadOnly(false); }} className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition-all">
                    إغلاق
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Search Modal (F3) */}
      <AnimatePresence>
        {showSearchModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSearchModal(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <div className="flex items-center gap-2 flex-1">
                  <Search size={18} className="text-gray-400" />
                  <input 
                    autoFocus
                    type="text" 
                    placeholder="ابحث عن مجموعة..." 
                    className="bg-transparent border-none outline-none w-full text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <button onClick={() => setShowSearchModal(null)} className="p-2 hover:bg-gray-200 rounded-lg">
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                <div className="grid grid-cols-1 gap-1">
                  {categories
                    .filter(c => c.CategoryName.includes(searchTerm) || c.CategoryID.includes(searchTerm))
                    .map(c => (
                      <button
                        key={c.CategoryID}
                        onClick={() => {
                          const select = formRef.current?.querySelector('select[name="UpCategoryID"]') as HTMLSelectElement;
                          if (select) select.value = c.CategoryID;
                          setShowSearchModal(null);
                          setSearchTerm('');
                        }}
                        className="flex items-center justify-between p-3 hover:bg-[#714B67]/5 rounded-xl transition-colors text-right group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-[#714B67]/10 group-hover:text-[#714B67]">
                            <Layers size={16} />
                          </div>
                          <span className="text-sm font-medium text-gray-700">{c.CategoryName}</span>
                        </div>
                        <span className="text-xs font-mono text-gray-400">{c.CategoryID}</span>
                      </button>
                    ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
