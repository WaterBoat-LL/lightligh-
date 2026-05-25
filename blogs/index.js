// 纯前端访客计数器 - 基于 LocalStorage
// 无需后端，每次刷新页面 total +1

// 访客计数
const visitorCounter = {
  // 获取当前计数
  getCounts() {
    const total = parseInt(localStorage.getItem('totalVisits') || '0');
    const lastDate = localStorage.getItem('lastVisitDate');
    const today = localStorage.getItem('todayVisits') || '0';
    return { total, lastDate, today: parseInt(today) };
  },

  // 记录一次访问
  addVisit() {
    const now = new Date().toISOString().split('T')[0];
    const { total, lastDate, today } = this.getCounts();

    let newTotal = total + 1;
    let newToday = today;

    // 如果不是今天，重置今日计数
    if (lastDate !== now) {
      newToday = 1;
      localStorage.setItem('lastVisitDate', now);
    } else {
      newToday = today + 1;
    }

    localStorage.setItem('totalVisits', newTotal);
    localStorage.setItem('todayVisits', newToday);

    return {
      total: newTotal,
      today: newToday
    };
  },

  // 获取并更新计数（获取当前值并+1）
  fetchAndCount() {
    const counts = this.addVisit();
    this.updateDisplay(counts);
    return counts;
  },

  // 更新页面显示
  updateDisplay(counts) {
    const totalEl = document.getElementById('total-visits');
    const todayEl = document.getElementById('today-visits');
    if (totalEl) totalEl.textContent = counts.total;
    if (todayEl) todayEl.textContent = counts.today;
  },

  // 仅获取不增加
  show() {
    const counts = this.getCounts();
    // 如果过期，今日归零
    const now = new Date().toISOString().split('T')[0];
    if (counts.lastDate !== now) {
      counts.today = 0;
    }
    this.updateDisplay(counts);
    return counts;
  }
};

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = visitorCounter;
}