const express = require("express");
const session = require("express-session");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const UPLOADS = path.join(ROOT, "uploads");
fs.mkdirSync(UPLOADS, { recursive: true });

const db = new Database(path.join(ROOT, "instantvirtual.db"));
db.exec(`
CREATE TABLE IF NOT EXISTS analyses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL,
  result TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  phone TEXT,
  amount TEXT,
  reference TEXT,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);

app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(session({
  secret: process.env.SESSION_SECRET || "CHANGE_ME_IN_PRODUCTION",
  resave:false,
  saveUninitialized:false,
  cookie:{httpOnly:true, sameSite:"lax", secure:false}
}));
app.use(express.static(path.join(ROOT, "public")));

const upload = multer({
  storage: multer.diskStorage({
    destination: (_,__,cb)=>cb(null,UPLOADS),
    filename: (_,file,cb)=>cb(null, Date.now()+"-"+file.originalname.replace(/[^a-zA-Z0-9._-]/g,"_"))
  }),
  limits:{fileSize:8*1024*1024},
  fileFilter: (_,file,cb)=>cb(null, /^image\/(png|jpe?g|webp)$/i.test(file.mimetype))
});

function adminOnly(req,res,next){
  if(!req.session.admin) return res.status(401).json({error:"Admin login required"});
  next();
}

app.post("/api/admin/login",(req,res)=>{
  const {username,password}=req.body;
  const ok=username === (process.env.ADMIN_USERNAME||"admin") &&
           password === (process.env.ADMIN_PASSWORD||"change-this-password");
  if(!ok) return res.status(401).json({error:"Invalid login"});
  req.session.admin=true;
  res.json({ok:true});
});
app.post("/api/admin/logout",(req,res)=>req.session.destroy(()=>res.json({ok:true})));
app.get("/api/admin/me",(req,res)=>res.json({admin:!!req.session.admin}));

app.post("/api/analyze", upload.single("image"), (req,res)=>{
  if(!req.file) return res.status(400).json({error:"Please upload a PNG, JPG or WebP screenshot."});

  // Safe starter behavior: no fake betting claims. Replace this section with
  // your chosen vision/AI provider after adding its API key and terms.
  const result = `Screenshot received successfully.

File: ${req.file.originalname}

AI analysis is ready to be connected. The production version should send this
image to a vision-capable AI model and return the exact fixture/match analysis
you want to provide to your customers.`;

  const info=db.prepare("INSERT INTO analyses(filename,result) VALUES(?,?)")
    .run(req.file.originalname,result);

  res.json({id:info.lastInsertRowid,result});
});

app.post("/api/payments",(req,res)=>{
  const {name,phone,amount,reference}=req.body;
  if(!name || !phone || !amount) return res.status(400).json({error:"Name, phone and amount are required."});
  const info=db.prepare("INSERT INTO payments(name,phone,amount,reference) VALUES(?,?,?,?)")
    .run(name,phone,amount,reference||"");
  res.json({ok:true,id:info.lastInsertRowid});
});

app.get("/api/admin/stats",adminOnly,(req,res)=>{
  const analyses=db.prepare("SELECT COUNT(*) n FROM analyses").get().n;
  const payments=db.prepare("SELECT COUNT(*) n FROM payments").get().n;
  const pending=db.prepare("SELECT COUNT(*) n FROM payments WHERE status='pending'").get().n;
  res.json({analyses,payments,pending});
});
app.get("/api/admin/analyses",adminOnly,(req,res)=>{
  res.json(db.prepare("SELECT * FROM analyses ORDER BY id DESC LIMIT 100").all());
});
app.get("/api/admin/payments",adminOnly,(req,res)=>{
  res.json(db.prepare("SELECT * FROM payments ORDER BY id DESC LIMIT 100").all());
});
app.post("/api/admin/payments/:id/status",adminOnly,(req,res)=>{
  const allowed=["pending","approved","rejected"];
  if(!allowed.includes(req.body.status)) return res.status(400).json({error:"Invalid status"});
  db.prepare("UPDATE payments SET status=? WHERE id=?").run(req.body.status,req.params.id);
  res.json({ok:true});
});

app.get("*",(req,res)=>res.sendFile(path.join(ROOT,"public","index.html")));
app.listen(PORT,()=>console.log(`InstantVirtual Premium AI running on port ${PORT}`));
