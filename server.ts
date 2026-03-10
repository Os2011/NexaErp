import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database('inventory.db');

// Initialize Database Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS Categories (
    CategoryID TEXT PRIMARY KEY,
    CategoryName TEXT NOT NULL,
    UpCategoryID TEXT,
    AccId TEXT
  );

  CREATE TABLE IF NOT EXISTS Units (
    UnitID INTEGER PRIMARY KEY AUTOINCREMENT,
    UnitName TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS Stores (
    ID INTEGER PRIMARY KEY AUTOINCREMENT,
    StoreID TEXT UNIQUE NOT NULL,
    StoreName TEXT NOT NULL,
    Address TEXT,
    Phone TEXT,
    Mobile TEXT,
    SellerID INTEGER,
    IsStoped INTEGER DEFAULT 0,
    IsRealStock INTEGER DEFAULT 1,
    AccId TEXT
  );

  CREATE TABLE IF NOT EXISTS Products (
    ProductID TEXT PRIMARY KEY,
    productname TEXT NOT NULL,
    ProdEngName TEXT,
    CategoryId TEXT,
    ProductNo TEXT,
    ColorID INTEGER,
    MeagureID INTEGER,
    IsPrintBarcode INTEGER DEFAULT 0,
    IsArchif INTEGER DEFAULT 0,
    CountryID INTEGER,
    Marka TEXT,
    Modale TEXT,
    Notes TEXT,
    MainUnitId TEXT,
    SubUnitId TEXT,
    UseUnitID TEXT,
    UseUnitQty REAL,
    SubUnitQty REAL,
    UseUnitPrice REAL,
    SubUnitPrice REAL,
    MainUnitPrice REAL,
    PurchPrice REAL,
    GomlaPrice REAL,
    PartPrice REAL,
    AgentPrice REAL,
    UserPrice REAL,
    MinPrice REAL,
    MaxPrice REAL,
    StoreId TEXT,
    MainDesc REAL,
    TaxPercent REAL,
    TaxDiscP1 REAL,
    TaxDiscP2 REAL,
    LogisticeOrder INTEGER,
    UseRate INTEGER,
    VendorId TEXT,
    MadeComp INTEGER,
    MaxLimitQty TEXT,
    LimitQty TEXT,
    MinLimitQty TEXT,
    MaxLimitTrans INTEGER,
    LimitTrans INTEGER,
    MinLimitTrans INTEGER,
    ProdTrans INTEGER,
    BranchProdTrans INTEGER,
    CustomerProdTrans INTEGER,
    VendorProdTrans INTEGER,
    HealthInsurance INTEGER,
    DragsTable INTEGER,
    PreventContractDesc INTEGER,
    ContractDesc INTEGER,
    ProdInsurance INTEGER,
    InternalClassfication INTEGER,
    HowToUse INTEGER,
    InternalUse INTEGER,
    Useing INTEGER,
    Degre INTEGER,
    Shape INTEGER,
    Classfication INTEGER,
    IsAssemb INTEGER DEFAULT 0,
    IsService INTEGER DEFAULT 0,
    IsHasPartNo INTEGER DEFAULT 0,
    IsValidDates INTEGER DEFAULT 0,
    ImagePath1 TEXT,
    ImagePath2 TEXT,
    ImagePath3 TEXT,
    ImagePath4 TEXT,
    PrimeImage INTEGER,
    MaxDiscP INTEGER,
    ComitionV REAL,
    ComitionP INTEGER,
    ProductCost REAL,
    AccId TEXT,
    IsHasSerialNo INTEGER DEFAULT 0,
    Param1 REAL,
    Param2 REAL,
    Param3 REAL,
    Param4 REAL,
    FOREIGN KEY(CategoryId) REFERENCES Categories(CategoryID),
    FOREIGN KEY(StoreId) REFERENCES Stores(StoreID)
  );

  CREATE TABLE IF NOT EXISTS ProductBarcodes (
    ID INTEGER PRIMARY KEY AUTOINCREMENT,
    ProductID TEXT,
    Barcode TEXT,
    SalePrice TEXT,
    FOREIGN KEY(ProductID) REFERENCES Products(ProductID)
  );

  CREATE TABLE IF NOT EXISTS ProductVendors (
    ID INTEGER PRIMARY KEY AUTOINCREMENT,
    ProductID TEXT,
    VendorId TEXT,
    MainVendor INTEGER DEFAULT 0,
    PrefferdVendor INTEGER DEFAULT 0,
    CurrId TEXT,
    UnitId TEXT,
    DelivaryDays INTEGER,
    TaxValue REAL,
    TaxPercent REAL,
    MainPrice REAL,
    MainDesc REAL,
    QtyDesc REAL,
    EarlyDesc REAL,
    TotalCost REAL,
    RowNO INTEGER,
    FOREIGN KEY(ProductID) REFERENCES Products(ProductID)
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // API Routes
  
  // Categories
  app.get('/api/categories', (req, res) => {
    const rows = db.prepare('SELECT * FROM Categories').all();
    res.json(rows);
  });
  app.post('/api/categories', (req, res) => {
    let { CategoryID, CategoryName, UpCategoryID, AccId } = req.body;
    if (!CategoryID) {
      const last = db.prepare('SELECT CategoryID FROM Categories ORDER BY CategoryID DESC LIMIT 1').get() as any;
      const lastNum = last ? parseInt(last.CategoryID.replace('CAT', '')) : 0;
      CategoryID = `CAT${String(lastNum + 1).padStart(3, '0')}`;
    }
    // Convert empty strings to null for optional foreign keys/references
    const upCat = UpCategoryID === '' ? null : UpCategoryID;
    
    const stmt = db.prepare('INSERT INTO Categories (CategoryID, CategoryName, UpCategoryID, AccId) VALUES (?, ?, ?, ?)');
    stmt.run(CategoryID, CategoryName, upCat, AccId);
    res.status(201).json({ success: true, id: CategoryID });
  });
  app.put('/api/categories/:id', (req, res) => {
    const { CategoryName, UpCategoryID, AccId } = req.body;
    const upCat = UpCategoryID === '' ? null : UpCategoryID;
    const stmt = db.prepare('UPDATE Categories SET CategoryName = ?, UpCategoryID = ?, AccId = ? WHERE CategoryID = ?');
    stmt.run(CategoryName, upCat, AccId, req.params.id);
    res.json({ success: true });
  });
  app.delete('/api/categories/:id', (req, res) => {
    db.prepare('DELETE FROM Categories WHERE CategoryID = ?').run(req.params.id);
    res.json({ success: true });
  });

  // Units
  app.get('/api/units', (req, res) => {
    const rows = db.prepare('SELECT * FROM Units').all();
    res.json(rows);
  });
  app.post('/api/units', (req, res) => {
    const { UnitName } = req.body;
    const stmt = db.prepare('INSERT INTO Units (UnitName) VALUES (?)');
    const info = stmt.run(UnitName);
    res.status(201).json({ success: true, id: info.lastInsertRowid });
  });
  app.put('/api/units/:id', (req, res) => {
    const { UnitName } = req.body;
    db.prepare('UPDATE Units SET UnitName = ? WHERE UnitID = ?').run(UnitName, req.params.id);
    res.json({ success: true });
  });
  app.delete('/api/units/:id', (req, res) => {
    db.prepare('DELETE FROM Units WHERE UnitID = ?').run(req.params.id);
    res.json({ success: true });
  });

  // Stores
  app.get('/api/stores', (req, res) => {
    const rows = db.prepare('SELECT * FROM Stores').all();
    res.json(rows);
  });
  app.post('/api/stores', (req, res) => {
    let { StoreID, StoreName, Address, Phone, Mobile, SellerID, IsStoped, IsRealStock, AccId } = req.body;
    if (!StoreID) {
      const last = db.prepare('SELECT StoreID FROM Stores ORDER BY StoreID DESC LIMIT 1').get() as any;
      const lastNum = last ? parseInt(last.StoreID.replace('STR', '')) : 0;
      StoreID = `STR${String(lastNum + 1).padStart(3, '0')}`;
    }
    const stmt = db.prepare(`
      INSERT INTO Stores (StoreID, StoreName, Address, Phone, Mobile, SellerID, IsStoped, IsRealStock, AccId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(StoreID, StoreName, Address, Phone, Mobile, SellerID, IsStoped ? 1 : 0, IsRealStock ? 1 : 0, AccId);
    res.status(201).json({ success: true, id: StoreID });
  });
  app.put('/api/stores/:id', (req, res) => {
    const { StoreName, Address, Phone, Mobile, SellerID, IsStoped, IsRealStock, AccId } = req.body;
    const stmt = db.prepare(`
      UPDATE Stores SET StoreName = ?, Address = ?, Phone = ?, Mobile = ?, SellerID = ?, IsStoped = ?, IsRealStock = ?, AccId = ?
      WHERE StoreID = ?
    `);
    stmt.run(StoreName, Address, Phone, Mobile, SellerID, IsStoped ? 1 : 0, IsRealStock ? 1 : 0, AccId, req.params.id);
    res.json({ success: true });
  });
  app.delete('/api/stores/:id', (req, res) => {
    db.prepare('DELETE FROM Stores WHERE StoreID = ?').run(req.params.id);
    res.json({ success: true });
  });

  // Products
  app.get('/api/products', (req, res) => {
    const rows = db.prepare('SELECT * FROM Products').all();
    res.json(rows);
  });
  app.post('/api/products', (req, res) => {
    try {
      const data = { ...req.body };
      if (!data.ProductID) {
        const last = db.prepare('SELECT ProductID FROM Products ORDER BY ProductID DESC LIMIT 1').get() as any;
        const lastNum = last ? parseInt(last.ProductID.replace('PRD', '')) : 0;
        data.ProductID = `PRD${String(lastNum + 1).padStart(3, '0')}`;
      }
      
      // Convert empty strings to null for foreign key columns to avoid constraint failures
      if (data.CategoryId === '') data.CategoryId = null;
      if (data.StoreId === '') data.StoreId = null;
      if (data.MainUnitId === '') data.MainUnitId = null;
      if (data.SubUnitId === '') data.SubUnitId = null;
      if (data.UseUnitID === '') data.UseUnitID = null;

      const fields = Object.keys(data);
      const values = Object.values(data);
      const placeholders = fields.map(() => '?').join(', ');
      const stmt = db.prepare(`INSERT INTO Products (${fields.join(', ')}) VALUES (${placeholders})`);
      stmt.run(...values);
      res.status(201).json({ success: true, id: data.ProductID });
    } catch (error: any) {
      console.error('Product insert error:', error);
      res.status(500).json({ error: error.message });
    }
  });
  app.put('/api/products/:id', (req, res) => {
    try {
      const data = { ...req.body };
      delete data.ProductID; // Don't update ID
      
      // Convert empty strings to null for foreign key columns
      if (data.CategoryId === '') data.CategoryId = null;
      if (data.StoreId === '') data.StoreId = null;
      if (data.MainUnitId === '') data.MainUnitId = null;
      if (data.SubUnitId === '') data.SubUnitId = null;
      if (data.UseUnitID === '') data.UseUnitID = null;

      const fields = Object.keys(data);
      const values = Object.values(data);
      const setClause = fields.map(f => `${f} = ?`).join(', ');
      const stmt = db.prepare(`UPDATE Products SET ${setClause} WHERE ProductID = ?`);
      stmt.run(...values, req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  app.delete('/api/products/:id', (req, res) => {
    db.prepare('DELETE FROM Products WHERE ProductID = ?').run(req.params.id);
    res.json({ success: true });
  });

  // Bulk Price Updates
  app.post('/api/products/bulk-price-update', (req, res) => {
    const { categoryIds, price, type } = req.body; // type: 'PurchPrice' or 'SalePrice'
    if (!categoryIds || !price || !type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const placeholders = categoryIds.map(() => '?').join(', ');
    const stmt = db.prepare(`UPDATE Products SET ${type} = ? WHERE CategoryId IN (${placeholders})`);
    stmt.run(price, ...categoryIds);
    res.json({ success: true });
  });

  // Dashboard Stats
  app.get('/api/stats', (req, res) => {
    const productCount = db.prepare('SELECT COUNT(*) as count FROM Products').get() as any;
    const storeCount = db.prepare('SELECT COUNT(*) as count FROM Stores').get() as any;
    const categoryCount = db.prepare('SELECT COUNT(*) as count FROM Categories').get() as any;
    res.json({
      products: productCount.count,
      stores: storeCount.count,
      categories: categoryCount.count
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true'
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
