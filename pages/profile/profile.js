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
    } else if (app.globalData.token) {
      app.fetchUserInfo();
      setTimeout(() => {
        if (app.globalData.userInfo) {
          this.setData({ hasLogin: true, user: app.globalData.userInfo });
        }
      }, 500);
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
