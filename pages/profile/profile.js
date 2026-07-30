// 我的页
const app = getApp();

Page({
  data: {
    hasLogin: false,
    user: {},
  },

  onShow() {
    if (app.globalData.token && app.globalData.userInfo) {
      this.setData({ hasLogin: true, user: app.globalData.userInfo });
      return;
    }
    if (app.globalData.token) {
      // 用 Promise 链等待用户信息返回，避免 setTimeout 轮询的竞态
      app.fetchUserInfo().then((user) => {
        if (user) this.setData({ hasLogin: true, user });
      });
    }
  },

  login() {
    app.login()
      .then((data) => {
        this.setData({ hasLogin: true, user: data.user });
      });
  },

  goRecharge() {
    app.checkLogin().then(() => {
      wx.navigateTo({ url: '/pages/recharge/recharge' });
    });
  },

  goCoupons() {
    app.checkLogin().then(() => {
      wx.navigateTo({ url: '/pages/coupons/coupons' });
    });
  },

  goWifi() {
    app.checkLogin().then(() => {
      wx.navigateTo({ url: '/pages/wifi/wifi' });
    });
  },
});
