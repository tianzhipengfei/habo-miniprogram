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
        const items = data.items || [];
        const totalAmount = data.total || 0;
        this.setData({ items, totalAmount }, () => this.recalc());
      })
      .catch(() => {});
  },

  /** 根据小计/优惠/余额重算实付金额 */
  recalc() {
    const { totalAmount, discountAmount, balanceUsed } = this.data;
    const payAmount = Math.max(totalAmount - discountAmount - balanceUsed, 0);
    this.setData({ payAmount });
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

  /** 余额抵扣开关（门店储值，非微信支付） */
  onUseBalanceChange(e) {
    const useBalance = e.detail.value;
    const balanceUsed = useBalance ? Math.min(this.data.balance, this.data.totalAmount) : 0;
    this.setData({ useBalance, balanceUsed }, () => this.recalc());
  },

  /** 选择优惠券（非支付部分） */
  selectCoupon() {
    app.get('/coupons/my')
      .then((data) => {
        const list = data.coupons || [];
        if (list.length === 0) {
          wx.showToast({ title: '暂无可用优惠券', icon: 'none' });
          return;
        }
        wx.showActionSheet({
          itemList: list.map((c) => `${c.name} - 减¥${c.discount || 0}`),
          success: (res) => {
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
        wx.showToast({ title: '支付失败，请在订单页重试', icon: 'none' });
      });
  },
});
