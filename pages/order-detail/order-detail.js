// 订单详情页
const app = getApp();

Page({
  data: {
    order: {},
    items: [],
    statusText: { 0: '待支付', 1: '已支付', 2: '制作中', 3: '已完成', 4: '已取消' },
    statusIcon: { 0: '⏳', 1: '✅', 2: '🔥', 3: '🎉', 4: '❌' },
    typeText: { 1: '堂食', 2: '打包', 3: '快餐', 4: '当面付', 5: '排队', 6: '预约', 7: '快递' },
  },

  onLoad(options) {
    this.loadOrder(options.id);
  },

  loadOrder(orderId) {
    app.get(`/orders/${orderId}`)
      .then((data) => {
        this.setData({ order: data.order || {}, items: data.items || [] });
      })
      .catch(() => {});
  },

  payAgain() {
    app.post(`/orders/${this.data.order.id}/pay`)
      .then(() => {
        wx.showToast({ title: '支付成功', icon: 'success' });
        this.loadOrder(this.data.order.id);
      });
  },

  cancelOrder() {
    wx.showModal({
      title: '确认取消',
      content: '确定要取消该订单吗？',
      success: (res) => {
        if (res.confirm) {
          app.post(`/orders/${this.data.order.id}/cancel`)
            .then(() => {
              wx.showToast({ title: '已取消', icon: 'success' });
              this.loadOrder(this.data.order.id);
            });
        }
      },
    });
  },
});
