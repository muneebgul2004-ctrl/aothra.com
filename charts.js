const Charts = (() => {
  let pieChart = null;
  let categoryChart = null;
  let trendChart = null;

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function baseFont() {
    return {
      family: "'Inter', sans-serif",
      size: 12,
    };
  }

  function renderPieChart(income, expense) {
    const canvas = document.getElementById('pieChart');
    const emptyNote = document.getElementById('pieEmptyNote');
    const hasData = income > 0 || expense > 0;

    canvas.style.display = hasData ? 'block' : 'none';
    emptyNote.style.display = hasData ? 'none' : 'block';
    if (!hasData) {
      if (pieChart) { pieChart.destroy(); pieChart = null; }
      return;
    }

    const data = {
      labels: ['Income', 'Expense'],
      datasets: [{
        data: [income, expense],
        backgroundColor: [cssVar('--emerald'), cssVar('--coral')],
        borderColor: cssVar('--ink-card'),
        borderWidth: 3,
        hoverOffset: 6,
      }],
    };

    if (pieChart) {
      pieChart.data = data;
      pieChart.update();
      return;
    }

    pieChart = new Chart(canvas.getContext('2d'), {
      type: 'doughnut',
      data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: cssVar('--text-secondary'), font: baseFont(), usePointStyle: true, padding: 16 },
          },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.label}: $${ctx.parsed.toFixed(2)}`,
            },
          },
        },
      },
    });
  }

  function renderCategoryChart(categoryTotals) {
    const canvas = document.getElementById('categoryChart');
    const emptyNote = document.getElementById('categoryEmptyNote');
    const entries = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
    const hasData = entries.length > 0;

    canvas.style.display = hasData ? 'block' : 'none';
    emptyNote.style.display = hasData ? 'none' : 'block';
    if (!hasData) {
      if (categoryChart) { categoryChart.destroy(); categoryChart = null; }
      return;
    }

    const labels = entries.map((e) => e[0]);
    const values = entries.map((e) => e[1]);

    const data = {
      labels,
      datasets: [{
        data: values,
        backgroundColor: cssVar('--coral'),
        borderRadius: 6,
        maxBarThickness: 28,
      }],
    };

    if (categoryChart) {
      categoryChart.data = data;
      categoryChart.update();
      return;
    }

    categoryChart = new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: {
          x: {
            ticks: { color: cssVar('--text-muted'), font: baseFont(), callback: (v) => `$${v}` },
            grid: { color: cssVar('--ink-border-soft') },
          },
          y: {
            ticks: { color: cssVar('--text-secondary'), font: baseFont() },
            grid: { display: false },
          },
        },
      },
    });
  }

  function renderTrendChart(monthlyData) {
    const canvas = document.getElementById('trendChart');

    const data = {
      labels: monthlyData.map((m) => m.label),
      datasets: [{
        label: 'Expenses',
        data: monthlyData.map((m) => m.total),
        borderColor: cssVar('--gold'),
        backgroundColor: (ctx) => {
          const { chart } = ctx;
          const { ctx: c, chartArea } = chart;
          if (!chartArea) return 'transparent';
          const gradient = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, 'rgba(212,166,87,0.28)');
          gradient.addColorStop(1, 'rgba(212,166,87,0)');
          return gradient;
        },
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: cssVar('--gold'),
        pointBorderColor: cssVar('--ink-card'),
        pointBorderWidth: 2,
        borderWidth: 2.5,
      }],
    };

    if (trendChart) {
      trendChart.data = data;
      trendChart.update();
      return;
    }

    trendChart = new Chart(canvas.getContext('2d'), {
      type: 'line',
      data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx) => ` $${ctx.parsed.y.toFixed(2)}` } },
        },
        scales: {
          x: {
            ticks: { color: cssVar('--text-muted'), font: baseFont() },
            grid: { display: false },
          },
          y: {
            beginAtZero: true,
            ticks: { color: cssVar('--text-muted'), font: baseFont(), callback: (v) => `$${v}` },
            grid: { color: cssVar('--ink-border-soft') },
          },
        },
      },
    });
  }

  function destroyAll() {
    [pieChart, categoryChart, trendChart].forEach((c) => c && c.destroy());
    pieChart = null;
    categoryChart = null;
    trendChart = null;
  }

  return { renderPieChart, renderCategoryChart, renderTrendChart, destroyAll };
})();
