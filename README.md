<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>YU💠 Admin</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <main class="shell admin-shell">
    <section id="login" class="glass auth">
      <p class="eyebrow">YU💠 CONTROL CENTER</p>
      <h1>Admin Login</h1>
      <p class="muted">Manage your store securely.</p>
      <input id="email" type="email" placeholder="Email"><br>
      <input id="password" type="password" placeholder="Password"><br>
      <button class="button" id="loginBtn">Sign in</button>
      <p id="loginError" class="error"></p>
    </section>

    <section id="panel" hidden>
      <header class="admin-head">
        <div>
          <p class="eyebrow">YU💠 CONTROL CENTER</p>
          <h1>Dashboard</h1>
        </div>
        <button class="button secondary" id="logout">Log out</button>
      </header>

      <div class="dash" id="dash"></div>

      <div class="admin-grid">
        <section class="glass admin-card">
          <h2>Products</h2>
          <form id="productForm">
            <input name="name" placeholder="Name" required>
            <input name="category" placeholder="Scripts / UI / Tools / Premium" required>
            <textarea name="description" placeholder="Description" required></textarea>
            <div class="two">
              <input name="price" type="number" step=".01" placeholder="Price" required>
              <input name="stock" type="number" placeholder="Stock" required>
            </div>
            <input name="imageUrl" placeholder="Image URL">
            <input name="downloadUrl" placeholder="Product/download URL">
            <button class="button">Add product</button>
          </form>
          <div id="productList"></div>
        </section>

        <section class="glass admin-card">
          <h2>Orders & Keys</h2>
          <div id="orders"></div>

          <h2>Site settings</h2>
          <form id="settings">
            <input name="logo" placeholder="Logo">
            <input name="title" placeholder="Website title">
            <input name="bio" placeholder="Bio">
            <div class="two">
              <input name="projects" placeholder="Projects">
              <input name="likes" placeholder="Likes">
            </div>
            <input name="comments" placeholder="Comments">
            <input name="socials" placeholder='Social links JSON'>
            <textarea name="payment_instructions" placeholder="Payment instructions"></textarea>
            <input name="payment_qr_url" placeholder="Payment QR URL">
            <button class="button">Save settings</button>
          </form>

          <div id="preview" class="preview"></div>
        </section>
      </div>
    </section>
  </main>

  <script>
    const $ = (s) => document.querySelector(s);
    const api = async (url, options = {}) => {
      const response = await fetch(url, {
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
        ...options
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Request failed');
      return data;
    };
    const fd = (form) => Object.fromEntries(new FormData(form));

    async function refresh() {
      const d = await api('/api/admin/dashboard');

      $('#dash').innerHTML = [
        ['Total Products', d.products],
        ['Total Stock', d.stock],
        ['Total Orders', d.ordersCount],
        ['Paid Orders', d.paidOrders],
        ['Available Keys', d.availableKeys],
        ['Used Keys', d.usedKeys]
      ].map(([label, value]) => `
        <div class="glass metric">
          <small>${label}</small>
          <b>${value}</b>
        </div>
      `).join('');

      $('#productList').innerHTML = d.productRows.map((p) => `
        <div class="admin-row">
          <span>
            <b>${p.name}</b><br>
            <small>$${(Number(p.price) / 100).toFixed(2)} · ${p.stock} stock</small>
          </span>
          <span>
            <button data-stock="${p.id}" data-n="1" class="button mini">+1</button>
            <button data-stock="${p.id}" data-n="-1" class="button mini">−1</button>
            <button data-del="${p.id}" class="danger">Delete</button>
          </span>
        </div>
      `).join('');

      document.querySelectorAll('[data-stock]').forEach((b) => {
        b.onclick = () => api('/api/admin/products/' + b.dataset.stock + '/stock', {
          method: 'POST',
          body: JSON.stringify({ amount: Number(b.dataset.n) })
        }).then(refresh);
      });

      document.querySelectorAll('[data-del]').forEach((b) => {
        b.onclick = () => api('/api/admin/products/' + b.dataset.del, {
          method: 'DELETE'
        }).then(refresh);
      });

      $('#orders').innerHTML = d.orders.map((o) => `
        <div class="admin-row">
          <span>
            <b>${o.name}</b><br>
            <small>${o.id.slice(0, 8)}… · ${o.status}</small>
          </span>
          <span>
            <select data-status="${o.id}">
              <option ${o.status === 'Pending' ? 'selected' : ''}>Pending</option>
              <option ${o.status === 'Paid' ? 'selected' : ''}>Paid</option>
              <option ${o.status === 'Completed' ? 'selected' : ''}>Completed</option>
              <option ${o.status === 'Failed' ? 'selected' : ''}>Failed</option>
              <option ${o.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
            </select>
            <button data-key="${o.id}" class="button mini">Key</button>
          </span>
        </div>
      `).join('');

      d.orders.forEach((o) => {
        const select = document.querySelector(`[data-status="${o.id}"]`);
        select.onchange = () => api('/api/admin/orders/' + o.id + '/status', {
          method: 'POST',
          body: JSON.stringify({ status: select.value })
        }).then(refresh);

        const button = document.querySelector(`[data-key="${o.id}"]`);
        button.onclick = () => api('/api/admin/keys', {
          method: 'POST',
          body: JSON.stringify({ orderId: o.id })
        }).then((x) => alert('Key: ' + x.key)).catch((error) => alert(error.message));
      });

      for (const [key, value] of Object.entries(d.settings)) {
        const el = $(`#settings [name="${key}"]`);
        if (el) el.value = value || '';
      }

      preview();
    }

    function preview() {
      const formValues = fd($('#settings'));
      $('#preview').innerHTML = `
        <small>Preview</small>
        <h3>${formValues.logo || 'YU💠'} · ${formValues.title || 'Store'}</h3>
        <p>${formValues.bio || 'Designer who creates delightful experiences'}</p>
        <span>${formValues.projects || 0} Projects　${formValues.likes || 0} Likes　${formValues.comments || 0} Comments</span>
      `;
    }

    $('#loginBtn').onclick = async () => {
      try {
        await api('/api/admin/login', {
          method: 'POST',
          body: JSON.stringify({
            email: $('#email').value,
            password: $('#password').value
          })
        });
        $('#login').hidden = true;
        $('#panel').hidden = false;
        refresh();
      } catch (error) {
        $('#loginError').textContent = error.message;
      }
    };

    $('#logout').onclick = () => api('/api/admin/logout', { method: 'POST' }).then(() => location.reload());

    $('#productForm').onsubmit = async (event) => {
      event.preventDefault();
      await api('/api/admin/products', {
        method: 'POST',
        body: JSON.stringify(fd(event.target))
      });
      event.target.reset();
      refresh();
    };

    $('#settings').oninput = preview;
    $('#settings').onsubmit = async (event) => {
      event.preventDefault();
      await api('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify(fd(event.target))
      });
      alert('Settings saved');
      refresh();
    };
  </script>
</body>
</html>
