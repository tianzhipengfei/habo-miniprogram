// 充值页
const app = getApp();

// 自定义充值金额上下限（按业务调整）
const RECHARGE_MIN = 1;
const RECHARGE_MAX = 5000;

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
    let val = parseFloat(e.detail.value) || 0;
    if (val > RECHARGE_MAX) {
      val = RECHARGE_MAX;
      wx.showToast({ title: `单笔最多¥${RECHARGE_MAX}`, icon: 'none' });
    }
    this.setData({
      customAmount: e.detail.value,
      selectedAmount: 0,
      rechargeAmount: val,
      currentBonus: 0,
    });
  },

  doRecharge() {
    const amount = this.data.rechargeAmount;
    if (amount < RECHARGE_MIN || amount > RECHARGE_MAX) {
      wx.showToast({ title: `金额需在 ¥${RECHARGE_MIN}-¥${RECHARGE_MAX} 之间`, icon: 'none' });
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
