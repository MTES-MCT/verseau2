import { Chart, type Plugin } from 'chart.js';

const xPositions = new WeakMap<Chart, number>();

export const verticalLinePlugin: Plugin<'line'> = {
  id: 'verticalLine',
  afterEvent(chart, args) {
    if (args.event.type !== 'mousemove') {
      return;
    }
    xPositions.set(chart, args.event.x ?? 0);
  },
  afterDraw(chart) {
    const x = xPositions.get(chart);
    if (x == null) {
      return;
    }
    const ctx = chart.ctx;
    const topY = chart.scales.y.top;
    const bottomY = chart.scales.y.bottom;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, topY);
    ctx.lineTo(x, bottomY);
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#999';
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.restore();
  },
};
