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

Nếu **không** cấu hình KV, app dùng bộ nhớ tạm (local dev ổn; trên Vercel job có thể mất sau cold start).

---

## Deploy lên Vercel

1. Push repo lên GitHub
2. [Vercel](https://vercel.com) → **Add New Project** → import repo
3. Thêm **Blob** store (Storage → Blob)
4. (Khuyến nghị) Thêm **Redis/Upstash** cho job state bền vững
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
| Upload failed | Thiếu `BLOB_READ_WRITE_TOKEN` | Kiểm tra `.env.local` hoặc Vercel env |
| Job failed ngay | Thiếu / sai `GEMINI_API_KEY` | Tạo lại key tại AI Studio |
| Job mất sau vài phút | Không có KV trên Vercel | Thêm Upstash Redis integration |
| Unsupported file type | `.doc` hoặc định dạng lạ | Chuyển sang PDF/DOCX |
| File exceeds limit | > 25 MB | Giảm kích thước hoặc tăng `MAX_FILE_SIZE_MB` |
| Timeout trên file lớn | > 50 trang hoặc scan nặng | Chia nhỏ file; cân nhắc Vercel Pro |

---

## Cấu trúc thư mục

```
app/
  page.tsx                 # Dashboard upload + danh sách job
  jobs/[id]/page.tsx       # Chi tiết job
  api/upload/              # Token upload Blob
  api/jobs/                # CRUD job + trigger OCR
components/                # UI (Tailwind)
lib/
  parsers/                 # PDF, DOCX, image
  ocr/                     # Gemini client + batch
  export/                  # DOCX builder
  jobs/                    # Job store (KV / memory)
```

---

## Scripts

```bash
npm run dev      # Dev server (Turbopack)
npm run build    # Production build
npm run start    # Chạy bản build
npm test         # Vitest
npm run lint     # ESLint
```

---

## Bảo mật

- **Không** đưa `GEMINI_API_KEY` lên client — chỉ dùng trong API routes
- Repo public: **không** commit `.env`, token, hoặc API key
- App v1 không có đăng nhập — chỉ dùng nội bộ hoặc giới hạn truy cập qua Vercel

---

## License

Private / internal use.
