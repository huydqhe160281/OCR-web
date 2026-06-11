# OCR Web

Ứng dụng web OCR nội bộ: tải lên PDF / DOCX / ảnh → nhận dạng văn bản (tiếng Việt & tiếng Nhật) bằng Gemini → tải xuống file DOCX có cấu trúc.

**Demo (Vercel):** [https://ocrweb-five.vercel.app](https://ocrweb-five.vercel.app)

---

## Tính năng

- Hỗ trợ **PDF**, **DOCX**, **JPEG**, **PNG**, **WebP**
- OCR đa ngôn ngữ: **tiếng Việt** (ưu tiên) và **tiếng Nhật** (tự phát hiện)
- Trích xuất bảng, heading, đoạn văn; xuất **DOCX**
- Theo dõi tiến trình xử lý theo thời gian thực
- Xem trước nội dung trước khi tải xuống
- Giới hạn mặc định: **25 MB**, tối đa **50 trang** / file

---

## Yêu cầu

| Thành phần | Phiên bản |
|------------|-----------|
| Node.js | 20+ |
| npm | 10+ |
| Tài khoản Google AI Studio | [API key Gemini](https://aistudio.google.com/apikey) |
| Vercel Blob | Token đọc/ghi (bắt buộc cho upload file) |

---

## Chạy trên máy local

### 1. Clone và cài đặt

```bash
git clone https://github.com/huydqhe160281/OCR-web.git
cd OCR-web
npm install
```

### 2. Cấu hình biến môi trường

```bash
cp .env.example .env.local
```

Mở `.env.local` và điền ít nhất hai biến bắt buộc:

```env
GEMINI_API_KEY=your_gemini_api_key
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
```

**Lấy `GEMINI_API_KEY`:** [Google AI Studio](https://aistudio.google.com/apikey) → Create API key.

**Lấy `BLOB_READ_WRITE_TOKEN`:**

1. Vào [Vercel Dashboard](https://vercel.com/dashboard) → project (hoặc tạo project mới)
2. **Storage** → **Blob** → Create store
3. Tab **Settings** → copy **Read-Write Token**

> **Lưu ý:** Không commit file `.env` hoặc `.env.local`. Chỉ commit `.env.example`.

### 3. Chạy dev server

```bash
npm run dev
```

Mở trình duyệt: **http://localhost:3000**

### 4. Kiểm tra nhanh

```bash
npm test          # unit tests
npm run build     # build production
npm run lint      # ESLint
```

---

## Hướng dẫn sử dụng trên web

### Bước 1 — Tải file lên

1. Mở trang chủ (local hoặc [ocrweb-five.vercel.app](https://ocrweb-five.vercel.app))
2. Nhấn **Choose file**
3. Chọn một file: PDF, DOCX, JPG, PNG hoặc WebP (≤ 25 MB)

Hệ thống upload trực tiếp lên Vercel Blob, sau đó tạo job OCR và chuyển sang trang chi tiết job.

### Bước 2 — Theo dõi tiến trình

Trên trang job bạn sẽ thấy:

| Trạng thái | Ý nghĩa |
|------------|---------|
| `queued` | Job đang chờ xử lý |
| `processing` | Đang OCR (thanh progress hiển thị số trang) |
| `completed` | Hoàn tất — có thể tải DOCX |
| `failed` | Lỗi — đọc thông báo lỗi trên màn hình |

Trang tự làm mới mỗi 2 giây khi job đang chạy. Không cần reload thủ công.

### Bước 3 — Xem trước & tải DOCX

Khi job **completed**:

1. Nhấn **Download DOCX** để tải file kết quả
2. Cuộn xuống **Preview** để xem nội dung đã nhận dạng (heading, đoạn văn, bảng)
3. Các block độ tin cậy thấp có thể được đánh dấu — nên kiểm tra lại trước khi dùng chính thức

### Bước 4 — Xem lại job cũ

Trang chủ liệt kê **Recent jobs**. Nhấn vào job để mở lại trang chi tiết.

---

## Định dạng hỗ trợ & giới hạn

| Loại file | MIME type | Ghi chú |
|-----------|-----------|---------|
| PDF | `application/pdf` | Text layer hoặc scan — OCR từng trang |
| DOCX | Word OpenXML | Trích text + OCR ảnh nhúng |
| JPG / PNG / WebP | `image/*` | Ảnh chụp tài liệu |

| Giới hạn | Mặc định | Biến env |
|----------|----------|----------|
| Kích thước file | 25 MB | `MAX_FILE_SIZE_MB` |
| Số trang | 50 | `MAX_PAGES` |
| Thời gian job (Vercel) | 300 giây | `vercel.json` |

**Không hỗ trợ:** file `.doc` (Word cũ) — vui lòng chuyển sang `.docx`.

---

## Biến môi trường

| Biến | Bắt buộc | Mặc định | Mô tả |
|------|----------|----------|-------|
| `GEMINI_API_KEY` | Có | — | API key Gemini (server-only) |
| `BLOB_READ_WRITE_TOKEN` | Có (prod/local upload) | — | Token Vercel Blob |
| `GEMINI_OCR_MODEL` | Không | `gemini-2.5-flash` | Model OCR chính |
| `GEMINI_STRUCTURE_MODEL` | Không | `gemini-2.5-pro` | Model cấu trúc bảng/phức tạp |
| `MAX_FILE_SIZE_MB` | Không | `25` | Giới hạn dung lượng |
| `MAX_PAGES` | Không | `50` | Giới hạn số trang |
| `JOB_TTL_HOURS` | Không | `24` | TTL job metadata |
| `KV_REST_API_URL` | Không | — | Upstash Redis / Vercel KV |
| `KV_REST_API_TOKEN` | Không | — | Token KV |
| `NEXT_PUBLIC_MAX_FILE_SIZE_MB` | Không | `25` | Hiển thị giới hạn trên UI |
| `USE_INNGEST` | Không | `false` | Bật queue nền (cần cấu hình Inngest) |

Nếu **không** cấu hình KV, app dùng file store dưới `.tmp/ocr-jobs/` khi chạy local. **Trên Vercel, KV là bắt buộc** — deploy thiếu `KV_REST_API_URL` / `KV_REST_API_TOKEN` sẽ fail-fast khi lưu job.

### Dùng cá nhân — không cần đăng nhập

App v1 **không có auth** (OAuth, API key middleware, Basic Auth). Phù hợp dùng nội bộ / cá nhân. **Không nên public URL** nếu chưa thêm lớp bảo vệ sau này.

### Preview có thể bị cắt ngắn

Job lớn chỉ lưu tối đa **50 block đầu** trong metadata để tránh vượt giới hạn KV. Trang job hiển thị cảnh báo; file **DOCX download vẫn đầy đủ**.

---

## Deploy lên Vercel

1. Push repo lên GitHub
2. [Vercel](https://vercel.com) → **Add New Project** → import repo
3. Thêm **Blob** store (Storage → Blob)
4. (Bắt buộc) Thêm **Redis/Upstash** — job state không chạy ổn trên Vercel nếu thiếu KV
5. **Settings → Environment Variables** — thêm các biến như `.env.example`
6. Deploy — `vercel.json` đã cấu hình `maxDuration: 300` cho route xử lý job

Deploy bằng CLI:

```bash
npm i -g vercel
vercel login
vercel link
vercel env add GEMINI_API_KEY production
vercel env add BLOB_READ_WRITE_TOKEN production
vercel deploy
```

---

## Xử lý sự cố

| Triệu chứng | Nguyên nhân thường gặp | Cách xử lý |
|-------------|------------------------|------------|
| Upload failed / 400 Bad Request | Blob store **private** nhưng code dùng `public`, hoặc thiếu token | App dùng `access: private` — kiểm tra `BLOB_READ_WRITE_TOKEN` (không bọc dấu `"`) |
| Upload failed | Thiếu `BLOB_READ_WRITE_TOKEN` | Kiểm tra `.env.local` hoặc Vercel env |
| Job failed ngay | Thiếu / sai `GEMINI_API_KEY` | Tạo lại key tại AI Studio |
| Job stuck `processing` | Timeout hoặc cold start | Chờ hết timeout; gọi lại `POST /api/jobs/[id]/process` trả `Already processing` — reset thủ công ngoài scope v1 |
| Job mất sau vài phút | Không có KV trên Vercel | Thêm Upstash Redis integration |
| Unsupported file type | `.doc` hoặc định dạng lạ | Chuyển sang PDF/DOCX |
| File exceeds limit | > 25 MB | Giảm kích thước hoặc tăng `MAX_FILE_SIZE_MB` |
| Timeout trên file lớn | > 50 trang hoặc scan nặng | Chia nhỏ file; cân nhắc Vercel Pro |

---

## Cấu trúc thư mục

```
app/                       # Next.js App Router (API + pages)
  api/upload/              # Blob upload token
  api/jobs/                # Job CRUD + OCR trigger + download
  jobs/[id]/               # Job detail page
components/                # UI (Tailwind)
lib/                       # Production code only (no *.test.ts)
  api/                     # Zod schemas + request parsing
  jobs/                    # Store, pipeline, trigger (process-job)
  parsers/                 # PDF / DOCX / image
  ocr/                     # Gemini client + batch processor
  export/                  # DOCX builder
  blob.ts, config.ts, …    # Shared infra
tests/                     # Vitest — mirrors lib/ layout
  lib/
    api/
    jobs/
    ocr/
    parsers/
    …
```

**Vercel layout notes:** `lib/jobs/process-job.ts` chạy trong serverless (`maxDuration: 300`); KV bắt buộc khi `VERCEL=1`; Blob private + download qua API route.

---

## Scripts

```bash
npm run dev      # Dev server (Turbopack)
npm run build    # Production build
npm run start    # Chạy bản build
npm test         # Vitest (tests/lib/**)
npm run lint     # ESLint
```

---

## Bảo mật

- **Không** đưa `GEMINI_API_KEY` lên client — chỉ dùng trong API routes
- Repo public: **không** commit `.env`, token, hoặc API key
- App v1 **không có đăng nhập** — dùng cá nhân/nội bộ; tránh public URL nếu chưa thêm auth
- Validate `blobUrl` chỉ chấp nhận host `*.blob.vercel-storage.com` khi tạo job

---

## License

Private / internal use.
