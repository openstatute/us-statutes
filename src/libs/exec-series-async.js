const { exec } = require('child_process');

const execSeriesAsync = (series) => {
  const cmd = series.join(' && ');
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(stderr));
        return;
      }

      resolve(stdout);
    });
  });
};

module.exports = execSeriesAsync;
