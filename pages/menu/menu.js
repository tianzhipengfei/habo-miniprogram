// 点单页（左右联动）
const app = getApp();

// 分类 icon 映射
const CATEGORY_ICONS = {
  '套餐': '/images/menu/icon-combo.png',
  '汉堡': '/images/menu/icon-burger.png',
  '饮品': '/images/menu/icon-drink.png',
  '小吃': '/images/menu/icon-snack.png',
  '加料': '/images/menu/icon-extra.png',
};

Page({
  data: {
    store: null,
    categories: [],
    products: [],
    categorySections: [],    // [{ category, products }] 按分类顺序
    recommends: [],
    currentCategory: 0,      // 当前高亮分类 index
    scrollIntoView: '',      // 右侧滚动锚点 id
    cartCount: 0,
    cartTotal: 0,
    cartItems: [],        // 购物车商品明细
    showCartPanel: false, // 是否显示底部购物车弹层
    loading: true,
  },

  // 非渲染用的内部状态
  _scrollTop: 0,
  _sectionTops: [],
  _scrollLock: false,
  _lockTimer: null,

  onShow() {
    const store = app.globalData.currentStore || wx.getStorageSync('currentStore');
    if (!store) return;
    this.setData({ store });
    this._scrollTop = 0;
    this._sectionTops = [];
    this._scrollLock = false;
    const p1 = this.loadCategories(store.id);
    const p2 = this.loadProducts(store.id);
    Promise.all([p1, p2]).then(() => this.buildSections());
    this.loadCart();
  },

  loadCategories(storeId) {
    return app.get(`/products/categories?store_id=${storeId}`, {}, false)
      .then((data) => {
        const categories = (data.categories || []).map((c) => ({
          ...c,
          icon: CATEGORY_ICONS[c.name] || '📦',
        }));
        this.setData({ categories });
      })
      .catch(() => {});
  },

  loadProducts(storeId) {
    this.setData({ loading: true });
    return app.get(`/products?store_id=${storeId}`, {}, false)
      .then((data) => {
        const products = data.products || [];
        const recommends = products.filter((p) => p.is_recommend);
        this.setData({ products, recommends, loading: false });
      })
      .catch(() => {
        this.setData({ loading: false });
      });
  },

  // 按分类把所有商品分组，构建右侧 section 列表
  buildSections() {
    const { categories, products } = this.data;
    if (!categories.length) return;
    const sections = categories.map((cat) => ({
      category: cat,
      products: products.filter((p) => p.category_id === cat.id),
    }));
    this.setData({ categorySections: sections, currentCategory: 0 });
    // 渲染完成后测量各 section 在内容区的顶部偏移，供滚动联动使用
    setTimeout(() => this.measureSections(), 150);
  },

  // 测量每个分类 section 相对 scroll-view 内容顶部的坐标
  measureSections() {
    const query = wx.createSelectorQuery().in(this);
    query.select('.product-list').boundingClientRect();
    query.selectAll('.cat-section').boundingClientRect();
    query.exec((res) => {
      const listRect = res[0];
      const secRects = res[1];
      if (!listRect || !secRects || !secRects.length) return;
      const scrollTop = this._scrollTop || 0;
      this._sectionTops = secRects.map((s) => s.top - listRect.top + scrollTop);
    });
  },

  // 点击左侧分类：右侧滚动到对应分组（加锁避免滚动事件覆盖高亮）
  switchCategory(e) {
    const index = e.currentTarget.dataset.index;
    const sections = this.data.categorySections;
    if (!sections[index]) return;
    this.setData({
      currentCategory: index,
      scrollIntoView: `cat-${sections[index].category.id}`,
    });
    this._scrollLock = true;
    clearTimeout(this._lockTimer);
    this._lockTimer = setTimeout(() => { this._scrollLock = false; }, 400);
  },

  // 右侧滚动：反向联动左侧高亮
  onProductScroll(e) {
    this._scrollTop = e.detail.scrollTop;
    if (this._scrollLock) return;
    const tops = this._sectionTops || [];
    const top = e.detail.scrollTop;
    let active = 0;
    for (let i = 0; i < tops.length; i++) {
      if (tops[i] <= top + 8) active = i;
      else break;
    }
    if (active !== this.data.currentCategory) {
      this.setData({ currentCategory: active });
    }
  },

  loadCart() {
    app.get('/cart')
      .then((data) => {
        const items = (data.items || []).map((item) => ({
          ...item,
          specText: this._formatCartSpec(item),
        }));
        this.setData({
          cartCount: data.count || 0,
          cartTotal: data.total || 0,
          cartItems: items,
        });
        app.globalData.cartCount = data.count || 0;
      })
      .catch(() => {});
  },

  // 格式化购物车规格摘要
  _formatCartSpec(item) {
    if (item.combo_info && item.combo_info.summary) {
      return `(${item.combo_info.summary})`;
    }
    return '(标准)';
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

  // 点击底部购物车图标：展开/收起已选餐品面板
  toggleCartPanel() {
    if (this.data.cartCount === 0) {
      wx.showToast({ title: '购物车是空的', icon: 'none' });
      return;
    }
    this.setData({ showCartPanel: !this.data.showCartPanel });
  },

  closeCartPanel() {
    this.setData({ showCartPanel: false });
  },

  // 从购物车删除商品
  removeCartItem(e) {
    const id = e.currentTarget.dataset.id;
    const willEmpty = this.data.cartCount <= 1;
    app.del(`/cart/items/${id}`)
      .then(() => {
        if (willEmpty) {
          this.setData({ showCartPanel: false });
        }
        this.loadCart();
      });
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

  // 阻止冒泡，避免点击弹层内容时关闭弹层
  noop() {},
});
