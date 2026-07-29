// 点单页
const app = getApp();

Page({
  data: {
    store: null,
    categories: [],
    products: [],
    filteredProducts: [],
    recommends: [],
    currentCategory: 0,
    cartCount: 0,
    cartTotal: 0,
    loading: true,
  },

  onShow() {
    const store = app.globalData.currentStore || wx.getStorageSync('currentStore');
    if (store) {
      this.setData({ store });
      this.loadCategories(store.id);
      this.loadProducts(store.id);
      this.loadCart();
    }
  },

  loadCategories(storeId) {
    app.get(`/products/categories?store_id=${storeId}`, {}, false)
      .then((data) => {
        this.setData({ categories: data.categories || [] });
      })
      .catch(() => {});
  },

  loadProducts(storeId, categoryId) {
    this.setData({ loading: true });
    let url = `/products?store_id=${storeId}`;
    if (categoryId) url += `&category_id=${categoryId}`;

    app.get(url, {}, false)
      .then((data) => {
        const products = data.products || [];
        const recommends = products.filter((p) => p.is_recommend);
        this.setData({ products, recommends, loading: false });
        this.updateFilteredProducts();
      })
      .catch(() => {
        this.setData({ loading: false });
      });
  },

  updateFilteredProducts() {
    const { currentCategory, categories, products } = this.data;
    let filtered;
    if (currentCategory === 0) {
      filtered = products;
    } else {
      const catId = categories[currentCategory]?.id;
      filtered = products.filter((p) => p.category_id === catId);
    }
    this.setData({ filteredProducts: filtered });
  },

  loadCart() {
    app.get('/cart')
      .then((data) => {
        this.setData({
          cartCount: data.count || 0,
          cartTotal: data.total || 0,
        });
        app.globalData.cartCount = data.count || 0;
      })
      .catch(() => {});
  },

  switchCategory(e) {
    const index = e.currentTarget.dataset.index;
    const category = this.data.categories[index];
    this.setData({ currentCategory: index });
    if (category) {
      this.loadProducts(this.data.store.id, category.id);
    } else {
      // index === 0 表示"全部"，显示所有产品
      this.updateFilteredProducts();
    }
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/product-detail/product-detail?id=${id}` });
  },

  quickAdd(e) {
    const item = e.currentTarget.dataset.item;
    if (item.is_combo) {
      wx.navigateTo({ url: `/pages/combo-select/combo-select?id=${item.id}` });
    } else {
      this.addToCart(item.id, 1);
    }
  },

  addToCart(productId, quantity) {
    if (!this.data.store) return;
    app.post('/cart/items', {
      store_id: this.data.store.id,
      product_id: productId,
      quantity,
    }).then(() => {
      wx.showToast({ title: '已加入购物车', icon: 'success', duration: 1000 });
      this.loadCart();
    });
  },

  goCart() {
    wx.navigateTo({ url: '/pages/cart/cart' });
  },

  goCheckout() {
    if (this.data.cartCount === 0) return;
    if (this.data.store.status === 0) {
      wx.showToast({ title: '门店休息中', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: '/pages/order-confirm/order-confirm' });
  },

  goStores() {
    wx.navigateTo({ url: '/pages/store-select/store-select' });
  },
});
