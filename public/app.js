const TOKEN_KEY = 'elib_tokens';
const USER_KEY = 'elib_user';

const $ = (sel) => document.querySelector(sel);

const authMsg = $('#authMsg');
const bookMsg = $('#bookMsg');

function setMsg(el, text, kind) {
  el.textContent = text || '';
  el.className = 'msg ' + (kind || '');
}

function setCardMsg(card, text, kind) {
  const box = card && card.querySelector('.card-msg');
  if (!box) {
    setMsg(bookMsg, text, kind);
    return;
  }
  box.textContent = text || '';
  box.className = 'card-msg' + (kind ? ' ' + kind : '');
}

function getTokens() {
  try {
    return JSON.parse(localStorage.getItem(TOKEN_KEY) || 'null');
  } catch {
    return null;
  }
}

function setTokens(tokens) {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
}

function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
  } catch {
    return null;
  }
}

function setUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function authHeader() {
  const tokens = getTokens();
  return tokens && tokens.accessToken ? { Authorization: `Bearer ${tokens.accessToken}` } : {};
}

async function api(path, { method = 'GET', body, formData } = {}) {
  const headers = authHeader();
  let payload;
  if (formData) {
    payload = formData;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch('/api' + path, { method, headers, body: payload });
  if (res.status === 204) return null;
  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!res.ok) {
    const message = (data && (data.error?.message || data.message)) || `HTTP ${res.status}`;
    const err = new Error(message);
    err.status = res.status;
    err.code = data && data.error && data.error.code;
    throw err;
  }
  return data;
}

async function downloadBookFile(bookId, format, card) {
  const tokens = getTokens();
  if (!tokens) return;
  const q = format ? `?format=${format}` : '';
  const res = await fetch(`/api/books/${bookId}/file${q}`, { headers: authHeader() });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      msg = data.error?.message || msg;
    } catch {
      /* ignore */
    }
    setCardMsg(card, msg, 'error');
    return;
  }
  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="([^"]+)"/);
  const name = match ? match[1] : `book-${bookId}.${(format || 'file').toLowerCase()}`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function coverSrc(book) {
  if (!book.coverUrl) return null;
  if (book.coverUrl.startsWith('local://')) return `/api/books/${book.id}/cover`;
  return book.coverUrl;
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString();
}

function bookCard(book) {
  const authors = book.authors.map((a) => a.name).join(', ') || 'Unknown author';
  const cats = (book.categories || []).map((c) => `<span class="tag">${escapeHtml(c.name)}</span>`).join('');
  const rating = book.avgRating != null ? `${book.avgRating} ★ (${book.ratingCount})` : 'No reviews';
  const formats = (book.formats || []).map((f) => `<span class="tag green">${f}</span>`).join(' ') || '<span class="tag gray">no files</span>';
  const cover = coverSrc(book);
  const coverHtml = cover
    ? `<img class="book-cover" src="${cover}" alt="cover" loading="lazy" />`
    : `<div class="book-cover placeholder">no cover</div>`;
  const isAdmin = getUser()?.role === 'ADMIN';
  const onLoan = book.activeLoan
    ? `<div class="book-meta loan">On loan until ${fmtDate(book.activeLoan)}</div>`
    : '';
  const borrowBtn = book.activeLoan
    ? '<button class="btn small" data-action="renew">Renew</button>'
    : '<button class="btn small" data-action="borrow">Borrow</button>';
  const downloads = ['PDF', 'EPUB']
    .filter((f) => (book.formats || []).includes(f))
    .map((f) => `<button class="btn small" data-action="download" data-format="${f}">Open ${f}</button>`)
    .join('');
  return `
    <div class="book" data-id="${book.id}">
      <div class="book-head">
        ${coverHtml}
        <div style="flex:1;min-width:0">
          <h3 class="book-title">${escapeHtml(book.title)}</h3>
          <div class="book-meta"><strong>${escapeHtml(authors)}</strong></div>
          <div class="book-meta">ISBN: ${escapeHtml(book.isbn || '—')} · ${escapeHtml(book.language || '—')} · ${escapeHtml(book.publisher || '—')}</div>
          <div class="book-meta">Rating: ${rating}</div>
          ${onLoan}
          <div class="tags" style="margin-top:6px">${cats}<span class="tag gray">ID ${book.id}</span></div>
        </div>
      </div>
      <div class="book-meta">Formats: ${formats}</div>
      ${book.description ? `<div class="book-meta">${escapeHtml(book.description.slice(0, 220))}${book.description.length > 220 ? '…' : ''}</div>` : ''}
      <div class="book-actions">
        ${borrowBtn}
        <button class="btn small" data-action="favorite">♥ Favorite</button>
        <button class="btn small" data-action="bookmarks">Bookmarks</button>
        ${downloads}
        ${isAdmin ? '<button class="btn small danger" data-action="delete">Delete</button>' : ''}
      </div>
      <details class="card-tools">
        <summary>Reading tools (summary · progress · review · bookmark)</summary>
        <div class="tools-grid">
          <div class="tool">
            <span class="tool-label">AI summary</span>
            <button class="btn small" data-action="summary">SHORT</button>
            <button class="btn small" data-action="summary-detailed">DETAILED</button>
          </div>
          <div class="tool">
            <span class="tool-label">Progress %</span>
            <input class="progress-input" type="number" min="0" max="100" placeholder="0–100" />
            <button class="btn small" data-action="progress">Save</button>
          </div>
          <div class="tool">
            <span class="tool-label">Your review</span>
            <input class="review-rating" type="number" min="1" max="5" placeholder="1–5" />
            <input class="review-comment" type="text" placeholder="comment" />
            <button class="btn small" data-action="review">Review</button>
          </div>
          <div class="tool">
            <span class="tool-label">Bookmark location</span>
            <input class="bm-location" type="text" placeholder="e.g. p.42" />
            <button class="btn small" data-action="add-bookmark">Add</button>
          </div>
          ${isAdmin ? `
          <div class="tool">
            <span class="tool-label">Upload file</span>
            <input class="file-input" type="file" accept=".pdf,.epub,application/pdf,application/epub+zip" />
            <button class="btn small" data-action="upload">Upload</button>
          </div>` : ''}
        </div>
      </details>
      <div class="card-msg"></div>
    </div>`;
}

async function coverFallbacks(container) {
  container.querySelectorAll('img.book-cover').forEach((img) => {
    img.addEventListener(
      'error',
      () => {
        const div = document.createElement('div');
        div.className = 'book-cover placeholder';
        div.textContent = 'no cover';
        img.replaceWith(div);
      },
      { once: true },
    );
  });
}

function openToolIds() {
  return [...document.querySelectorAll('.book details.card-tools[open]')].map(
    (d) => d.closest('.book').dataset.id,
  );
}

function restoreToolIds(ids) {
  ids.forEach((id) => {
    const d = $(`.book[data-id="${id}"] .card-tools`);
    if (d) d.open = true;
  });
}

async function loadBooks() {
  const search = $('#search').value.trim();
  const sort = $('#sort').value;
  const q = new URLSearchParams();
  if (search) q.set('search', search);
  q.set('sort', sort);
  q.set('limit', '50');
  const openIds = openToolIds();
  try {
    const data = await api('/books?' + q.toString());
    $('#books').innerHTML = data.items.length
      ? data.items.map(bookCard).join('')
      : '<p class="book-meta">No books found. As admin you can create one or import from Open Library.</p>';
    coverFallbacks($('#books'));
    restoreToolIds(openIds);
    setMsg(bookMsg, `Showing ${data.items.length} of ${data.pagination.total} books`, 'ok');
  } catch (err) {
    $('#books').innerHTML = '';
    setMsg(bookMsg, err.message, 'error');
  }
}

function showAuth(auth) {
  $('#authSection').hidden = !auth;
  $('#appSection').hidden = auth;
  if (!auth) {
    const user = getUser();
    $('#userLabel').textContent = `${user.name} (${user.role})`;
  }
}

async function handleLogin(e) {
  e.preventDefault();
  setMsg(authMsg, '');
  try {
    const data = await api('/auth/login', {
      method: 'POST',
      body: { email: $('#loginEmail').value.trim(), password: $('#loginPassword').value },
    });
    setTokens(data.tokens);
    setUser(data.user);
    showAuth(false);
    await loadBooks();
    setupAdmin();
  } catch (err) {
    setMsg(authMsg, err.message, 'error');
  }
}

async function handleRegister(e) {
  e.preventDefault();
  setMsg(authMsg, '');
  try {
    const data = await api('/auth/register', {
      method: 'POST',
      body: {
        name: $('#regName').value.trim(),
        email: $('#regEmail').value.trim(),
        password: $('#regPassword').value,
      },
    });
    setTokens(data.tokens);
    setUser(data.user);
    showAuth(false);
    await loadBooks();
    setupAdmin();
  } catch (err) {
    setMsg(authMsg, err.message, 'error');
  }
}

async function restoreSession() {
  const user = getUser();
  if (!user) return;
  try {
    const data = await api('/users/me');
    setUser(data.user);
    showAuth(false);
    await loadBooks();
    setupAdmin();
  } catch {
    clearTokens();
    showAuth(true);
  }
}

function setupAdmin() {
  const isAdmin = getUser()?.role === 'ADMIN';
  $('#adminCard').hidden = !isAdmin;
}

function cardEl(target) {
  const card = target.closest('.book');
  return card ? { id: card.dataset.id, el: card } : null;
}

async function runAction(target) {
  const info = cardEl(target);
  if (!info) return;
  const { id, el } = info;
  const action = target.dataset.action;
  setCardMsg(el, '');
  try {
    let data;
    let okText = '';
    switch (action) {
      case 'borrow':
        try {
          data = await api(`/books/${id}/borrow`, { method: 'POST' });
        } catch (err) {
          if (err.code === 'ALREADY_BORROWED') {
            setCardMsg(el, 'You already have this book on loan — use the Renew button to extend it.', 'warn');
            return;
          }
          throw err;
        }
        okText = `Borrowed until ${fmtDate(data.loan.expiresAt)}`;
        break;
      case 'renew':
        data = await api(`/books/${id}/renew`, { method: 'POST' });
        okText = `Renewed until ${fmtDate(data.loan.expiresAt)}`;
        break;
      case 'summary':
      case 'summary-detailed': {
        const type = action === 'summary-detailed' ? 'DETAILED' : 'SHORT';
        const original = target.textContent;
        target.disabled = true;
        target.textContent = 'Generating…';
        setCardMsg(el, `Generating ${type} summary — this can take up to 60s…`, 'warn');
        try {
          data = await api(`/books/${id}/summary?type=${type}`);
          el.querySelector('.summary-box')?.remove();
          const box = document.createElement('div');
          box.className = 'summary-box';
          box.innerHTML = `<strong>[${type}]</strong><div>${escapeHtml(data.summary.summary)}</div>`;
          el.appendChild(box);
          setCardMsg(el, `${type} summary ready`, 'ok');
        } finally {
          target.disabled = false;
          target.textContent = original;
        }
        return;
      }
      case 'download':
        return downloadBookFile(id, target.dataset.format, el);
      case 'favorite':
        await api(`/favorites/${id}`, { method: 'POST' });
        okText = 'Added to favorites';
        break;
      case 'progress': {
        const val = el.querySelector('.progress-input').value;
        data = await api(`/progress/${id}`, { method: 'PUT', body: { progress: Number(val) } });
        okText = `Progress set to ${data.progress.progress}`;
        break;
      }
      case 'review': {
        const rating = Number(el.querySelector('.review-rating').value);
        const comment = el.querySelector('.review-comment').value.trim() || null;
        if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
          setCardMsg(el, 'Enter a rating from 1 to 5 first (e.g. 4), then click Review.', 'warn');
          return;
        }
        try {
          await api(`/reviews/book/${id}`, { method: 'POST', body: { rating, comment } });
          okText = 'Review submitted';
        } catch (err) {
          if (err.code === 'REVIEW_EXISTS') {
            const data = await api(`/reviews/book/${id}`);
            const mine = (data.items || []).find((r) => r.user && getUser() && r.user.id === getUser().id);
            if (mine) {
              const rIn = el.querySelector('.review-rating');
              const cIn = el.querySelector('.review-comment');
              const btn = el.querySelector('[data-action="review"]');
              rIn.value = mine.rating;
              if (mine.comment) cIn.value = mine.comment;
              btn.textContent = 'Update review';
              btn.dataset.action = 'update-review';
              btn.dataset.reviewId = mine.id;
              setCardMsg(el, 'You already reviewed this book — your review is shown below, you can update it.', 'warn');
              return;
            }
          }
          throw err;
        }
        break;
      }
      case 'update-review': {
        const rating = Number(el.querySelector('.review-rating').value);
        const comment = el.querySelector('.review-comment').value.trim() || null;
        if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
          setCardMsg(el, 'Enter a rating from 1 to 5 first (e.g. 4).', 'warn');
          return;
        }
        await api(`/reviews/${el.querySelector('[data-action="update-review"]').dataset.reviewId}`, {
          method: 'PUT',
          body: { rating, comment },
        });
        okText = 'Review updated';
        break;
      }
      case 'add-bookmark': {
        const input = el.querySelector('.bm-location');
        const location = input.value.trim();
        if (!location) {
          setCardMsg(el, 'Type a location first (e.g. "p.42" or "chapter 3")', 'warn');
          return;
        }
        await api(`/bookmarks/${id}`, { method: 'POST', body: { location } });
        input.value = '';
        setCardMsg(el, 'Bookmark added', 'ok');
        await renderBookmarks(id, el);
        return;
      }
      case 'bookmarks': {
        await renderBookmarks(id, el);
        return;
      }
      case 'upload': {
        const file = el.querySelector('.file-input').files[0];
        if (!file) {
          setCardMsg(el, 'Choose a PDF or EPUB file first', 'warn');
          return;
        }
        const fd = new FormData();
        fd.append('file', file);
        await api(`/books/${id}/files`, { method: 'POST', formData: fd });
        okText = 'File uploaded';
        break;
      }
      case 'delete':
        if (!window.confirm('Delete this book? This removes its files and related records.')) return;
        await api(`/books/${id}`, { method: 'DELETE' });
        okText = 'Book deleted';
        break;
      default:
        return;
    }
    setCardMsg(el, okText, 'ok');
    await loadBooks();
    const fresh = $(`.book[data-id="${id}"]`);
    if (fresh) setCardMsg(fresh, okText, 'ok');
    else setMsg(bookMsg, okText, 'ok');
  } catch (err) {
    setCardMsg(el, err.message, 'error');
  }
}

async function renderBookmarks(bookId, el) {
  try {
    const data = await api(`/bookmarks/${bookId}`);
    el.querySelector('.bookmark-box')?.remove();
    const box = document.createElement('div');
    box.className = 'bookmark-box';
    const items = data.bookmarks || [];
    box.innerHTML =
      '<strong>Bookmarks</strong>' +
      (items.length
        ? `<ul>${items
            .map((b) => `<li>${escapeHtml(b.location)}${b.note ? ' — ' + escapeHtml(b.note) : ''}</li>`)
            .join('')}</ul>`
        : '<div>No bookmarks for this book yet.</div>');
    el.appendChild(box);
  } catch (err) {
    setCardMsg(el, err.message, 'error');
  }
}

async function loadFavorites() {
  const openIds = openToolIds();
  try {
    const data = await api('/favorites?limit=50');
    if (!data.items.length) {
      setMsg(bookMsg, 'No favorites yet.', 'warn');
      return;
    }
    $('#books').innerHTML = data.items
      .map((fav) => {
        const { book } = fav;
        return bookCard({ ...book, formats: book.formats || [] });
      })
      .join('');
    coverFallbacks($('#books'));
    restoreToolIds(openIds);
    setMsg(bookMsg, `You have ${data.pagination.total} favorite(s).`, 'ok');
  } catch (err) {
    setMsg(bookMsg, err.message, 'error');
  }
}

async function loadStats() {
  try {
    const data = await api('/admin/stats');
    $('#adminOut').innerHTML = `<h3>Stats</h3><pre>${escapeHtml(JSON.stringify(data, null, 2))}</pre>`;
  } catch (err) {
    $('#adminOut').innerHTML = `<p class="msg error">${escapeHtml(err.message)}</p>`;
  }
}

async function openLibraryPanel() {
  const panel = $('#adminOut');
  panel.innerHTML = `
    <h3>Open Library search</h3>
    <div class="row">
      <input id="olQuery" type="text" placeholder="search title…" />
      <button class="btn small" id="olGo" type="button">Search</button>
    </div>
    <div id="olResults"></div>`;
  const go = async () => {
    const q = $('#olQuery').value.trim();
    if (!q) return;
    const out = $('#olResults');
    out.innerHTML = '<p class="book-meta">Searching…</p>';
    try {
      const data = await api('/admin/openlibrary/search?q=' + encodeURIComponent(q));
      out.innerHTML = data.results
        .map(
          (r) => `
            <div class="admin-row">
              <span style="flex:1">
                <strong>${escapeHtml(r.title)}</strong>
                <span class="book-meta">${escapeHtml((r.authors || []).join(', '))} · ${r.firstPublishYear || '—'}${r.isbns?.length ? ' · ISBN ' + escapeHtml(r.isbns[0]) : ''}</span>
              </span>
              <button class="btn small" data-import="${escapeHtml(r.key)}" type="button">Import</button>
            </div>`,
        )
        .join('');
    } catch (err) {
      out.innerHTML = `<p class="msg ${err.code === 'NO_EXTERNAL_RESULTS' ? 'warn' : 'error'}">${escapeHtml(err.message)}</p>`;
    }
  };
  $('#olGo').addEventListener('click', go);
  $('#olQuery').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') go();
  });
}

async function importWork(key) {
  const out = $('#olResults');
  try {
    const data = await api('/admin/openlibrary/import/' + encodeURIComponent(key), { method: 'POST' });
    out.innerHTML = `<p class="msg ok">Imported "${escapeHtml(data.book.title)}".</p>`;
    await loadBooks();
  } catch (err) {
    out.insertAdjacentHTML('beforeend', `<p class="msg error">${escapeHtml(err.message)}</p>`);
  }
}

async function submitCreate(formEl, path) {
  const fd = new FormData(formEl);
  const body = {};
  for (const [k, v] of fd.entries()) {
    if (v === '') continue;
    if (k === 'authorIds' || k === 'categoryIds') {
      body[k] = v.split(',').map((s) => s.trim()).filter(Boolean);
    } else if (k === 'publicationDate') {
      body[k] = v;
    } else {
      body[k] = v;
    }
  }
  setMsg(bookMsg, '');
  try {
    const data = await api(path, { method: 'POST', body });
    const label = data.book ? data.book.title : data[Object.keys(data).find((k) => data[k]?.id)];
    setMsg(bookMsg, `Created: ${label}`, 'ok');
    formEl.reset();
    await loadBooks();
  } catch (err) {
    setMsg(bookMsg, err.message, 'error');
  }
}

async function init() {
  $('#loginForm').addEventListener('submit', handleLogin);
  $('#registerForm').addEventListener('submit', handleRegister);

  document.querySelectorAll('[data-fill]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.fill === 'admin') {
        $('#loginEmail').value = 'admin@elibrary.com';
        $('#loginPassword').value = 'admin123456';
      } else {
        $('#loginEmail').value = 'user@elibrary.com';
        $('#loginPassword').value = 'user123456';
      }
    });
  });

  $('#logoutBtn').addEventListener('click', () => {
    clearTokens();
    showAuth(true);
    setMsg(bookMsg, '');
  });

  $('#searchBtn').addEventListener('click', loadBooks);
  $('#search').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') loadBooks();
  });
  $('#sort').addEventListener('change', loadBooks);
  $('#myFavoritesBtn').addEventListener('click', loadFavorites);

  $('#books').addEventListener('click', (e) => {
    if (e.target.closest('[data-action]')) {
      runAction(e.target.closest('[data-action]'));
    }
  });

  $('#adminOut').addEventListener('click', (e) => {
    const importBtn = e.target.closest('[data-import]');
    if (importBtn) {
      importWork(importBtn.dataset.import);
    }
  });

  $('#statsBtn').addEventListener('click', loadStats);
  $('#olSearchBtn').addEventListener('click', openLibraryPanel);
  $('#authorForm').addEventListener('submit', (e) => {
    e.preventDefault();
    submitCreate(e.target, '/authors');
  });
  $('#categoryForm').addEventListener('submit', (e) => {
    e.preventDefault();
    submitCreate(e.target, '/categories');
  });
  $('#bookForm').addEventListener('submit', (e) => {
    e.preventDefault();
    submitCreate(e.target, '/books');
  });

  try {
    await api('/health');
    $('#healthDot').classList.add('ok');
    $('#healthText').textContent = 'server online';
  } catch {
    $('#healthDot').classList.add('bad');
    $('#healthText').textContent = 'server offline';
  }

  await restoreSession();
}

init();
