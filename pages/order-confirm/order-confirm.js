// 订单确认页
const app = getApp();

Page({
  data: {
    store: null,
    items: [],
    orderType: 1,
    tableNo: '',
    peopleCount: 1,
    totalAmount: 0,
    discountAmount: 0,
    balanceUsed: 0,
    payAmount: 0,
    useBalance: false,
    balance: 0,
    couponId: 0,
    couponName: '',
    submitting: false,
  },

  onShow() {
    const store = app.globalData.currentStore || wx.getStorageSync('currentStore');
    this.setData({ store });
    // 同步用户余额（来自全局 userInfo，recharge 页也会更新）
    if (app.globalData.userInfo) {
      this.setData({ balance: app.globalData.userInfo.balance || 0 });
    }
    this.loadCart();
  },

  loadCart() {
    app.get('/cart')
      .then((data) => {
        // 预计算每项小计，避免 WXML 中浮点乘法出现精度问题（如 29.900000000000002）
        const items = (data.items || []).map((it) => ({
          ...it,
          subtotal: this.toMoney(it.price * it.quantity),
        }));
        const totalAmount = data.total || 0;
        this.setData({ items, totalAmount }, () => this.recalc());
      })
      .catch(() => {});
  },

  /** 金额统一保留两位，规避浮点误差 */
  toMoney(n) {
    return Math.round((parseFloat(n) || 0) * 100) / 100;
  },

  /**
   * 根据小计/优惠/余额统一重算实付金额。
   * 余额抵扣基于「小计 - 优惠券」后的应付金额，避免优惠券与余额叠加时多扣余额。
   */
  recalc() {
    const { totalAmount, discountAmount, useBalance, balance } = this.data;
    const afterCoupon = Math.max(this.toMoney(totalAmount - discountAmount), 0);
    const balanceUsed = useBalance ? this.toMoney(Math.min(balance, afterCoupon)) : 0;
    const payAmount = this.toMoney(Math.max(afterCoupon - balanceUsed, 0));
    this.setData({ balanceUsed, payAmount });
  },

  setType(e) {
    this.setData({ orderType: parseInt(e.currentTarget.dataset.type) });
  },

  onTableNo(e) {
    this.setData({ tableNo: e.detail.value });
  },

  onPeopleChange(e) {
    this.setData({ peopleCount: e.detail.value });
  },

  /** 余额抵扣开关（门店储值，非微信支付），实际抵扣额在 recalc 中统一计算 */
  onUseBalanceChange(e) {
    this.setData({ useBalance: e.detail.value }, () => this.recalc());
  },

  /** 选择优惠券（非支付部分），支持取消已选券 */
  selectCoupon() {
    app.get('/coupons/my')
      .then((data) => {
        const list = data.coupons || [];
        if (list.length === 0) {
          wx.showToast({ title: '暂无可用优惠券', icon: 'none' });
          return;
        }
        const itemList = list.map((c) => `${c.name} - 减¥${c.discount || 0}`);
        if (this.data.couponId) itemList.push('不使用优惠券');
        wx.showActionSheet({
          itemList,
          success: (res) => {
            // 选择"不使用优惠券"：清空已选券并重算
            if (res.tapIndex >= list.length) {
              this.setData(
                { couponId: 0, couponName: '', discountAmount: 0 },
                () => this.recalc(),
              );
              return;
            }
            const c = list[res.tapIndex];
            if (c.min_amount && this.data.totalAmount < c.min_amount) {
              wx.showToast({ title: `满¥${c.min_amount}可用`, icon: 'none' });
              return;
            }
            this.setData(
              { couponId: c.id, couponName: c.name, discountAmount: c.discount || 0 },
              () => this.recalc(),
            );
          },
        });
      })
      .catch(() => {});
  },

  submitOrder() {
    // 防重复提交：连点只生效一次
    if (this.data.submitting) return;
    if (this.data.items.length === 0) {
      wx.showToast({ title: '购物车为空', icon: 'none' });
      return;
    }
    if (!this.data.store) {
      wx.showToast({ title: '请先选择门店', icon: 'none' });
      return;
    }

    const params = {
      store_id: this.data.store.id,
      order_type: this.data.orderType,
      table_no: this.data.tableNo,
      people_count: this.data.peopleCount,
      coupon_id: this.data.couponId,
      use_balance: this.data.balanceUsed,
    };

    this.setData({ submitting: true });
    app.post('/orders', params)
      .then((data) => {
        const order = data.order;
        if (order.pay_amount > 0) {
          this.payOrder(order.id);
        } else {
          wx.showToast({ title: '下单成功', icon: 'success' });
          app.globalData.cartCount = 0;
          setTimeout(() => {
            wx.redirectTo({ url: `/pages/order-detail/order-detail?id=${order.id}` });
          }, 1000);
        }
      })
      .catch(() => {
        this.setData({ submitting: false });
      });
  },

  payOrder(orderId) {
    app.post(`/orders/${orderId}/pay`)
      .then(() => {
        wx.showToast({ title: '支付成功', icon: 'success' });
        app.globalData.cartCount = 0;
        setTimeout(() => {
          wx.redirectTo({ url: `/pages/order-detail/order-detail?id=${orderId}` });
        }, 1000);
      })
      .catch(() => {
        // 复位提交状态，避免按钮永久失效；订单已创建，引导用户去订单详情重试支付
        this.setData({ submitting: false });
        wx.showToast({ title: '支付失败，请在订单页重试', icon: 'none' });
        setTimeout(() => {
          wx.redirectTo({ url: `/pages/order-detail/order-detail?id=${orderId}` });
        }, 1000);
      });
  },
});
