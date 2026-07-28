// 订单页
const app = getApp();

Page({
  data: {
    dateType: 'today',
    orderTypeFilter: null,
    orders: [],
    statusText: { 0: '待支付', 1: '已支付', 2: '制作中', 3: '已完成', 4: '已取消' },
    typeText: { 1: '堂食', 2: '打包', 3: '快餐', 4: '当面付', 5: '排队', 6: '预约', 7: '快递' },
  },

  onShow() {
    app.checkLogin().then(() => this.loadOrders());
  },

  loadOrders() {
    let url = `/orders?date_type=${this.data.dateType}`;
    if (this.data.orderTypeFilter) {
      url += `&order_type=${this.data.orderTypeFilter}`;
    }
    app.get(url)
      .then((data) => {
        this.setData({ orders: data.orders || [] });
      })
      .catch(() => {});
  },

  switchDate(e) {
    this.setData({ dateType: e.currentTarget.dataset.type });
    this.loadOrders();
  },

  filterType(e) {
    this.setData({ orderTypeFilter: parseInt(e.currentTarget.dataset.type) || null });
    this.loadOrders();
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/order-detail/order-detail?id=${id}` });
  },

  contactStore() {
    const store = app.globalData.currentStore;
    if (store && store.phone) {
      wx.makePhoneCall({ phoneNumber: store.phone });
    } else {
      wx.showToast({ title: '暂无商家电话', icon: 'none' });
    }
  },
});
