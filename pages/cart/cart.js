// 购物车页
const app = getApp();

Page({
  data: { items: [], total: 0 },

  onShow() { this.loadCart(); },

  loadCart() {
    app.get('/cart')
      .then((data) => {
        this.setData({ items: data.items || [], total: data.total || 0 });
      })
      .catch(() => {});
  },

  changeQty(e) {
    const { id, qty } = e.currentTarget.dataset;
    if (qty <= 0) {
      wx.showModal({
        title: '确认删除',
        content: '确定要删除该商品吗？',
        success: (res) => {
          if (res.confirm) {
            app.del(`/cart/items/${id}`).then(() => this.loadCart());
          }
        },
      });
    } else {
      app.put(`/cart/items/${id}`, { quantity: qty }).then(() => this.loadCart());
    }
  },

  goCheckout() {
    wx.navigateTo({ url: '/pages/order-confirm/order-confirm' });
  },

  goMenu() {
    wx.switchTab({ url: '/pages/menu/menu' });
  },
});
