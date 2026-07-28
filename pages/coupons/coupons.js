// 优惠券页
const app = getApp();

Page({
  data: {
    tab: 'available',
    availableCoupons: [],
    myCoupons: [],
    statusText: { 1: '未使用', 2: '已使用', 3: '已过期' },
  },

  onShow() {
    this.loadAvailable();
    this.loadMy();
  },

  switchTab(e) {
    this.setData({ tab: e.currentTarget.dataset.tab });
  },

  loadAvailable() {
    app.get('/coupons', {}, false)
      .then((data) => {
        this.setData({ availableCoupons: data.coupons || [] });
      })
      .catch(() => {});
  },

  loadMy() {
    app.get('/coupons/my')
      .then((data) => {
        this.setData({ myCoupons: data.coupons || [] });
      })
      .catch(() => {});
  },

  claimCoupon(e) {
    const id = e.currentTarget.dataset.id;
    app.post(`/coupons/${id}/claim`)
      .then(() => {
        wx.showToast({ title: '领取成功', icon: 'success' });
        this.loadAvailable();
        this.loadMy();
      });
  },
});
