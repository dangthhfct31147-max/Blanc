# 🔧 RAILWAY OPTION B - TROUBLESHOOTING GUIDE

## Lỗi 403 "Insufficient permissions" trên Admin Panel

### Nguyên nhân

Backend từ chối request DELETE/POST vì:
1. **User không có role admin**: JWT token không chứa `role: "admin"` hoặc `role: "super_admin"`
2. CSRF token mismatch (ít gặp vì admin dùng cookie-based auth)

### Cách kiểm tra role hiện tại

#### Option 1: Dùng Browser DevTools
1. Mở **DevTools** → **Application** → **Cookies** → chọn domain backend
2. Tìm cookie `auth_token`
3. Copy giá trị và decode tại [jwt.io](https://jwt.io)
4. Xem payload có `"role": "admin"` hoặc `"role": "super_admin"` không

#### Option 2: Dùng Console
```javascript
// Paste vào Console của admin panel
const token = document.cookie.match(/auth_token=([^;]+)/)?.[1];
if (token) {
  const payload = JSON.parse(atob(token.split('.')[1]));
  console.log('Current role:', payload.role);
  console.log('User ID:', payload.id);
} else {
  console.log('No auth_token cookie found');
}
```

### Cách fix: Nâng role user lên admin

#### Trên Railway (khuyến nghị - nhanh nhất)

1. Vào Backend service → **Connect** → mở Terminal
2. Chạy lệnh sau (thay `YOUR_EMAIL`):

```bash
node -e "
const { MongoClient } = require('mongodb');
const uri = process.env.DATABASE_URL;
const client = new MongoClient(uri);

(async () => {
  try {
    await client.connect();
    const db = client.db();
    const result = await db.collection('users').updateOne(
      { email: 'YOUR_EMAIL@example.com' },
      { \$set: { role: 'super_admin', updatedAt: new Date() } }
    );
    console.log('Updated:', result.modifiedCount, 'user(s)');
  } finally {
    await client.close();
  }
})();
"
```

#### Trên local (cần access database trực tiếp)

Nếu dùng MongoDB:
```bash
mongosh "YOUR_DATABASE_URL"
use contesthub  # hoặc tên DB của bạn
db.users.updateOne(
  { email: "your@email.com" },
  { $set: { role: "super_admin", updatedAt: new Date() } }
)
```

Nếu dùng PostgreSQL:
```sql
UPDATE users 
SET role = 'super_admin', updated_at = NOW() 
WHERE email = 'your@email.com';
```

### Sau khi fix

1. **Logout** khỏi admin panel
2. **Login** lại để nhận token mới với role đúng
3. Thử DELETE/POST lại → không còn lỗi 403

---

## Lỗi CORS khi gọi Backend

### Triệu chứng
```
Access to fetch at 'https://backend.homelabo.work/api/...' from origin 'https://admin.homelabo.work' 
has been blocked by CORS policy
```

### Cách fix

Vào Backend service → **Variables**, đảm bảo:
```bash
FRONTEND_ORIGIN=https://contesthub.homelabo.work,https://contesthub-admin.homelabo.work
```

- Comma-separated, không có dấu `/` cuối
- Phải có `https://` (không để `http://` trên production)
- Bao gồm **TẤT CẢ** frontend domains (user + admin)

Sau đó **Redeploy** backend.

---

## Lỗi "CSRF token mismatch"

### Triệu chứng
Backend log hiển thị:
```
[Auth] CSRF token mismatch from <IP>: DELETE /api/...
```

### Nguyên nhân
- Cookie `csrf_token` không khớp với header `X-CSRF-Token`
- Hoặc cookie bị chặn bởi trình duyệt (cross-site)

**Ghi chú quan trọng (Admin tách domain):**
- Khi Admin chạy trên domain khác Backend, `document.cookie` của Admin **không đọc được** cookie `csrf_token` (cookie nằm trên domain Backend).
- Vì vậy frontend cần lấy CSRF token qua `GET /api/auth/csrf` (backend trả JSON `{ csrfToken }`).

### Cách fix

#### 1. Kiểm tra cookie settings
Vào Backend Variables, thêm (nếu chưa có):
```bash
AUTH_COOKIE_SAMESITE=lax
AUTH_COOKIE_SECURE=true
AUTH_COOKIE_DOMAIN=
```

#### 2. Kiểm tra TRUST_PROXY
```bash
TRUST_PROXY=1
```

Quan trọng vì Railway chạy sau load balancer.

#### 3. Xóa cache + logout/login lại
1. DevTools → Application → Clear storage
2. Logout admin panel
3. Login lại

#### 4. Nếu thấy 429 khi gọi `/api/auth/csrf`
- Đây thường là do rate limit quá chặt cho nhóm `/api/auth`.
- Bản vá mới đã exempt endpoint `/csrf` khỏi limiter strict (không tính vào 5 lần/15 phút).

---

## Lỗi "Session expired" liên tục

### Nguyên nhân
- Token hết hạn (mặc định 1 ngày)
- Admin đã reset toàn bộ sessions từ settings

### Cách fix
1. Kiểm tra `AUTH_COOKIE_MAX_AGE_MS` (backend):
   ```bash
   AUTH_COOKIE_MAX_AGE_MS=86400000  # 24h
   ```

2. Nếu admin vừa reset sessions:
   - Tất cả users phải login lại (bình thường)
   - Không thể fix, đây là tính năng bảo mật

---

## Lỗi Admin build: "/server: not found"

### Triệu chứng
Railway log hiển thị:
```
COPY server ./server
failed to compute cache key: "/server": not found
```

### Nguyên nhân
Admin service đang build bằng Dockerfile sai (root Dockerfile thay vì `apps/admin/Dockerfile`)

### Cách fix
Đã fix trong commit mới nhất:
- `apps/admin/railway.toml` → `dockerfilePath = "apps/admin/Dockerfile"`
- `apps/admin/railway.json` → tương tự

**Nếu vẫn lỗi:**
1. Push code mới nhất
2. Railway → Admin service → Settings → Build → xác nhận **Root Directory** = `apps/admin`
3. Redeploy

---

## Checklist biến môi trường chuẩn (Option B)

### Backend service
```bash
NODE_ENV=production
DATABASE_URL=<db-url>
JWT_SECRET=<secret>
OTP_EMAIL_URL=<google-apps-script>
OTP_SECRET_KEY=<secret>
FRONTEND_ORIGIN=https://user-domain.com,https://admin-domain.com
TRUST_PROXY=1
REDIS_URL=<auto-from-plugin>
```

### User Frontend service (Build Args)
```bash
VITE_API_URL=https://backend-domain.com/api
VITE_CHAT_ENABLED=false
```

### Admin service (Build Args)
```bash
VITE_API_URL=https://backend-domain.com/api
```

---

## Liên hệ / Debug thêm

Nếu vẫn gặp lỗi:
1. Chụp screenshot **toàn bộ** request/response trong DevTools Network tab
2. Copy backend logs từ Railway (10-20 dòng gần nhất)
3. Kiểm tra JWT payload bằng script ở trên
