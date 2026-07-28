// 首页逻辑
const app = getApp();

Page({
  data: {
    hasLogin: false,
  },

  onLoad() {
    if (app.globalData.token) {
      this.setData({ hasLogin: true });
    }
  },

  onShow() {
    if (app.globalData.token) {
      this.setData({ hasLogin: true });
    }
  },

  /** 进入点单 */
  goOrder(e) {
    const orderType = e.currentTarget.dataset.type;
    app.checkLogin().then(() => {
      const store = app.globalData.currentStore;
      if (!store) {
        wx.navigateTo({ url: '/pages/store-select/store-select?orderType=' + orderType });
      } else {
        wx.switchTab({ url: '/pages/menu/menu' });
      }
    });
  },

  /** 优惠券 */
  goCoupons() {
    app.checkLogin().then(() => {
      wx.navigateTo({ url: '/pages/coupons/coupons' });
    });
  },

  /** 会员中心 */
  goMember() {
    wx.showToast({ title: '会员中心开发中', icon: 'none' });
  },

  /** 充值 */
  goRecharge() {
    app.checkLogin().then(() => {
      wx.navigateTo({ url: '/pages/recharge/recharge' });
    });
  },

  /** 邀请有礼 */
  goInvite() {
    wx.showToast({ title: '邀请功能开发中', icon: 'none' });
  },

  /** 门店导航 */
  goStores() {
    wx.navigateTo({ url: '/pages/store-select/store-select' });
  },
});
