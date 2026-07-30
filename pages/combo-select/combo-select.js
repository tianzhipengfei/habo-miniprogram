// 套餐选择页
const app = getApp();

Page({
  data: {
    product: {},
    burgerGroup: null,       // 汉堡虚拟分组
    comboGroups: [],         // 饮品/小吃等实际分组
    selectedMap: {},         // { groupId: [optionId] }
    customMap: {},           // { optionId: { opt_0: true, ... } }
    totalSelected: 0,
    totalRequired: 0,
    comboPrice: 0,
    comboPriceText: '0.00',
    showCartPanel: false,    // 是否显示"当前已选"弹层
    panelItems: [],          // 弹层展示的已选项
  },

  onLoad(options) {
    this.loadCombo(options.id);
  },

  // 给 product / option 附加展示字段
  _fmtProduct(p) {
    return {
      ...p,
      priceText: parseFloat(p.price || 0).toFixed(2),
    };
  },

  _fmtGroup(g) {
    return {
      ...g,
      options: (g.options || []).map((opt) => ({
        ...opt,
        selected: false,
        product: opt.product ? this._fmtProduct(opt.product) : null,
      })),
    };
  },

  loadCombo(productId) {
    app.get(`/products/${productId}`, {}, false)
      .then((data) => {
        const product = this._fmtProduct(data.product || {});
        const groups = (product.combo_groups || []).map((g) => this._fmtGroup(g));

        // 汉堡作为套餐主商品，单独一个虚拟分组
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
            selected: false,
          }],
        };

        const comboPrice = parseFloat(product.price) || 0;
        this.setData({
          product,
          burgerGroup,
          comboGroups: groups,
          comboPrice,
          comboPriceText: comboPrice.toFixed(2),
        });
        this.calcRequired();
      });
  },

  calcRequired() {
    let total = 0;
    if (this.data.burgerGroup) total += this.data.burgerGroup.max_select;
    this.data.comboGroups.forEach((g) => {
      total += g.max_select;
    });
    this.setData({ totalRequired: total });
  },

  // 获取分组对象（汉堡 or 实际分组）
  _getGroup(groupId) {
    if (this.data.burgerGroup && this.data.burgerGroup.id === groupId) {
      return this.data.burgerGroup;
    }
    return this.data.comboGroups.find((g) => g.id === groupId);
  },

  isSelected(groupId, optionId) {
    const selected = this.data.selectedMap[groupId] || [];
    return selected.includes(optionId);
  },

  toggleOption(e) {
    const groupId = e.currentTarget.dataset.groupId;
    const optionId = e.currentTarget.dataset.optionId;
    const option = this._findOption(groupId, optionId);
    const group = this._getGroup(groupId);
    if (!group || !option) return;

    // 售罄不可选
    if (option.product && option.product.stock === 0) {
      wx.showToast({ title: '该商品已售罄', icon: 'none' });
      return;
    }

    const selected = [...(this.data.selectedMap[group.id] || [])];
    const idx = selected.indexOf(optionId);

    if (idx >= 0) {
      selected.splice(idx, 1);
    } else {
      if (selected.length >= group.max_select) {
        if (group.max_select === 1) {
          selected[0] = optionId;
        } else {
          wx.showToast({ title: `最多选${group.max_select}项`, icon: 'none' });
          return;
        }
      } else {
        selected.push(optionId);
      }
    }

    this._commitSelection(group.id, selected, option);
  },

  // 黑色箭头按钮：进入定制/选择
  onCustomBtnTap(e) {
    const groupId = e.currentTarget.dataset.groupId;
    const optionId = e.currentTarget.dataset.optionId;
    const option = this._findOption(groupId, optionId);
    const group = this._getGroup(groupId);
    if (!group || !option) return;

    // 售罄不可操作
    if (option.product && option.product.stock === 0) {
      wx.showToast({ title: '该商品已售罄', icon: 'none' });
      return;
    }

    // 如果尚未选中，先选中
    const selected = [...(this.data.selectedMap[group.id] || [])];
    if (!selected.includes(optionId)) {
      if (selected.length >= group.max_select) {
        if (group.max_select === 1) {
          selected[0] = optionId;
        } else {
          wx.showToast({ title: `最多选${group.max_select}项`, icon: 'none' });
          return;
        }
      } else {
        selected.push(optionId);
      }
      this._commitSelection(group.id, selected, option);
    }

    // 有定制项则弹出
    if (option.product && option.product.custom_options && option.product.custom_options.length > 0) {
      this.showCustomSheet(option);
    }
  },

  // 按 groupId + optionId 找到完整 option（避免通过 dataset 传大对象）
  _findOption(groupId, optionId) {
    const group = this._getGroup(groupId);
    if (!group) return null;
    return group.options.find((o) => o.id === optionId) || null;
  },

  _commitSelection(groupId, selected, option) {
    const selectedMap = { ...this.data.selectedMap, [groupId]: selected };

    let totalSelected = 0;
    Object.values(selectedMap).forEach((arr) => {
      totalSelected += arr.length;
    });

    // 计算价格
    let comboPrice = parseFloat(this.data.product.price) || 0;
    const allGroups = [this.data.burgerGroup, ...this.data.comboGroups].filter(Boolean);
    allGroups.forEach((g) => {
      const s = selectedMap[g.id] || [];
      s.forEach((optId) => {
        const opt = g.options.find((o) => o.id === optId);
        if (opt) comboPrice += parseFloat(opt.extra_price || 0);
      });
    });

    this.setData({
      selectedMap,
      totalSelected,
      comboPrice,
      comboPriceText: comboPrice.toFixed(2),
    });

    // 同步每个 option 的 selected 标志，供 WXML 直接绑定（避免模板方法调用不刷新）
    this._syncSelected();

    // 选中且带定制项时自动弹出定制
    if (selected.includes(option.id) && option.product && option.product.custom_options && option.product.custom_options.length > 0) {
      this.showCustomSheet(option);
    }
  },

  // 将 selectedMap 同步到各 group 下 option.selected，WXML 用 opt.selected 判断
  _syncSelected() {
    const map = this.data.selectedMap;
    const syncGroup = (g) => ({
      ...g,
      options: g.options.map((o) => ({
        ...o,
        selected: (map[g.id] || []).includes(o.id),
      })),
    });
    const burgerGroup = this.data.burgerGroup ? syncGroup(this.data.burgerGroup) : null;
    const comboGroups = this.data.comboGroups.map(syncGroup);
    this.setData({ burgerGroup, comboGroups });
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
          this.setData({ customMap });
          wx.showToast({
            title: (newCustom[key] !== false ? '已添加' : '已移除') + customOpts[idx].name,
            icon: 'none',
          });
        }
      },
    });
  },

  // 构建"当前已选"弹层数据
  _buildPanelItems() {
    const items = [];
    const allGroups = [this.data.burgerGroup, ...this.data.comboGroups].filter(Boolean);
    allGroups.forEach((g) => {
      const selected = this.data.selectedMap[g.id] || [];
      selected.forEach((optId) => {
        const opt = g.options.find((o) => o.id === optId);
        if (!opt || !opt.product) return;
        const custom = this.data.customMap[opt.id] || {};
        const customNames = (opt.product.custom_options || [])
          .map((co, i) => ({ name: co.name, checked: custom[`opt_${i}`] !== false }))
          .filter((co) => co.checked)
          .map((co) => co.name);
        const extra = parseFloat(opt.extra_price || 0);
        items.push({
          groupId: g.id,
          optionId: opt.id,
          groupName: g.name,
          name: opt.product.name,
          image: opt.product.image,
          specText: customNames.length ? customNames.join('/') : '标准',
          extraText: extra > 0 ? `+¥${extra.toFixed(2)}` : '',
        });
      });
    });
    return items;
  },

  // 点击底部购物车图标：展开/收起当前套餐已选内容
  toggleCartPanel() {
    if (this.data.showCartPanel) {
      this.setData({ showCartPanel: false });
      return;
    }
    const panelItems = this._buildPanelItems();
    if (!panelItems.length) {
      wx.showToast({ title: '还没有选择内容', icon: 'none' });
      return;
    }
    this.setData({ panelItems, showCartPanel: true });
  },

  closeCartPanel() {
    this.setData({ showCartPanel: false });
  },

  // 从弹层移除某个已选项（取消选择）
  removePanelItem(e) {
    const { groupId, optionId } = e.currentTarget.dataset;
    const option = this._findOption(groupId, optionId);
    const group = this._getGroup(groupId);
    if (!group || !option) return;
    const selected = (this.data.selectedMap[group.id] || []).filter((id) => id !== optionId);
    this._commitSelection(group.id, selected, option);
    const panelItems = this._buildPanelItems();
    this.setData({ panelItems });
    if (!panelItems.length) this.setData({ showCartPanel: false });
  },

  // 阻止冒泡，避免点击弹层内容时关闭弹层
  noop() {},

  // 生成购物车展示用的规格摘要，例如 "标准; 冻柠乐(去冰); 小份薯条"
  _buildComboInfo() {
    const parts = [];
    const allGroups = [this.data.burgerGroup, ...this.data.comboGroups].filter(Boolean);
    allGroups.forEach((g) => {
      const selected = this.data.selectedMap[g.id] || [];
      selected.forEach((optId) => {
        const opt = g.options.find((o) => o.id === optId);
        if (!opt || !opt.product) return;
        const name = opt.product.name || '';
        const custom = this.data.customMap[opt.id] || {};
        const customNames = (opt.product.custom_options || [])
          .map((co, i) => ({ name: co.name, checked: custom[`opt_${i}`] !== false }))
          .filter((co) => co.checked)
          .map((co) => co.name);
        parts.push(customNames.length ? `${name}(${customNames.join('/')})` : name);
      });
    });
    return { summary: parts.length ? parts.join('; ') : '标准' };
  },

  addToCart() {
    // 防重复提交：请求返回前忽略连点
    if (this._adding) return;
    if (this.data.totalSelected < this.data.totalRequired) {
      wx.showToast({ title: '请完成所有选择', icon: 'none' });
      return;
    }

    const store = app.globalData.currentStore || wx.getStorageSync('currentStore');
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
      combo_info: this._buildComboInfo(),
    }).then(() => {
      wx.showToast({ title: '已加入购物车', icon: 'success' });
      app.globalData.cartCount = (app.globalData.cartCount || 0) + 1;
      setTimeout(() => wx.navigateBack(), 1000);
    }).catch(() => {
      this._adding = false;
    });
  },
});
