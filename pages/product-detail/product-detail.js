// 商品详情页
const app = getApp();

Page({
  data: {
    product: {},
    store: null,
    cartCount: 0,
  },

  onLoad(options) {
    const id = options.id;
    this.loadProduct(id);
    this.setData({ store: app.globalData.currentStore || {} });
  },

  onShow() {
    this.loadCart();
  },

  loadProduct(id) {
    app.get(`/products/${id}`, {}, false)
      .then((data) => {
        this.setData({ product: data.product || {} });
      })
      .catch(() => {
        wx.showToast({ title: '加载失败', icon: 'none' });
      });
  },

  loadCart() {
    app.get('/cart')
      .then((data) => {
        this.setData({ cartCount: data.count || 0 });
      })
      .catch(() => {});
  },

  onSelect() {
    const p = this.data.product;
    if (p.is_combo) {
      wx.navigateTo({ url: `/pages/combo-select/combo-select?id=${p.id}` });
    } else {
      this.addToCart(p.id);
    }
  },

  addToCart(productId) {
    const store = this.data.store;
    if (!store || !store.id) {
      wx.showToast({ title: '请先选择门店', icon: 'none' });
      return;
    }
    app.post('/cart/items', { store_id: store.id, product_id: productId, quantity: 1 })
      .then(() => {
        wx.showToast({ title: '已加入购物车', icon: 'success' });
        this.loadCart();
      });
  },

  goCart() {
    wx.navigateTo({ url: '/pages/cart/cart' });
  },

  goCheckout() {
    if (this.data.cartCount === 0) {
      wx.showToast({ title: '购物车为空', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: '/pages/order-confirm/order-confirm' });
  },

  goIndex() {
    wx.switchTab({ url: '/pages/index/index' });
  },

  shareProduct() {
    wx.showToast({ title: '分享功能开发中', icon: 'none' });
  },
});
