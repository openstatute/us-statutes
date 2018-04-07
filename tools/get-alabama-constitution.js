// This tool gets the 1901 Constitution and its amendment.
// There's a quirk: it doesn't retrieve the change history of constitution
// from Amendment 1 to 616 as there's no reliable online source

/* eslint-disable prefer-template */

const request = require('request');
const cachedRequest = require('cached-request')(request);
const fs = require('fs-extra');
const path = require('path');
const yaml = require('yaml-js');
const cheerio = require('cheerio');

const cacheDirectory = '/tmp/cache';
fs.ensureDirSync(cacheDirectory);
cachedRequest.setCacheDirectory(cacheDirectory);
const rp = url => new Promise((resolve, reject) => {
  const options = {
    url,
    ttl: 60 * 60 * 1000, // 1 hour
  };
  cachedRequest(options, (error, response, body) => {
    if (error) {
      return reject(error);
    }
    return resolve(body);
  });
});
const changes = {};

// Get amendments' ratified dates from Alabama Secretary of State website
let page = 0;
const getAmendmentRatifiedDates = () => {
  const url = `http://arc-sos.state.al.us/cgi/elactnum.mbr/output?s=${(page * 25) + 1}&order=act&hld=act&dir=descend&page=Y`;
  console.log(`Retrieving ${url}`);
  return rp(url)
    .then((html) => {
      const $ = cheerio.load(html);
      if ($('tbody tr').length < 2) return null;
      $('tbody tr').each((i, tr) => {
        if ($(tr).find('.aiSosPageLinkBar').length > 0) return null;

        const amendmentNumber = $(tr).find('td').last().text()
          .trim();
        if (amendmentNumber.length === 3) { // 3-digit string
          const arr = $(tr).find('td').toArray();
          const actNumber = $(arr[0]).text().trim();
          const electionDate = $(arr[1]).text().trim();
          const ballotType = $(arr[2]).text().trim();
          const proclamationRegister = $(arr[3]).text().trim();

          if (!changes[electionDate]) changes[electionDate] = [];
          changes[electionDate].push({
            actNumber,
            amendmentNumber: parseInt(amendmentNumber, 10),
            ballotType,
            proclamationRegister,
          });
        }
        return null;
      });

      console.log('Done');

      page += 1;
      return getAmendmentRatifiedDates();
    });
};

// Get constitution content
const contents = [];

const getContent = url =>
  rp(url)
    .then((html) => {
      const $ = cheerio.load(html);
      let result = '';

      $('body').children().each((i, child) => {
        const t = $(child).text().trim();
        if (t.length < 1) return;
        if (child.tagName === 'h4') {
          if (result.length > 0) result += '\n\n';
          result += `**${t}**`;
        }
        if (child.tagName === 'p') {
          if (result.length > 0) result += '\n\n';
          result += `${t}`;
        }
      });

      console.log('Done');
      return result;
    });

const getConstitutionContents = () =>
  // get toc
  rp('http://alisondb.legislature.state.al.us/alison/codeofalabama/constitution/1901/toc.htm')
    .then((html) => {
      let p = Promise.resolve();

      const $ = cheerio.load(html);
      $('body').children().each((i, child) => {
        const t = $(child).text().trim();
        const contentPath = $(child).find('a').first().attr('href');
        const shortTitle = $(child).find('a').first().text();

        // special case
        if (t.length < 1) return;
        if (t.includes('Section 284.01')) return;
        if (contentPath === 'CA-245578.htm') return;
        if (contentPath === 'CA-245842.htm') return;

        let type;
        let title;
        if (t === 'Constitution Of Alabama 1901') {
          type = 1;
          title = 'Constitution of the State of Alabama';
        // special case
        } else if (['Article Municipal Corporations.', 'Article Private Corporations.', 'Article Railroads and Canals.'].indexOf(t) > -1) {
          type = 3;
          title = t.substr(8);
        } else if (t.startsWith('Article')) {
          type = 2;
          title = t;
        } else if (t.startsWith('Amendment')) {
          type = 2;
          title = shortTitle || t;
        } else {
          type = 6;
          title = shortTitle || t;
        }

        const placeholder = { type, title };
        contents.push(placeholder);

        if (contentPath) {
          p = p
            .then(() => {
              console.log(`Retrieving ${contentPath}`);
              return getContent(`http://alisondb.legislature.state.al.us/alison/codeofalabama/constitution/1901/${contentPath}`);
            })
            .then((content) => {
              placeholder.content = content;
            });
        }
      });

      return p;
    });

const generateConstitution = (lastAmendment, frontMatterObj) => {
  let md = '';
  let lastOneHasContent = false;
  contents.every((c) => {
    if (c.title.startsWith('Amendment')) {
      const amendmentNum = parseInt(c.title.match(/\d+/)[0], 10);
      if (amendmentNum > lastAmendment) return false;
    }
    if (md.length > 0) md += '\n';
    if (lastOneHasContent) {
      md += '\n';
    }
    for (let i = 0; i < c.type; i += 1) { md += '#'; }
    md += ' ';
    md += c.title;
    if (c.content) {
      lastOneHasContent = true;
      md += '\n';
      md += c.content;
    } else {
      lastOneHasContent = false;
    }
    return true;
  });

  if (frontMatterObj) md = '---\n' + yaml.dump(frontMatterObj) + '---\n' + md;

  return md;
};

const getLastAmendmentNumber = (arr) => {
  let result = 0;
  arr.forEach((item) => {
    if (item.amendmentNumber > result) {
      result = item.amendmentNumber;
    }
  });
  return result;
};

const formatDate = (date) => {
  const d = new Date(date);
  let month = '' + (d.getMonth() + 1);
  let day = '' + d.getDate();
  const year = d.getFullYear();

  if (month.length < 2) month = '0' + month;
  if (day.length < 2) day = '0' + day;

  return [year, month, day].join('-');
};

getAmendmentRatifiedDates()
  .then(() => getConstitutionContents())
  .then(() => {
    // generate original constitution without amendments
    const filePath = path.resolve(__dirname, '..', 'data', 'alabama', 'constitution', '1901-11-28.md');
    const frontMatterObj = {
      changeTitle: 'Constitution 1901',
      changeRefs: ['http://alisondb.legislature.state.al.us/alison/codeofalabama/constitution/1901/CA-245842.htm'],
    };
    return fs.writeFile(filePath, generateConstitution(0, frontMatterObj), 'utf8');
  })
  .then(() => {
    // generate changes
    const p = Object.keys(changes).map((electionDate) => {
      const arr = changes[electionDate];
      const lastAmendment = getLastAmendmentNumber(arr);
      let changeTitle = 'Constitution 1901. ';
      arr.forEach((item) => { changeTitle += `Amendment ${item.amendmentNumber} (${item.actNumber}); `; });
      const changeRefs = [
        'http://alisondb.legislature.state.al.us/alison/codeofalabama/constitution/1901/toc.htm',
        'http://arc-sos.state.al.us/cgi/elactnum.mbr/output',
      ];
      const frontMatterObj = { changeTitle, changeRefs };
      const filePath = path.resolve(__dirname, '..', 'data', 'alabama', 'constitution', formatDate(electionDate) + '.md');
      return fs.writeFileSync(filePath, generateConstitution(lastAmendment, frontMatterObj), 'utf8');
    });

    return Promise.all(p);
  })
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });
