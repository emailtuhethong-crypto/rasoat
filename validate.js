import { EDITABLE_COLUMNS } from "./config.js";

/**
 * Validate một object { E, F, G, H, I } trước khi ghi vào Sheet.
 * Dùng chung cho cả API /update (nhập tay) và /import (excel)
 * -> đảm bảo 2 luồng không bao giờ lệch quy tắc nhau.
 *
 * Trả về { valid: boolean, errors: { [col]: message } }
 */
export function validateFields(fields) {
  const errors = {};

  for (const [col, rule] of Object.entries(EDITABLE_COLUMNS)) {
    const raw = fields[col];
    const value = raw === undefined || raw === null ? "" : String(raw).trim();

    if (rule.required && value === "") {
      errors[col] = `${rule.label} là bắt buộc`;
      continue;
    }

    if (value === "") continue; // không bắt buộc và để trống -> hợp lệ

    if (rule.type === "code8" && !rule.pattern.test(value)) {
      errors[col] = rule.errorMessage;
      continue;
    }

    if (rule.type === "text" && rule.maxLength && value.length > rule.maxLength) {
      errors[col] = `${rule.label} không được vượt quá ${rule.maxLength} ký tự`;
      continue;
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Chuẩn hóa giá trị trước khi ghi (ví dụ giữ nguyên chuỗi số có số 0 đầu).
 * Luôn trả về string để tránh Google Sheets tự suy luận kiểu dữ liệu.
 */
export function normalizeFields(fields) {
  const out = {};
  for (const col of Object.keys(EDITABLE_COLUMNS)) {
    const raw = fields[col];
    out[col] = raw === undefined || raw === null ? "" : String(raw).trim();
  }
  return out;
}
