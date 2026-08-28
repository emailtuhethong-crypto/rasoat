// Client gọi Google Sheets API từ Cloudflare Pages Functions (Workers runtime).
// Dùng Service Account: ký JWT bằng Web Crypto (subtle.sign RS256), đổi lấy access_token,
// rồi gọi REST API https://sheets.googleapis.com/v4/spreadsheets/...
//
// Biến môi trường cần có (đặt trong Cloudflare Pages > Settings > Environment variables):
//   GOOGLE_CLIENT_EMAIL  - email của service account
//   GOOGLE_PRIVATE_KEY   - private key PEM (giữ nguyên định dạng nhiều dòng)
//   GOOGLE_SHEET_ID      - ID của spreadsheet (lấy từ URL)

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";
const SCOPE = "https://www.googleapis.com/auth/spreadsheets";

// Cache token trong bộ nhớ của isolate (giảm số lần xin token, không bắt buộc nhưng đỡ tốn quota)
let cachedToken = null;
let cachedTokenExpiry = 0;

function base64url(bytes) {
  let str = typeof bytes === "string" ? btoa(bytes) : btoa(String.fromCharCode(...new Uint8Array(bytes)));
  return str.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function importPrivateKey(pem) {
  const cleaned = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return crypto.subtle.importKey(
    "pkcs8",
    bytes.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

async function getAccessToken(env) {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && now < cachedTokenExpiry - 60) return cachedToken;

  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: env.GOOGLE_CLIENT_EMAIL,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  };

  const encHeader = base64url(JSON.stringify(header));
  const encClaim = base64url(JSON.stringify(claim));
  const signingInput = `${encHeader}.${encClaim}`;

  // Private key trong env var thường có \n dạng literal, cần chuyển thành newline thật
  const pem = env.GOOGLE_PRIVATE_KEY.includes("\\n")
    ? env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n")
    : env.GOOGLE_PRIVATE_KEY;
  const key = await importPrivateKey(pem);

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signingInput)
  );

  const jwt = `${signingInput}.${base64url(signature)}`;

  const resp = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Không lấy được access token từ Google: ${resp.status} ${text}`);
  }

  const data = await resp.json();
  cachedToken = data.access_token;
  cachedTokenExpiry = now + data.expires_in;
  return cachedToken;
}

async function sheetsFetch(env, path, options = {}) {
  const token = await getAccessToken(env);
  const url = `${SHEETS_API}/${env.GOOGLE_SHEET_ID}${path}`;
  const resp = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Google Sheets API lỗi: ${resp.status} ${text}`);
  }
  return resp.json();
}

/** Lấy danh sách tên các tab (đơn vị) trong spreadsheet — nguồn sự thật duy nhất */
export async function listSheetTitles(env) {
  const data = await sheetsFetch(env, "?fields=sheets.properties.title");
  return data.sheets.map((s) => s.properties.title);
}

/** Đọc toàn bộ dữ liệu (A:K) của 1 tab đơn vị */
export async function getSheetData(env, unitName) {
  const range = encodeURIComponent(`'${unitName}'!A1:K`);
  const data = await sheetsFetch(env, `/values/${range}?valueRenderOption=UNFORMATTED_VALUE`);
  return data.values || [];
}

/** Ghi đè 1 vùng ô cụ thể, RAW để giữ nguyên chuỗi số có số 0 đầu */
export async function updateRange(env, unitName, a1Range, values) {
  const range = encodeURIComponent(`'${unitName}'!${a1Range}`);
  return sheetsFetch(env, `/values/${range}?valueInputOption=RAW`, {
    method: "PUT",
    body: JSON.stringify({ range: `'${unitName}'!${a1Range}`, values }),
  });
}

/** Ghi đè nhiều vùng ô cùng lúc trong 1 tab (dùng cho import hàng loạt) */
export async function batchUpdateRanges(env, valueRanges) {
  if (valueRanges.length === 0) return { totalUpdatedCells: 0 };
  return sheetsFetch(env, "/values:batchUpdate", {
    method: "POST",
    body: JSON.stringify({ valueInputOption: "RAW", data: valueRanges }),
  });
}
