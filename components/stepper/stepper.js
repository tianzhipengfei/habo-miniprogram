// 步进器组件：用于选择人数等数量场景
Component({
  properties: {
    value: { type: Number, value: 1 },
    min: { type: Number, value: 1 },
    max: { type: Number, value: 99 },
  },
  methods: {
    onMinus() {
      const v = this.data.value - 1;
      if (v < this.data.min) return;
      this.triggerEvent('change', { value: v });
    },
    onPlus() {
      const v = this.data.value + 1;
      if (v > this.data.max) return;
      this.triggerEvent('change', { value: v });
    },
  },
});
