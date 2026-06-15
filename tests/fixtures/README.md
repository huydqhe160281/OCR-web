## Golden fixtures

| File | Purpose |
|------|---------|
| `golden-vat-invoice.pdf` | **Optional local copy** — MISA VAT sample for manual layout QA (not committed; upload via UI) |
| `golden-vat-invoice.png` | Optional page-1 PNG export for local testing |

**PDF text-layer note:** Hóa đơn MISA có text nhúng sẵn. Phải bật `LAYOUT_EXPORT_V2=true` để app render PDF → ảnh → layout OCR. Nếu flag tắt, output sẽ là đoạn văn phẳng như Word screenshot lỗi layout.
