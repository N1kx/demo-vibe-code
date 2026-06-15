# demo-vibe-code

REST API backend dengan sistem autentikasi berbasis JWT. Dibangun menggunakan Bun, ElysiaJS, Drizzle ORM, dan PostgreSQL.

---

## Technology Stack

| Teknologi | Versi | Peran |
|-----------|-------|-------|
| [Bun](https://bun.sh) | 1.3+ | Runtime, package manager, test runner |
| [ElysiaJS](https://elysiajs.com) | 1.4+ | Web framework |
| [Drizzle ORM](https://orm.drizzle.team) | 0.45+ | ORM & query builder |
| [PostgreSQL](https://www.postgresql.org) | 14+ | Database |
| [@elysiajs/jwt](https://elysiajs.com/plugins/jwt) | 1.4+ | JWT plugin untuk Elysia |

---

## Struktur Folder

```
.
├── index.ts                    # Entry point — inisialisasi server
├── drizzle.config.ts           # Konfigurasi Drizzle Kit (migrasi)
├── drizzle/                    # File migrasi SQL (auto-generated)
├── tests/                      # Integration tests
│   ├── helpers.ts              # Shared app instance, cleanDb(), request()
│   ├── health.test.ts          # Test endpoint health check
│   ├── users.test.ts           # Test register & current user
│   └── auth.test.ts            # Test login & logout
└── src/
    ├── db/
    │   ├── index.ts            # Koneksi database (Drizzle instance)
    │   └── schema/
    │       ├── index.ts        # Barrel export semua schema
    │       ├── users.ts        # Schema tabel users
    │       └── user_sessions.ts# Schema tabel user_sessions
    ├── middlewares/
    │   └── auth.middleware.ts  # Validasi JWT + pengecekan sesi aktif di DB
    ├── routes/
    │   ├── index.ts            # Router utama (prefix /api)
    │   ├── users.routes.ts     # Route /users
    │   └── auth.routes.ts      # Route /login, /logout
    └── services/
        ├── users.services.ts   # Logic registrasi user
        ├── auth.services.ts    # Logic login, logout, getSessionUser
        └── health.service.ts   # Logic health check
```

### Konvensi Penamaan

| Layer | Format | Contoh |
|-------|--------|--------|
| Schema DB | `<domain>.ts` | `users.ts` |
| Route | `<domain>.routes.ts` | `users.routes.ts` |
| Service | `<domain>.services.ts` | `users.services.ts` |
| Middleware | `<domain>.middleware.ts` | `auth.middleware.ts` |
| Test | `<domain>.test.ts` | `users.test.ts` |

---

## Database Schema

### Tabel `users`

| Kolom | Tipe | Constraint |
|-------|------|------------|
| `id` | serial | PRIMARY KEY |
| `username` | varchar(50) | NOT NULL, UNIQUE |
| `full_name` | varchar(255) | NOT NULL |
| `email` | varchar(255) | NOT NULL |
| `password` | varchar(255) | NOT NULL (bcrypt hash) |
| `created_at` | timestamp | DEFAULT now() |
| `created_by` | varchar(50) | nullable |
| `updated_at` | timestamp | DEFAULT now() |
| `updated_by` | varchar(50) | nullable |

### Tabel `user_sessions`

| Kolom | Tipe | Constraint |
|-------|------|------------|
| `id` | serial | PRIMARY KEY |
| `token` | varchar(255) | NOT NULL (UUID session id) |
| `user_id` | integer | FK → `users.id` |
| `created_at` | timestamp | DEFAULT now() |
| `created_by` | varchar(50) | nullable |
| `updated_at` | timestamp | nullable |
| `updated_by` | varchar(50) | nullable |

> **Desain sesi:** kolom `token` menyimpan UUID (bukan JWT). JWT yang dikirim ke client menyimpan UUID ini sebagai claim `sid`. Saat request masuk, server mencocokkan `sid` dari JWT dengan baris di `user_sessions` — jika baris tidak ada (sudah logout), token dianggap tidak valid.

---

## API Endpoints

Base URL: `http://localhost:3000`

### Health Check

#### `GET /api/health`

Cek status server.

**Response:**
```json
{ "status": "ok" }
```

---

### Users

#### `POST /api/users` — Registrasi User

**Request Body:**
```json
{
  "username": "N1kx",
  "full_name": "Niko Winoko",
  "email": "niko@example.com",
  "password": "rahasia"
}
```

**Response — Sukses (200):**
```json
{ "data": "OK" }
```

**Response — Username sudah terdaftar (409):**
```json
{ "error": "Username already exists." }
```

---

#### `GET /api/users/current` — Data User yang Login

**Headers:**
```
Authorization: Bearer <token>
```

**Response — Sukses (200):**
```json
{
  "data": {
    "id": 1,
    "username": "N1kx",
    "full_name": "Niko Winoko"
  }
}
```

**Response — Tidak terautentikasi (401):**
```json
{ "error": "Unauthorized" }
```

---

### Auth

#### `POST /api/login` — Login

Rate limited: **maksimal 5 percobaan per 60 detik** per kombinasi IP + username.

**Request Body:**
```json
{
  "username": "N1kx",
  "password": "rahasia"
}
```

**Response — Sukses (200):**
```json
{ "data": "<JWT token>" }
```

**Response — Kredensial salah (401):**
```json
{ "error": "Username or password is not found. Please try again." }
```

**Response — Rate limit tercapai (429):**
```json
{ "error": "Too many requests. Please try again later." }
```

---

#### `POST /api/logout` — Logout

**Headers:**
```
Authorization: Bearer <token>
```

**Response — Sukses (200):**
```json
{ "data": "OK" }
```

**Response — Tidak terautentikasi (401):**
```json
{ "error": "Unauthorized" }
```

---

## Setup & Menjalankan Aplikasi

### Prasyarat

- [Bun](https://bun.sh) versi 1.3 atau lebih baru
- PostgreSQL yang sudah berjalan

### 1. Clone dan install dependency

```bash
git clone https://github.com/N1kx/demo-vibe-code.git
cd demo-vibe-code
bun install
```

### 2. Konfigurasi environment

```bash
cp .env.example .env
```

Edit `.env` sesuai environment kamu:

```env
DATABASE_URL=postgres://user:password@localhost:5432/nama_database
PORT=3000
JWT_SECRET=your-super-secret-jwt-key
```

### 3. Jalankan migrasi database

```bash
bun run db:migrate
```

### 4. Jalankan server

```bash
# Mode development (auto-restart saat file berubah)
bun run dev

# Mode production
bun run start
```

Server berjalan di `http://localhost:3000`.

---

### Database Scripts

| Script | Perintah | Keterangan |
|--------|----------|------------|
| Generate migrasi | `bun run db:generate` | Buat file SQL migrasi baru dari perubahan schema |
| Jalankan migrasi | `bun run db:migrate` | Terapkan migrasi ke database |
| Buka studio | `bun run db:studio` | Buka Drizzle Studio (GUI database) |

---

## Menjalankan Test

Test menggunakan `bun test` dan berjalan sebagai integration test langsung terhadap database (tidak menggunakan mock).

> **Perhatian:** Test akan menghapus semua data di tabel `users` dan `user_sessions`. Pastikan menggunakan database khusus untuk testing, bukan database production.

```bash
bun test
```

Contoh output:

```
bun test v1.3.14

 24 pass
 0 fail
 44 expect() calls
Ran 24 tests across 3 files. [3.27s]
```

### Struktur Test

| File | Endpoint | Jumlah Skenario |
|------|----------|-----------------|
| `tests/health.test.ts` | `GET /api/health` | 1 |
| `tests/users.test.ts` | `POST /api/users`, `GET /api/users/current` | 9 |
| `tests/auth.test.ts` | `POST /api/login`, `POST /api/logout` | 14 |
