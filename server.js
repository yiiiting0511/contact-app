const express = require('express');
const app = express();
const Database = require('better-sqlite3');
const path = require('path');

// --- 中介層設定 ---
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- 資料庫設定 ---
const db = new Database('contacts.db');

// 建立資料表（若不存在則自動建立）
db.exec(`
  CREATE TABLE IF NOT EXISTS contacts (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL,
    phone         TEXT    NOT NULL,
    company_phone TEXT,
    company_ext   TEXT,
    home_phone    TEXT,
    address       TEXT,
    email         TEXT,
    birthday      TEXT,
    gender        TEXT,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME
  )
`);

// Migration：為舊資料表補上新欄位（已存在則跳過）
const migrations = [
  'ALTER TABLE contacts ADD COLUMN company_phone TEXT',
  'ALTER TABLE contacts ADD COLUMN company_ext   TEXT',
  'ALTER TABLE contacts ADD COLUMN home_phone    TEXT',
  'ALTER TABLE contacts ADD COLUMN address       TEXT',
  'ALTER TABLE contacts ADD COLUMN email         TEXT',
  'ALTER TABLE contacts ADD COLUMN birthday      TEXT',
  'ALTER TABLE contacts ADD COLUMN gender        TEXT',
  'ALTER TABLE contacts ADD COLUMN updated_at    DATETIME',
];
migrations.forEach(sql => { try { db.exec(sql); } catch (e) {} });

console.log('✅ 資料庫連線成功');

// GET /contacts → 查詢全部資料
app.get('/contacts', (req, res) => {
  const rows = db.prepare('SELECT * FROM contacts ORDER BY id DESC').all();
  res.json(rows);
});

// POST /contacts → 新增一筆資料
app.post('/contacts', (req, res) => {
  const { name, phone, company_phone, company_ext, home_phone, address, email, birthday, gender } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ error: '姓名與行動電話不可為空' });
  }

  // 重複電話檢查
  const existing = db.prepare('SELECT id FROM contacts WHERE phone = ?').get(phone);
  if (existing) {
    return res.status(409).json({ error: '此行動電話已存在' });
  }

  const result = db.prepare(`
    INSERT INTO contacts (name, phone, company_phone, company_ext, home_phone, address, email, birthday, gender)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    name, phone,
    company_phone || null, company_ext || null, home_phone || null,
    address || null, email || null, birthday || null, gender || null
  );

  res.status(201).json({ message: '新增成功', id: result.lastInsertRowid });
});

// PUT /contacts/:id → 修改指定 id 的資料
app.put('/contacts/:id', (req, res) => {
  const { name, phone, company_phone, company_ext, home_phone, address, email, birthday, gender } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ error: '姓名與行動電話不可為空' });
  }

  db.prepare(`
    UPDATE contacts
    SET name=?, phone=?, company_phone=?, company_ext=?, home_phone=?,
        address=?, email=?, birthday=?, gender=?, updated_at=datetime('now')
    WHERE id=?
  `).run(
    name, phone,
    company_phone || null, company_ext || null, home_phone || null,
    address || null, email || null, birthday || null, gender || null,
    req.params.id
  );

  res.json({ message: '修改成功' });
});

// DELETE /contacts/:id → 刪除指定 id 的資料
app.delete('/contacts/:id', (req, res) => {
  db.prepare('DELETE FROM contacts WHERE id=?').run(req.params.id);
  res.json({ message: '刪除成功' });
});

// 定義一條路由：GET /
app.get('/', (req, res) => {
  res.send('Hello World！伺服器正常運作中');
});

// 啟動伺服器，監聽 3000 port
app.listen(3000, () => {
  console.log('伺服器已啟動：http://localhost:3000');
});
