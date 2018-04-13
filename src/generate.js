const glob = require('glob');
const path = require('path');
const matter = require('gray-matter');
const fs = require('fs-extra');

const execSeriesAsync = require('./libs/exec-series-async');

const outputPath = 'dist';

// options is optional
glob('data/**/*.md', null, (er, files) => {
  const commits = files
    .map((file) => {
      const fileName = path.basename(file);
      const date = fileName.replace('.md', '');
      const documentPath = file.replace(`/${fileName}`, '').replace('data/', '');

      return { date, documentPath };
    });

  commits
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const cmdSeries = [
    `rm -rf ${outputPath}`,
    `mkdir ${outputPath}`,
    `cd ${outputPath}`,
    'git init',
    'git checkout --orphan production',
  ];
  let p = execSeriesAsync(cmdSeries);

  commits.forEach((commit) => {
    p = p.then(() => {
      const t = commit.date.replace('-00-00', '-12-31').split('-');
      const epochDate = new Date('1970', '01', '01').toISOString();
      // Git only supports date > epoch
      const commitDate = t[0] > '1970' ? new Date(t[0], t[1], t[2]).toISOString() : epochDate;

      let authorName;
      let authorEmail;

      if (commit.documentPath.startsWith('alabama')) {
        authorName = 'Alabama Legislature';
        authorEmail = 'sitesupport@al-legislature.gov';
      } else {
        authorName = 'U.S Congress';
        authorEmail = 'email@congress.gov';
      }

      const committerName = 'Quang Lam';
      const committerEmail = 'quang.lam2807@gmail.com';

      const destDir = path.resolve(__dirname, '..', 'dist', commit.documentPath.replace(path.basename(commit.documentPath), ''));
      fs.ensureDirSync(destDir);

      const sourceMd = path.resolve(__dirname, '..', 'data', commit.documentPath, `${commit.date}.md`);
      const distMd = path.resolve(__dirname, '..', outputPath, `${commit.documentPath}.md`);
      const data = matter(fs.readFileSync(sourceMd, 'utf8'));
      fs.writeFileSync(distMd, data.content, 'utf8');

      let refs = '';
      if (data.data.changeRefs) {
        refs = 'References:\n';
        data.data.changeRefs.forEach((url) => {
          refs += '- ';
          refs += url;
          refs += '\n';
        });
      }

      const subCmdSeries = [
        `cd ${outputPath}`,
        `git config user.name "${authorName}"`,
        `git config user.email "${authorEmail}"`,
        'git add .',
        `GIT_COMMITTER_NAME="${committerName}" GIT_COMMITTER_EMAIL="${committerEmail}" GIT_AUTHOR_DATE="${commitDate}" GIT_COMMITTER_DATE="${commitDate}" git commit -m "${commit.documentPath} (${commit.date})

          ${data.data.changeTitle || ''}

          ${refs}
        "`,
      ];
      return execSeriesAsync(subCmdSeries);
    });
  });

  p = p
    .then(() => {
      // eslint-disable-next-line
      console.log('Generated. Done.');
    })
    .catch((err) => {
      console.log(err);
      process.exit(1);
    });
});
