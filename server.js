// Basit bir kullanıcı kimlik doğrulama sistemi
// - Express.js ile REST API
// - Kullanıcılar `users.json` dosyasında tutulur (fs modülü)
// - Kayıt, e-posta doğrulama (token ile), giriş akışı
// - Şifreler bcrypt ile hash'lenir
// - Doğrulama token'ı crypto.randomBytes ile üretilir
// - E-posta gönderimi nodemailer + Gmail SMTP ile yapılır

require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const app = express();

// JSON body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // HTML form post'larını da destekle
// Statik dosyaları servis et (public klasörü)
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
const USERS_FILE = path.join(__dirname, 'users.json');

// Uygulama ilk açıldığında users.json dosyasının varlığını garanti altına al
if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2), 'utf-8');
}

// Kullanıcıları dosyadan okuyan yardımcı fonksiyon
function readUsers() {
  try {
    const raw = fs.readFileSync(USERS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    // Beklenmedik bir hata olursa boş liste döndür
    return [];
  }
}

// Kullanıcıları dosyaya yazan yardımcı fonksiyon
function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
}

// Nodemailer transporter (Gmail SMTP)
// NOT: Gmail hesabınızda 2FA açık olmalı ve burada "App Password" kullanılmalıdır.
// Kullanıcı adı ve şifreyi .env dosyasından okuyacağız: GMAIL_USER, GMAIL_PASS
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS, // Gmail App Password kullanın (normal hesap şifresi değil)
  },
});

// Doğrulama e-postası gönderen yardımcı fonksiyon
async function sendVerificationEmail(toEmail, token) {
  const verifyUrl = `http://localhost:${PORT}/verify/${token}`;

  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: toEmail,
    subject: 'Hesabınızı Doğrulayın',
    text: `Merhaba,\n\nHesabınızı doğrulamak için aşağıdaki bağlantıya tıklayın:\n${verifyUrl}\n\nEğer bu işlemi siz başlatmadıysanız bu e-postayı yok sayabilirsiniz.`,
    html: `
      <p>Merhaba,</p>
      <p>Hesabınızı doğrulamak için aşağıdaki bağlantıya tıklayın:</p>
      <p><a href="${verifyUrl}">${verifyUrl}</a></p>
      <p>Eğer bu işlemi siz başlatmadıysanız bu e-postayı yok sayabilirsiniz.</p>
    `,
  };

  // Not: production ortamında transporter.verify() ile test edebilirsiniz
  // Geliştirme kolaylığı için doğrulama URL'sini loglayalım
  console.log('Doğrulama bağlantısı:', verifyUrl);
  try {
    await transporter.sendMail(mailOptions);
  } catch (emailErr) {
    // E-posta gönderimi başarısız olsa bile, geliştirme ortamında akışı bozmayalım
    console.warn('E-posta gönderimi başarısız oldu. .env ayarlarınızı kontrol edin. Hata:', emailErr?.message || emailErr);
  }
}

// POST /register - Kullanıcı kaydı
// Body: { email, password }
app.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body || {};

    // Basit validasyonlar
    if (!email || !password) {
      return res.status(400).json({ message: 'email ve password zorunludur' });
    }
    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ message: 'email ve password string olmalıdır' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'password en az 6 karakter olmalıdır' });
    }

    const users = readUsers();
    const existing = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return res.status(409).json({ message: 'Bu email ile bir hesap zaten mevcut' });
    }

    // Şifreyi hash'le
    const passwordHash = await bcrypt.hash(password, 10);

    // Doğrulama için token üret
    const verifyToken = crypto.randomBytes(32).toString('hex');

    const newUser = {
      id: crypto.randomUUID(),
      email,
      passwordHash,
      isVerified: false,
      verifyToken,
      createdAt: new Date().toISOString(),
      verifiedAt: null,
    };

    users.push(newUser);
    writeUsers(users);

    // Doğrulama e-postasını gönder
    await sendVerificationEmail(email, verifyToken);

    return res.status(201).json({ message: 'Kayıt başarılı. Lütfen e-postanızı doğrulayın.' });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// GET /register - Basit bir HTML formu (kolay test için)
app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

// GET /verify/:token - E-posta doğrulama
app.get('/verify/:token', (req, res) => {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ message: 'Token gerekli' });
    }

    const users = readUsers();
    const userIndex = users.findIndex((u) => u.verifyToken === token);
    if (userIndex === -1) {
      return res.status(400).json({ message: 'Geçersiz veya kullanılmış token' });
    }

    // Kullanıcıyı doğrula
    users[userIndex].isVerified = true;
    users[userIndex].verifiedAt = new Date().toISOString();
    // Token tek kullanımlık olsun diye temizleyelim
    delete users[userIndex].verifyToken;

    writeUsers(users);

    // Tarayıcıdan tıklandığında okunabilir bir mesaj döndür
    return res.status(200).send('Hesabınız başarıyla doğrulandı. Artık giriş yapabilirsiniz.');
  } catch (err) {
    console.error('Verify error:', err);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// POST /login - Giriş
// Body: { email, password }
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ message: 'email ve password zorunludur' });
    }

    const users = readUsers();
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return res.status(401).json({ message: 'Email veya şifre hatalı' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ message: 'Hesap doğrulanmamış. Lütfen e-postanızı doğrulayın.' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: 'Email veya şifre hatalı' });
    }

    // Gerçek bir projede burada JWT veya session üretimi yapılır.
    return res.status(200).json({ message: 'Giriş başarılı' });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// GET /login - Basit bir HTML formu (kolay test için)
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Basit health-check
app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server ${PORT} portunda çalışıyor`);
});


