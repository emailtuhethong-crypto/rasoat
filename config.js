// Cấu hình cột của sheet — thay đổi ở đây sẽ áp dụng cho toàn bộ hệ thống
// (đọc dữ liệu, ghi tay, import excel đều dùng chung file này -> DRY)

// Cột khóa (không được nhập/sửa dù nhập tay hay import)
export const LOCKED_COLUMNS = ["A", "B", "C", "D", "E", "F"];

// Cột dùng để đối chiếu khi import (Mã xã mới) — đã kiểm chứng không trùng lặp trong từng đơn vị
export const MATCH_COLUMN = "D";

// Cột đơn vị -> dùng để suy ra tên tab (chỉ dùng khi cần, không bắt buộc vì ta chọn theo tên tab trực tiếp)
export const UNIT_COLUMN = "B";

// Cột được phép nhập, kèm quy tắc validate
export const EDITABLE_COLUMNS = {
  G: {
    label: "Trưởng đại diện địa bàn (Họ tên)",
    type: "text",
    required: false,
    maxLength: 200,
  },
  H: {
    label: "Mã HRM (Trưởng đại diện)",
    type: "code8",
    required: false,
    pattern: /^\d{8}$/,
    errorMessage: "Mã HRM phải gồm đúng 8 chữ số (có thể có số 0 ở đầu)",
  },
  I: {
    label: "Giám đốc xã (Họ tên)",
    type: "text",
    required: false,
    maxLength: 200,
  },
  J: {
    label: "Mã HRM (Giám đốc xã)",
    type: "code8",
    required: false,
    pattern: /^\d{8}$/,
    errorMessage: "Mã HRM phải gồm đúng 8 chữ số (có thể có số 0 ở đầu)",
  },
  K: {
    label: "Ghi chú",
    type: "text",
    required: false,
    maxLength: 500,
  },
};

// Toàn bộ cột theo thứ tự A -> K, dùng khi đọc/ghi range
export const ALL_COLUMNS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K"];

// Dòng đầu tiên chứa header, dữ liệu bắt đầu từ dòng 2
export const HEADER_ROW = 1;
export const DATA_START_ROW = 2;
