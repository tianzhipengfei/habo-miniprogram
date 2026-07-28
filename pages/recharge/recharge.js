// 充值页
const app = getApp();

Page({
  data: {
    balance: 0,
    plans: [],
    selectedAmount: 0,
    customAmount: '',
    rechargeAmount: 0,
    currentBonus: 0,
    records: [],
  },

  onShow() {
    this.loadPlans();
    this.loadRecords();
    if (app.globalData.userInfo) {
      this.setData({ balance: app.globalData.userInfo.balance || 0 });
    }
  },

  loadPlans() {
    app.get('/recharge/plans', {}, false)
      .then((data) => {
        this.setData({ plans: data.plans || [] });
      })
      .catch(() => {});
  },

  loadRecords() {
    app.get('/recharge/records')
      .then((data) => {
        this.setData({ records: data.records || [] });
      })
      .catch(() => {});
  },

  selectPlan(e) {
    const amount = parseInt(e.currentTarget.dataset.amount);
    const plan = this.data.plans.find((p) => p.amount === amount);
    this.setData({
      selectedAmount: amount,
      customAmount: '',
      rechargeAmount: amount,
      currentBonus: plan ? plan.bonus : 0,
    });
  },

  onCustomAmount(e) {
    const val = parseFloat(e.detail.value) || 0;
    this.setData({
      customAmount: e.detail.value,
      selectedAmount: 0,
      rechargeAmount: val,
      currentBonus: 0,
    });
  },

  doRecharge() {
    const amount = this.data.rechargeAmount;
    if (amount <= 0) {
      wx.showToast({ title: '请选择或输入金额', icon: 'none' });
      return;
    }

    app.post('/recharge', { amount })
      .then((data) => {
        wx.showToast({ title: `充值成功，到账¥${data.balance}`, icon: 'success' });
        this.setData({ balance: data.balance });
        this.loadRecords();
        app.fetchUserInfo();
      });
  },
});
