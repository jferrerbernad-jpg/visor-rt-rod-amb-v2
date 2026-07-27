(function () {
  function waitForEcharts(cb) {
    if (typeof echarts !== 'undefined') { cb(); return; }
    let tries = 0;
    const id = setInterval(() => {
      tries++;
      if (typeof echarts !== 'undefined') { clearInterval(id); cb(); return; }
      if (tries > 100) { clearInterval(id); console.warn('kpi: ECharts no ha carregat.'); }
    }, 100);
  }

  function initKpi() {
    const container = document.getElementById('kpi-alerts');
    if (!container) { console.warn('kpi: #kpi-alerts no trobat.'); return; }

    const chart = echarts.init(container, null, {
      width:  container.offsetWidth  || 260,
      height: container.offsetHeight || 160,
    });

    chart.setOption({
      textStyle: { fontFamily: 'IBM Plex Sans, Arial, sans-serif', color: '#2a3a55', fontSize: 12 },
      title: {
        text: 'Alertes per afectació',
        left: 'center', top: 4,
        textStyle: { fontSize: 11, color: '#8a9bb8', fontWeight: 600 },
      },
      grid: { left: 8, right: 40, top: 26, bottom: 8, containLabel: true },
      tooltip: { trigger: 'item', formatter: '{b}: {c}' },
      xAxis: {
        type: 'value',
        min: 0,
        minInterval: 1,
        axisLine:  { show: false },
        axisTick:  { show: false },
        splitLine: { lineStyle: { color: '#f0f2f7' } },
        axisLabel: {
          show: true,
          fontSize: 10,
          color: '#8a9bb8',
          formatter: val => Number.isInteger(val) ? val : '',
        },
      },
      yAxis: {
        type: 'category',
        data: [],
        inverse: false,
        axisLine:  { show: false },
        axisTick:  { show: false },
        axisLabel: {
          show: true,
          fontSize: 10,
          color: '#2a3a55',
          width: 130,
          overflow: 'truncate',
          ellipsis: '…',
          interval: 0,
        },
      },
      series: [{
        type: 'bar',
        data: [],
        barMaxWidth: 18,
        itemStyle: { borderRadius: [0, 3, 3, 0] },
        label: {
          show: false},
        emphasis: { itemStyle: { opacity: 0.8 } },
      }],
    });

    new ResizeObserver(() => {
      requestAnimationFrame(() => {
        setTimeout(() => {
          try {
            chart.resize({
              width: container.offsetWidth,
              height: container.offsetHeight,
            });
          } catch (_) {}
        }, 150);
      });
    }).observe(container);

    window.addEventListener('resize', () => {
      requestAnimationFrame(() => {
        setTimeout(() => {
          try {
            chart.resize({
              width: container.offsetWidth,
              height: container.offsetHeight,
            });
          } catch (_) {}
        }, 150);
      });
    });

    window.updateKpiAlerts = function ({ counts = {}, title } = {}) {
      // Ordenar de més a menys
      const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      if (!entries.length) {
        chart.setOption({
          title:  { text: title ?? 'Alertes per afectació' },
          yAxis:  { data: ['Sense dades'] },
          series: [{ data: [{ value: 0, itemStyle: { color: '#d1d5db' } }] }],
        }, { notMerge: false });
        container.style.height = '120px';
        requestAnimationFrame(() => { try { chart.resize(); } catch (_) {} });
        return;
      }

      const values  = entries.map(([k, v]) => ({
        value: v,
        itemStyle: { color: typeof colorEfecto === 'function' ? colorEfecto(k) : '#4e79c5' },
      }));

      // Alçada dinàmica: ~28px per barra + marges
      const barCount = entries.length || 1;
      const newH     = Math.max(100, barCount * 25 + 46);
      container.style.height = newH + 'px';

      chart.setOption({
        title:  { text: title ?? 'Alertes per afectació' },
        yAxis:  { data: entries.map(([k]) => typeof labelEfecto === 'function' ? labelEfecto(k) : k) },
        series: [{ data: values }],
      }, { notMerge: false });

      requestAnimationFrame(() => {
      setTimeout(() => {
        try {
          chart.resize({
            width: container.offsetWidth,
            height: container.offsetHeight,
          });
        } catch (_) {}
      }, 150);
    });
    };

    document.addEventListener('langchange', () => {
      chart.setOption({
        title: { text: typeof t === 'function' ? (t('kpiTitle') || 'Alertes per afectació') : 'Alertes per afectació' },
      });
    });

    if (window.__latestAlertCounts__) {
      window.updateKpiAlerts({ counts: window.__latestAlertCounts__ });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => waitForEcharts(initKpi));
  } else {
    waitForEcharts(initKpi);
  }
})();