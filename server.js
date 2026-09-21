import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Database from 'better-sqlite3';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const db = new Database(process.env.DB_FILE || 'yu-store.db');
db.pragma('journal_mode = WAL');
db.exec(`CREATE TABLE IF NOT EXISTS admins (id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, description TEXT NOT NULL, category TEXT NOT NULL, price INTEGER NOT NULL, stock INTEGER NOT NULL DEFAULT 0, image_url TEXT, download_url TEXT, active INTEGER NOT NULL DEFAULT 1, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, product_id INTEGER NOT NULL, customer_email TEXT, amount INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'Pending', created_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(product_id) REFERENCES products(id));
CREATE TABLE IF NOT EXISTS payment_transactions (id TEXT PRIMARY KEY, order_id TEXT NOT NULL, provider TEXT NOT NULL, status TEXT NOT NULL, reference TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS purchase_keys (id TEXT PRIMARY KEY, order_id TEXT NOT NULL, product_id INTEGER NOT NULL, key_hash TEXT UNIQUE NOT NULL, status TEXT NOT NULL DEFAULT 'unused', created_at TEXT DEFAULT CURRENT_TIMESTAMP, used_at TEXT, FOREIGN KEY(product_id) REFERENCES products(id));
CREATE TABLE IF NOT EXISTS site_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);`);
const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
if (!db.prepare('SELECT id FROM admins WHERE email=?').get(adminEmail)) db.prepare('INSERT INTO admins(email,password_hash) VALUES(?,?)').run(adminEmail, bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'change-me-now', 12));
const settings = {logo:'YU💠', title:'YU💠 Store', bio:'Designer who creates delightful experiences', projects:'144', likes:'604', comments:'44', socials: JSON.stringify({roblox:'#',youtube:'#',discord:'#',tiktok:'#',x:'#'}), payment_instructions:process.env.PAYMENT_INSTRUCTIONS || 'Complete payment, then wait for confirmation.', payment_qr_url:process.env.PAYMENT_QR_URL || ''};
for (const [key,value] of Object.entries(settings)) db.prepare('INSERT OR IGNORE INTO site_settings(key,value) VALUES(?,?)').run(key,value);
if (!db.prepare('SELECT id FROM products LIMIT 1').get()) { const add=db.prepare('INSERT INTO products(name,description,category,price,stock,image_url,download_url) VALUES(?,?,?,?,?,?,?)'); [['Roblox Script Pack','Useful scripts for games and automation.','Scripts',500,10,'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800','#'],['Custom UI Kit','Modern glass UI designs for your game.','UI',700,8,'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=800','#'],['Premium Script Bundle','All scripts plus future updates.','Premium',1500,5,'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800','#']].forEach(p=>add.run(...p)); }
app.use(helmet({contentSecurityPolicy:false})); app.use(compression()); app.use(express.json({limit:'100kb'})); app.use(cookieParser());
const authLimit=rateLimit({windowMs:15*60*1000,max:20,standardHeaders:true});
const token=(id)=>jwt.sign({adminId:id},process.env.JWT_SECRET || 'dev-only-secret',{expiresIn:'2h'});
function auth(req,res,next){try{req.admin=jwt.verify(req.cookies.yu_admin,process.env.JWT_SECRET || 'dev-only-secret');next()}catch{res.status(401).json({error:'Authentication required'})}}
function settingMap(){return Object.fromEntries(db.prepare('SELECT key,value FROM site_settings').all().map(x=>[x.key,x.value]));}
function publicProduct(p){return {...p,price:p.price/100,active:!!p.active};}
app.get('/api/site',(req,res)=>res.json({settings:settingMap(),products:db.prepare('SELECT * FROM products WHERE active=1 ORDER BY id DESC').all().map(publicProduct)}));
app.post('/api/orders', (req,res)=>{const p=db.prepare('SELECT * FROM products WHERE id=? AND active=1').get(Number(req.body.productId)); if(!p||p.stock<1)return res.status(400).json({error:'Product is out of stock'}); const id=crypto.randomUUID(); db.prepare('INSERT INTO orders(id,product_id,customer_email,amount) VALUES(?,?,?,?)').run(id,p.id,String(req.body.email||'').slice(0,160),p.price); db.prepare('INSERT INTO payment_transactions(id,order_id,provider,status) VALUES(?,?,?,?)').run(crypto.randomUUID(),id,'manual','Pending'); res.status(201).json({orderId:id,amount:p.price/100, instructions:settingMap().payment_instructions, qrUrl:settingMap().payment_qr_url});});
app.post('/api/redeem',(req,res)=>{const raw=String(req.body.key||'').trim().toUpperCase(); const hash=crypto.createHash('sha256').update(raw).digest('hex'); const k=db.prepare('SELECT purchase_keys.*,products.name,products.download_url FROM purchase_keys JOIN products ON products.id=purchase_keys.product_id WHERE key_hash=? AND status="unused"').get(hash); if(!k)return res.status(400).json({error:'Invalid or already used key'}); const use=db.transaction(()=>{db.prepare('UPDATE purchase_keys SET status="used",used_at=CURRENT_TIMESTAMP WHERE id=? AND status="unused"').run(k.id); return db.prepare('SELECT changes() AS n').get().n}); if(!use)return res.status(400).json({error:'Key already used'}); res.json({productName:k.name,downloadUrl:k.download_url});});
app.post('/api/admin/login',authLimit,(req,res)=>{const a=db.prepare('SELECT * FROM admins WHERE email=?').get(String(req.body.email||'')); if(!a||!bcrypt.compareSync(String(req.body.password||''),a.password_hash))return res.status(401).json({error:'Invalid credentials'}); res.cookie('yu_admin',token(a.id),{httpOnly:true,sameSite:'strict',secure:process.env.NODE_ENV==='production',maxAge:7200000});res.json({ok:true});});
app.post('/api/admin/logout',(req,res)=>{res.clearCookie('yu_admin');res.json({ok:true});});
app.get('/api/admin/dashboard',auth,(req,res)=>{const q=(s)=>db.prepare(s).get().n;res.json({products:q('SELECT COUNT(*) n FROM products'),stock:q('SELECT COALESCE(SUM(stock),0) n FROM products'),orders:q('SELECT COUNT(*) n FROM orders'),paidOrders:q("SELECT COUNT(*) n FROM orders WHERE status='Paid'"),availableKeys:q("SELECT COUNT(*) n FROM purchase_keys WHERE status='unused'"),usedKeys:q("SELECT COUNT(*) n FROM purchase_keys WHERE status='used'"),orders:db.prepare('SELECT orders.*,products.name FROM orders JOIN products ON products.id=orders.product_id ORDER BY created_at DESC LIMIT 100').all(),products:db.prepare('SELECT * FROM products ORDER BY id DESC').all(),settings:settingMap()});});
app.post('/api/admin/products',auth,(req,res)=>{const b=req.body;const r=db.prepare('INSERT INTO products(name,description,category,price,stock,image_url,download_url) VALUES(?,?,?,?,?,?,?)').run(b.name,b.description,b.category,Math.round(Number(b.price)*100),Math.max(0,Number(b.stock)||0),b.imageUrl||'',b.downloadUrl||'');res.json({id:r.lastInsertRowid});});
app.put('/api/admin/products/:id',auth,(req,res)=>{const b=req.body;db.prepare('UPDATE products SET name=?,description=?,category=?,price=?,stock=?,image_url=?,download_url=?,active=? WHERE id=?').run(b.name,b.description,b.category,Math.round(Number(b.price)*100),Math.max(0,Number(b.stock)||0),b.imageUrl||'',b.downloadUrl||'',b.active?1:0,req.params.id);res.json({ok:true});});
app.delete('/api/admin/products/:id',auth,(req,res)=>{db.prepare('UPDATE products SET active=0 WHERE id=?').run(req.params.id);res.json({ok:true});});
app.post('/api/admin/orders/:id/status',auth,(req,res)=>{if(!['Pending','Paid','Failed','Cancelled'].includes(req.body.status))return res.status(400).json({error:'Invalid status'});db.prepare('UPDATE orders SET status=? WHERE id=?').run(req.body.status,req.params.id);res.json({ok:true});});
app.post('/api/admin/keys',auth,(req,res)=>{const order=db.prepare('SELECT * FROM orders WHERE id=? AND status="Paid"').get(req.body.orderId);if(!order)return res.status(400).json({error:'Order must be marked Paid first'});const raw='YU-'+[1,2,3].map(()=>crypto.randomBytes(2).toString('hex').toUpperCase()).join('-');db.prepare('INSERT INTO purchase_keys(id,order_id,product_id,key_hash) VALUES(?,?,?,?)').run(crypto.randomUUID(),order.id,order.product_id,crypto.createHash('sha256').update(raw).digest('hex'));db.prepare('UPDATE products SET stock=MAX(stock-1,0) WHERE id=?').run(order.product_id);res.json({key:raw});});
app.put('/api/admin/settings',auth,(req,res)=>{const allowed=['logo','title','bio','projects','likes','comments','socials','payment_instructions','payment_qr_url'];for(const k of allowed)if(req.body[k]!==undefined)db.prepare('INSERT INTO site_settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(k,String(req.body[k]));res.json({ok:true});});
app.use(express.static(path.join(__dirname,'public')));app.get('/admin',(req,res)=>res.sendFile(path.join(__dirname,'public/admin.html')));app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'public/index.html')));
app.listen(process.env.PORT||3000,()=>console.log(`YU Store running on ${process.env.PORT||3000}`));
