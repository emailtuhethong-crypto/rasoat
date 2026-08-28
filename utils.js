import { MATCH_COLUMN, ALL_COLUMNS, DATA_START_ROW } from "./config.js";

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

const MATCH_COL_INDEX = ALL_COLUMNS.indexOf(MATCH_COLUMN); // D -> index 3

/**
 * Từ dữ liệu thô (mảng các row lấy từ Sheets), tạo map: mã (cột D) -> số dòng thật trong sheet.
 * Số dòng thật = index trong mảng + DATA_START_ROW (vì dòng 1 là header).
 */
export function buildCodeToRowMap(rawRows) {
  const map = new Map();
  rawRows.forEach((row, i) => {
    const code = row[MATCH_COL_INDEX];
    if (code !== undefined && code !== null && String(code).trim() !== "") {
      map.set(String(code).trim(), i + DATA_START_ROW);
    }
  });
  return map;
}
