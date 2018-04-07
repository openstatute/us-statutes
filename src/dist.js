const execSeriesAsync = require('./libs/exec-series-async');

const outputPath = 'dist';

const cmdSeries = [
  `cd ${outputPath}`,
  'git add .',
  `git remote add origin https://${process.env.GH_TOKEN}@github.com/openstatute/us-statutes.git`,
  'git push origin production -f', // Push new Git history to remote repo
];

execSeriesAsync(cmdSeries)
  .then(() => {
    // eslint-disable-next-line
    console.log('Distributed. Done.');
  });
