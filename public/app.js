const grid = document.querySelector('#product-grid');
const notice = document.querySelector('#notice');
const refreshButton = document.querySelector('#refresh');
const productArt = {
  headphones: {
    className: 'art-headphones',
    label: 'Headphone nirkabel',
    svg: '<svg viewBox="0 0 260 180" role="img" aria-label="Headphone nirkabel"><path d="M65 103V83a65 65 0 0 1 130 0v20" fill="none" stroke="#4c5441" stroke-width="13" stroke-linecap="round"/><rect x="51" y="91" width="37" height="57" rx="15" fill="#788665"/><rect x="172" y="91" width="37" height="57" rx="15" fill="#788665"/><rect x="59" y="101" width="20" height="37" rx="9" fill="#a9b497"/><rect x="181" y="101" width="20" height="37" rx="9" fill="#a9b497"/><path d="M87 57a50 50 0 0 1 86 0" fill="none" stroke="#c8cfb9" stroke-width="4" stroke-linecap="round"/></svg>',
  },
  keyboard: {
    className: 'art-keyboard',
    label: 'Keyboard mekanis',
    svg: '<svg viewBox="0 0 260 180" role="img" aria-label="Keyboard mekanis"><path d="m37 66 164-8 30 75-169 12z" fill="#655447"/><path d="m45 71 151-7 24 60-156 9z" fill="#d9c9b8"/><g fill="#fff8ed" stroke="#b8a694" stroke-width="2"><rect x="56" y="77" width="22" height="14" rx="3"/><rect x="84" y="76" width="22" height="14" rx="3"/><rect x="112" y="75" width="22" height="14" rx="3"/><rect x="140" y="73" width="22" height="14" rx="3"/><rect x="168" y="72" width="22" height="14" rx="3"/><rect x="62" y="97" width="22" height="14" rx="3"/><rect x="90" y="96" width="22" height="14" rx="3"/><rect x="118" y="95" width="22" height="14" rx="3"/><rect x="146" y="94" width="22" height="14" rx="3"/><rect x="174" y="92" width="22" height="14" rx="3"/><rect x="82" y="116" width="91" height="12" rx="4"/></g><circle cx="207" cy="119" r="3" fill="#91a36f"/></svg>',
  },
  powerbank: {
    className: 'art-powerbank',
    label: 'Powerbank portabel',
    svg: '<svg viewBox="0 0 260 180" role="img" aria-label="Powerbank portabel"><rect x="81" y="31" width="104" height="132" rx="22" fill="#66808a"/><rect x="88" y="38" width="90" height="118" rx="17" fill="#849da4"/><path d="M116 38v-5a7 7 0 0 1 7-7h24a7 7 0 0 1 7 7v5" fill="#445d66"/><rect x="120" y="49" width="28" height="5" rx="2.5" fill="#d8e7e8"/><circle cx="108" cy="139" r="3" fill="#c7f36b"/><circle cx="120" cy="139" r="3" fill="#c7f36b"/><circle cx="132" cy="139" r="3" fill="#c7f36b"/><path d="m136 71-20 31h17l-9 24 26-36h-17l8-19z" fill="#eaf3e9"/></svg>',
  },
  generic: {
    className: 'art-generic',
    label: 'Produk FlashReserve',
    svg: '<svg viewBox="0 0 260 180" role="img" aria-label="Produk FlashReserve"><path d="m130 31 69 38v54l-69 37-69-37V69z" fill="#c89570"/><path d="m61 69 69 38 69-38M130 107v53" fill="none" stroke="#f1d2b2" stroke-width="4"/><path d="m108 57 69 38" stroke="#f1d2b2" stroke-width="4"/></svg>',
  },
};

function getProductArt(sku) {
  const normalized = sku.toLowerCase();
  if (normalized.includes('headphone') || normalized.includes('earbud')) return productArt.headphones;
  if (normalized.includes('keyboard')) return productArt.keyboard;
  if (normalized.includes('powerbank') || normalized.includes('power-bank')) return productArt.powerbank;
  return productArt.generic;
}

function showNotice(message, kind = 'success', actions = []) {
  notice.replaceChildren(document.createTextNode(message));
  notice.className = `notice is-visible ${kind}`;
  for (const action of actions) {
    const button = document.createElement('button');
    button.className = 'notice-action';
    button.type = 'button';
    button.textContent = action.label;
    button.addEventListener('click', action.onClick);
    notice.append(button);
  }
  window.clearTimeout(showNotice.timer);
  if (!actions.length) {
    showNotice.timer = window.setTimeout(() => { notice.className = 'notice'; }, 8000);
  }
}

function formatSku(sku) {
  return sku.replace(/^FR-DEMO-/, '').replaceAll('-', ' ').toLowerCase();
}

function productCard(product, index) {
  const soldOut = product.stock < 1;
  const art = getProductArt(product.sku);
  const card = document.createElement('article');
  card.className = 'product-card';

  const visual = document.createElement('div');
  visual.className = `product-visual ${art.className}`;
  visual.innerHTML = `<span class="product-tag">${soldOut ? 'HABIS' : 'FLASH DROP'}</span><span class="product-illustration">${art.svg}</span><span class="visual-index">0${index + 1}</span>`;

  const details = document.createElement('div');
  details.className = 'product-details';
  const copy = document.createElement('div');
  const category = document.createElement('span');
  category.className = 'product-category';
  category.textContent = product.sku;
  const title = document.createElement('h3');
  title.textContent = product.title || formatSku(product.sku);
  const price = document.createElement('div');
  price.className = 'product-price';
  price.textContent = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(product.priceIdr || 0);
  copy.append(category, title, price);
  const stock = document.createElement('div');
  stock.className = `stock-line ${soldOut ? 'sold-out' : product.stock <= 2 ? 'low-stock' : ''}`;
  stock.innerHTML = `<span class="stock-dot"></span>${soldOut ? 'Stok habis' : `${product.stock} unit tersedia`}`;

  const button = document.createElement('button');
  button.className = 'reserve-button';
  button.type = 'button';
  button.disabled = soldOut;
  button.innerHTML = soldOut ? 'Sudah habis <span>×</span>' : 'Amankan unit <span>↗</span>';
  button.addEventListener('click', () => reserve(product, button));
  details.append(copy, stock, button);
  card.append(visual, details);
  return card;
}

async function loadProducts() {
  refreshButton.disabled = true;
  refreshButton.classList.add('is-loading');
  try {
    const response = await fetch('/api/products');
    if (!response.ok) throw new Error('Gagal mengambil daftar produk.');
    const products = await response.json();
    grid.replaceChildren();
    if (!products.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = '<span class="empty-icon">✳</span><h3>Drop sedang disiapkan</h3><p>Belum ada produk untuk ditampilkan. Jalankan seed demo, lalu refresh halaman.</p><code>npm run db:seed</code>';
      grid.append(empty);
      return;
    }
    products.forEach((product, index) => grid.append(productCard(product, index)));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan saat memuat produk.';
    const state = document.createElement('div');
    state.className = 'empty-state error-state';
    const icon = document.createElement('span');
    icon.className = 'empty-icon';
    icon.textContent = '!';
    const title = document.createElement('h3');
    title.textContent = 'Belum bisa terhubung';
    const description = document.createElement('p');
    description.textContent = `${message} Pastikan server dan database aktif, lalu coba lagi.`;
    state.append(icon, title, description);
    grid.replaceChildren(state);
  } finally {
    refreshButton.disabled = false;
    refreshButton.classList.remove('is-loading');
  }
}

async function reserve(product, button) {
  button.disabled = true;
  button.classList.add('is-loading');
  button.textContent = 'Mengamankan…';
  try {
    const response = await fetch('/api/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: product.id, quantity: 1 }),
    });
    const result = await response.json();
    if (response.status === 409) {
      showNotice('Unit terakhir baru saja diamankan orang lain. Stok diperbarui.', 'warning');
    } else if (!response.ok) {
      showNotice(result.error || 'Reservasi gagal. Coba lagi.', 'error');
    } else {
      const expiry = new Date(result.expiresAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      showNotice(`Holding ${result.holdingId} aktif sampai ${expiry}. Pilih hasil checkout demo:`, 'success', [
        { label: 'Simulasikan pembayaran berhasil', onClick: () => settleDemo(result.holdingId, 'paid') },
        { label: 'Simulasikan gagal bayar', onClick: () => settleDemo(result.holdingId, 'failed') },
      ]);
    }
  } catch {
    showNotice('Tidak dapat menghubungi server. Coba lagi sebentar.', 'error');
  } finally {
    await loadProducts();
  }
}

async function settleDemo(holdingId, outcome) {
  try {
    const response = await fetch(`/api/reservations/${holdingId}/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outcome }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Checkout demo gagal.');

    if (result.status === 'paid') {
      showNotice('Pembayaran demo berhasil. Reservasi ditandai lunas.', 'success');
    } else if (result.status === 'failed') {
      showNotice('Gagal bayar disimulasikan. Stok sudah dikembalikan.', 'warning');
    } else if (result.status === 'expired') {
      showNotice('Holding sudah kedaluwarsa. Stok telah dilepas kembali.', 'warning');
    } else {
      showNotice(`Status holding: ${result.status}.`, 'warning');
    }
  } catch (error) {
    showNotice(error instanceof Error ? error.message : 'Checkout demo gagal.', 'error');
  } finally {
    await loadProducts();
  }
}

refreshButton.addEventListener('click', loadProducts);
loadProducts();
