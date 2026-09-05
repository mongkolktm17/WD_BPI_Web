# UAT-14: Security smoke test

- บัญชีที่ใช้: มี token (login `100001`) + ไม่มี token
- วิธีเรียก: DevTools (F12) → Console ใส่ token เอง หรือใช้ `curl` ใน PowerShell

## ขั้นตอน

| # | ทำ | คาดหวัง |
|---|---|---|
| 1 | `GET http://localhost:4000/api/cctv/buildings` **ไม่ใส่** token | 401 |
| 2 | `GET http://localhost:4000/api/guards/counts/latest` ใส่ token | ได้ข้อมูลจริง (ไม่ error cast "latest") |

PowerShell (ข้อ 2 — แทน `__TOKEN__` ด้วย token จาก localStorage หลัง login):

```powershell
Invoke-RestMethod -Uri "http://localhost:4000/api/guards/counts/latest" -Headers @{ Authorization = "Bearer __TOKEN__" } | ConvertTo-Json -Depth 5
```

## เกณฑ์ผ่าน
2/2 ข้อ — ถ้าข้อ 1 ได้ 200 = **Critical**

## ผล (ติ๊ก/จด)
- [ ] ข้อ 1 ☐ 2 ☐
- บั๊กที่เจอ: _______________
