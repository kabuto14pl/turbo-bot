import * as fs from 'fs';

export function generateEquityCurveHtml(curve: number[], outputPath: string) {
  const html = `
  <html>
    <head>
      <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
    </head>
    <body>
      <div id="equity"></div>
      <script>
        var data = [{ y: ${JSON.stringify(curve)}, type: 'scatter', name: 'Equity Curve' }];
        Plotly.newPlot('equity', data, { title: 'Equity Curve' });
      </script>
    </body>
  </html>
  `;
  fs.writeFileSync(outputPath, html, 'utf-8');
}
