// 门店选择页
const app = getApp();

Page({
  data: {
    city: '深圳市',
    keyword: '',
    stores: [],
    loading: true,
    centerLat: 22.5431,
    centerLng: 113.9291,
    markers: [],
    orderType: 1,
  },

  onLoad(options) {
    if (options.orderType) {
      this.setData({ orderType: parseInt(options.orderType) });
    }
    this.getLocation();
    this.loadStores();
  },

  getLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        this.setData({
          centerLat: res.latitude,
          centerLng: res.longitude,
        });
      },
      fail: () => {},
    });
  },

  loadStores() {
    const params = {
      city: this.data.city,
      lat: this.data.centerLat,
      lng: this.data.centerLng,
    };
    if (this.data.keyword) params.keyword = this.data.keyword;

    app.get('/stores', params, false)
      .then((data) => {
        const stores = data.stores || [];
        const markers = stores.map((s) => ({
          id: s.id,
          latitude: s.latitude,
          longitude: s.longitude,
          title: s.name,
          iconPath: '/images/marker-store.png',
          width: 30,
          height: 30,
        }));
        this.setData({ stores, markers, loading: false });
      })
      .catch(() => {
        this.setData({ loading: false });
      });
  },

  onSearchInput(e) {
    this.setData({ keyword: e.detail.value });
  },

  onSearch() {
    this.loadStores();
  },

  onMarkerTap(e) {
    const storeId = e.detail.markerId;
    const store = this.data.stores.find((s) => s.id === storeId);
    if (store) {
      wx.showModal({
        title: store.name,
        content: `${store.address}\n${store.business_hours}`,
        confirmText: '去下单',
        success: (res) => {
          if (res.confirm) this.selectStoreFromId(storeId);
        },
      });
    }
  },

  selectStore(e) {
    this.selectStoreFromId(e.currentTarget.dataset.id);
  },

  selectStoreFromId(storeId) {
    const store = this.data.stores.find((s) => s.id === storeId);
    if (!store) return;
    if (store.status === 0) {
      wx.showToast({ title: '门店休息中', icon: 'none' });
      return;
    }
    app.globalData.currentStore = store;
    wx.setStorageSync('currentStore', store);
    wx.switchTab({ url: '/pages/menu/menu' });
  },

  goOrder(e) {
    const { id, status } = e.currentTarget.dataset;
    if (status === 0) {
      wx.showToast({ title: '门店休息中', icon: 'none' });
      return;
    }
    this.selectStoreFromId(id);
  },

  callStore(e) {
    const phone = e.currentTarget.dataset.phone;
    if (phone) wx.makePhoneCall({ phoneNumber: phone });
  },

  navigateStore(e) {
    const item = e.currentTarget.dataset.item;
    wx.openLocation({
      latitude: item.latitude,
      longitude: item.longitude,
      name: item.name,
      address: item.address,
    });
  },

  showCityPicker() {
    wx.showActionSheet({
      itemList: ['深圳市'],
      success: (res) => {
        this.setData({ city: '深圳市' });
        this.loadStores();
      },
    });
  },
});
