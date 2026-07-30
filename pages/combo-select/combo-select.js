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

  /** 重算套餐总价（含各项加价与自定义加价） */
  recalcComboPrice() {
    let comboPrice = parseFloat(this.data.product.price) || 0;
    this.data.tabGroups.forEach((g) => {
      const selected = this.data.selectedMap[g.id] || [];
      selected.forEach((optId) => {
        const opt = g.options.find((o) => o.id === optId);
        if (!opt) return;
        comboPrice += parseFloat(opt.extra_price || 0);
        // 自定义加价（如加冰 +¥2）：默认选中项也计入价格
        const custom = this.data.customMap[optId] || {};
        const customOpts = (opt.product && opt.product.custom_options) || [];
        customOpts.forEach((co, i) => {
          if (custom[`opt_${i}`] !== false) {
            comboPrice += parseFloat(co.price || 0);
          }
        });
      });
    });
    // 保留两位小数，规避浮点累加误差
    this.setData({ comboPrice: Math.round(comboPrice * 100) / 100 });
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

    this.setData({ selectedMap, totalSelected }, () => this.recalcComboPrice());

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
          // 未设置时默认为选中（!== false），取反基于"当前实际选中态"，
          // 修复首次点击取消时 !undefined === true 导致点击无效的问题
          const curChecked = current[key] !== false;
          const newCustom = { ...current, [key]: !curChecked };
          const customMap = { ...this.data.customMap, [option.id]: newCustom };
          this.setData({ customMap }, () => this.recalcComboPrice());
          wx.showToast({ title: (!curChecked ? '已添加' : '已移除') + customOpts[idx].name, icon: 'none' });
        }
      },
    });
  },

  addToCart() {
    // 防重复提交：请求返回前忽略连点
    if (this._adding) return;
    if (this.data.totalSelected < this.data.totalRequired) {
      wx.showToast({ title: '请完成所有选择', icon: 'none' });
      return;
    }

    const store = app.globalData.currentStore;
    if (!store || !store.id) {
      wx.showToast({ title: '请先选择门店', icon: 'none' });
      return;
    }

    this._adding = true;
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
    }).catch(() => {
      this._adding = false;
    });
  },
});
