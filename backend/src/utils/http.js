// Small fetch wrapper for provider calls: timeout + normalised result.
async function httpRequest(url, { method = 'GET', headers = {}, body, timeoutMs = 10000 } = {}) {
  try {
    const res = await fetch(url, { method, headers, body, signal: AbortSignal.timeout(timeoutMs) });
    const text = await res.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 0, data: null, error: err.name === 'TimeoutError' ? 'Request timed out' : err.message };
  }
}

module.exports = { httpRequest };
