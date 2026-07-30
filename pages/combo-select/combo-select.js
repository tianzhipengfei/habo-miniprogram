// 套餐选择页
const app = getApp();

Page({
  data: {
    product: {},
    comboGroups: [],         // 分组: [{name, options: [{product, extra_price}]}]
    tabGroups: [],           // 含"汉堡"的分组列表
    currentTab: 0,           // 当前 tab 索引
    selectedMap: {},         // { groupId: [optionId] }
    customMap: {},           // { optionId: { ice: true, ... } }  定制选项
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
        // 给汉堡单独建一个虚拟分组
        const burgerGroup = {
          id: 'burger',
          name: '汉堡',
          min_select: 1,
          max_select: 1,
          options: [{
            id: 'burger_main',
            product_id: product.id,
            product: { ...product },
            extra_price: 0,
          }],
        };
        const tabGroups = [burgerGroup, ...groups];
        this.setData({
          product,
          comboGroups: groups,
          tabGroups,
          comboPrice: parseFloat(product.price) || 0,
        });
        this.calcRequired();
      });
  },

  calcRequired() {
    let total = 0;
    this.data.tabGroups.forEach((g) => {
      total += g.max_select;
    });
    this.setData({ totalRequired: total });
  },

  switchTab(e) {
    this.setData({ currentTab: e.currentTarget.dataset.index });
  },

  isSelected(gi, optionId) {
    const group = this.data.tabGroups[gi];
    if (!group) return false;
    const selected = this.data.selectedMap[group.id] || [];
    return selected.includes(optionId);
  },

  toggleOption(e) {
    const gi = e.currentTarget.dataset.groupIndex;
    const option = e.currentTarget.dataset.option;
    const group = this.data.tabGroups[gi];
    if (!group) return;

    // 检查是否售罄
    if (option.product && option.product.stock === 0) {
      wx.showToast({ title: '该商品已售罄', icon: 'none' });
      return;
    }

    const selected = [...(this.data.selectedMap[group.id] || [])];
    const idx = selected.indexOf(option.id);

    if (idx >= 0) {
      selected.splice(idx, 1);
    } else {
      if (selected.length >= group.max_select) {
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
    this.data.tabGroups.forEach((g) => {
      const s = selectedMap[g.id] || [];
      s.forEach((optId) => {
        const opt = g.options.find((o) => o.id === optId);
        if (opt) comboPrice += parseFloat(opt.extra_price || 0);
      });
    });

    this.setData({ selectedMap, totalSelected, comboPrice });

    // 如果该选项有定制项（如加冰），弹出定制弹窗
    if (selected.includes(option.id) && option.product && option.product.custom_options && option.product.custom_options.length > 0) {
      this.showCustomSheet(option);
    }
  },

  showCustomSheet(option) {
    const customOpts = option.product.custom_options || [];
    const currentCustom = this.data.customMap[option.id] || {};
    const items = customOpts.map((co, i) => {
      const key = `opt_${i}`;
      const checked = currentCustom[key] !== false; // 默认选中
      return `${checked ? '✓ ' : '  '}${co.name}${co.price > 0 ? ' (+¥' + co.price + ')' : ''}`;
    });

    wx.showActionSheet({
      itemList: items.length > 0 ? items : ['无定制选项'],
      success: (res) => {
        const idx = res.tapIndex;
        if (idx < customOpts.length) {
          const key = `opt_${idx}`;
          const current = this.data.customMap[option.id] || {};
          const newCustom = { ...current, [key]: !current[key] };
          const customMap = { ...this.data.customMap, [option.id]: newCustom };
          this.setData({ customMap });
          wx.showToast({ title: (newCustom[key] !== false ? '已添加' : '已移除') + customOpts[idx].name, icon: 'none' });
        }
      },
    });
  },

  addToCart() {
    if (this.data.totalSelected < this.data.totalRequired) {
      wx.showToast({ title: '请完成所有选择', icon: 'none' });
      return;
    }

    const store = app.globalData.currentStore;
    if (!store || !store.id) {
      wx.showToast({ title: '请先选择门店', icon: 'none' });
      return;
    }

    app.post('/cart/items', {
      store_id: store.id,
      product_id: this.data.product.id,
      quantity: 1,
      combo_selections: this.data.selectedMap,
      combo_custom: this.data.customMap,
    }).then(() => {
      wx.showToast({ title: '已加入购物车', icon: 'success' });
      app.globalData.cartCount = (app.globalData.cartCount || 0) + 1;
      setTimeout(() => wx.navigateBack(), 1000);
    });
  },
});
