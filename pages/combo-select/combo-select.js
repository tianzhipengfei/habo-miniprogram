// 套餐选择页
const app = getApp();

Page({
  data: {
    product: {},
    comboGroups: [],
    currentGroup: 0,
    selectedMap: {},   // { groupId: [optionId] }
    totalSelected: 0,
    totalRequired: 0,
    comboPrice: 0,
  },

  onLoad(options) {
    this.loadCombo(options.id);
  },

  loadCombo(productId) {
    app.get(`/products/${productId}`, {}, false)
      .then((data) => {
        const product = data.product || {};
        const groups = product.combo_groups || [];
        this.setData({
          product,
          comboGroups: groups,
          comboPrice: parseFloat(product.price) || 0,
        });
        this.calcRequired();
      });
  },

  calcRequired() {
    let total = 0;
    this.data.comboGroups.forEach((g) => {
      total += g.max_select;
    });
    this.setData({ totalRequired: total });
  },

  switchGroup(e) {
    this.setData({ currentGroup: e.currentTarget.dataset.index });
  },

  get currentOptions() {
    const group = this.data.comboGroups[this.data.currentGroup];
    return group ? group.options : [];
  },

  isSelected(groupIndex, optionId) {
    const group = this.data.comboGroups[groupIndex];
    if (!group) return false;
    const selected = this.data.selectedMap[group.id] || [];
    return selected.includes(optionId);
  },

  toggleOption(e) {
    const option = e.currentTarget.dataset.option;
    const group = this.data.comboGroups[this.data.currentGroup];
    const selected = [...(this.data.selectedMap[group.id] || [])];
    const idx = selected.indexOf(option.id);

    if (idx >= 0) {
      selected.splice(idx, 1);
    } else {
      if (selected.length >= group.max_select) {
        // 单选模式：替换
        if (group.max_select === 1) {
          selected[0] = option.id;
        } else {
          wx.showToast({ title: `最多选${group.max_select}项`, icon: 'none' });
          return;
        }
      } else {
        selected.push(option.id);
      }
    }

    const selectedMap = { ...this.data.selectedMap, [group.id]: selected };
    let totalSelected = 0;
    Object.values(selectedMap).forEach((arr) => {
      totalSelected += arr.length;
    });

    // 计算价格
    let comboPrice = parseFloat(this.data.product.price) || 0;
    this.data.comboGroups.forEach((g) => {
      const s = selectedMap[g.id] || [];
      s.forEach((optId) => {
        const opt = g.options.find((o) => o.id === optId);
        if (opt) comboPrice += parseFloat(opt.extra_price || 0);
      });
    });

    this.setData({ selectedMap, totalSelected, comboPrice });
  },

  addToCart() {
    if (this.data.totalSelected < this.data.totalRequired) return;

    const store = app.globalData.currentStore;
    if (!store || !store.id) {
      wx.showToast({ title: '请先选择门店', icon: 'none' });
      return;
    }

    app.post('/cart/items', {
      store_id: store.id,
      product_id: this.data.product.id,
      quantity: 1,
    }).then(() => {
      wx.showToast({ title: '已加入购物车', icon: 'success' });
      app.globalData.cartCount = (app.globalData.cartCount || 0) + 1;
      setTimeout(() => wx.navigateBack(), 1000);
    });
  },
});
