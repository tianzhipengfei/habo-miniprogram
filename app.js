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
        success(res) {
          if (res.statusCode === 401) {
            wx.removeStorageSync('token');
            this.globalData.token = '';
            wx.navigateTo({ url: '/pages/index/index' });
            reject(new Error('登录过期'));
            return;
          }
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(res.data);
          } else {
            wx.showToast({ title: res.data?.detail || '请求失败', icon: 'none' });
            reject(res.data);
          }
        },
        fail(err) {
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

  /** 获取用户信息 */
  fetchUserInfo() {
    if (!this.globalData.token) return;
    this.get('/users/me')
      .then((data) => {
        this.globalData.userInfo = data.user;
      })
      .catch(() => {});
  },

  /** 检查登录 */
  checkLogin() {
    if (this.globalData.token) return Promise.resolve();
    return this.login();
  },
});
