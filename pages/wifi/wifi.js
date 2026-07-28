// WiFi 页
const app = getApp();

Page({
  data: { wifiName: '', wifiPassword: '', showPwd: false },

  onLoad() {
    app.get('/users/wifi')
      .then((data) => {
        this.setData({ wifiName: data.wifi_name, wifiPassword: data.wifi_password });
      })
      .catch(() => {});
  },

  togglePwd() { this.setData({ showPwd: !this.data.showPwd }); },

  copyPwd() {
    wx.setClipboardData({
      data: this.data.wifiPassword,
      success: () => wx.showToast({ title: '已复制', icon: 'success' }),
    });
  },
});
