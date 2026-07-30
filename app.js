// Habo Burger 小程序全局配置
const BASE_URL = 'http://localhost:8000/api';

App({
  globalData: {
    baseUrl: BASE_URL,
    token: '',
    userInfo: null,
    currentStore: null,
    cartCount: 0,
  },

  onLaunch() {
    // 恢复登录态
    const token = wx.getStorageSync('token');
    if (token) {
      this.globalData.token = token;
      this.fetchUserInfo();
    }
  },

  /** 请求封装 */
  request(options) {
    return new Promise((resolve, reject) => {
      const { url, method = 'GET', data, needAuth = true } = options;
      const header = { 'Content-Type': 'application/json' };
      if (needAuth && this.globalData.token) {
        header['Authorization'] = `Bearer ${this.globalData.token}`;
      }
      wx.request({
        url: `${BASE_URL}${url}`,
        method,
        data,
        header,
        timeout: 10000,
        // 用箭头函数保证 this 指向 App 实例（避免 401 清理时 this.globalData 报错）
        success: (res) => {
          if (res.statusCode === 401) {
            wx.removeStorageSync('token');
            getApp().globalData.token = '';
            wx.showToast({ title: '登录已过期，请重新登录', icon: 'none' });
            wx.navigateTo({ url: '/pages/index/index' });
            reject(new Error('登录过期'));
            return;
          }
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(res.data);
          } else {
            const msg = (res.data && (res.data.detail || res.data.message)) || '请求失败';
            wx.showToast({ title: msg, icon: 'none' });
            reject(res.data || new Error(msg));
          }
        },
        fail: (err) => {
          wx.showToast({ title: '网络异常，请重试', icon: 'none' });
          reject(err);
        },
      });
    });
  },

  /** GET 请求 */
  get(url, data, needAuth = true) {
    return this.request({ url, method: 'GET', data, needAuth });
  },

  /** POST 请求 */
  post(url, data, needAuth = true) {
    return this.request({ url, method: 'POST', data, needAuth });
  },

  /** PUT 请求 */
  put(url, data, needAuth = true) {
    return this.request({ url, method: 'PUT', data, needAuth });
  },

  /** DELETE 请求 */
  del(url, data, needAuth = true) {
    return this.request({ url, method: 'DELETE', data, needAuth });
  },

  /** 微信登录 */
  login() {
    return new Promise((resolve, reject) => {
      wx.login({
        success: (res) => {
          if (res.code) {
            this.post(`/auth/login?code=${res.code}`, {}, false)
              .then((data) => {
                this.globalData.token = data.token;
                this.globalData.userInfo = data.user;
                wx.setStorageSync('token', data.token);
                resolve(data);
              })
              .catch(reject);
          } else {
            reject(new Error('登录失败'));
          }
        },
        fail: reject,
      });
    });
  },

  /** 获取用户信息（返回 Promise，便于调用方链式处理） */
  fetchUserInfo() {
    if (!this.globalData.token) return Promise.resolve(null);
    return this.get('/users/me')
      .then((data) => {
        this.globalData.userInfo = data.user;
        return data.user;
      })
      .catch(() => null);
  },

  /** 检查登录 */
  checkLogin() {
    if (this.globalData.token) return Promise.resolve();
    return this.login();
  },
});
