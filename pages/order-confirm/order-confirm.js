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
    couponId: 0,
  },

  onShow() {
    const store = app.globalData.currentStore || wx.getStorageSync('currentStore');
    this.setData({ store });
    this.loadCart();
  },

  loadCart() {
    app.get('/cart')
      .then((data) => {
        const items = data.items || [];
        const totalAmount = data.total || 0;
        this.setData({
          items,
          totalAmount,
          payAmount: totalAmount,
        });
      })
      .catch(() => {});
  },

  setType(e) {
    this.setData({ orderType: parseInt(e.currentTarget.dataset.type) });
  },

  onTableNo(e) {
    this.setData({ tableNo: e.detail.value });
  },

  submitOrder() {
    if (this.data.items.length === 0) {
      wx.showToast({ title: '购物车为空', icon: 'none' });
      return;
    }

    const params = {
      store_id: this.data.store.id,
      order_type: this.data.orderType,
      table_no: this.data.tableNo,
      people_count: this.data.peopleCount,
      coupon_id: this.data.couponId,
      use_balance: this.data.useBalance ? this.data.balanceUsed : 0,
    };

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
      .catch(() => {});
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
