/* global describe it */
const assert = require('assert');
const fs = require('fs-extra');
const path = require('path');
const markdownToc = require('markdown-toc');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

describe('Alabama', () => {
  const alabamaPath = path.resolve(__dirname, '..', 'data', 'alabama');

  describe('Alabama Constitution is up-to-date', () => {
    it('The lastest amendment number in the data should be the same as the one retrieved from the website', () => {
      const constitutionPath = path.resolve(alabamaPath, 'constitution');
      const constitutionFileNames = fs.readdirSync(constitutionPath);

      // get content from the latest file
      const latestConstitutionPath = path.resolve(
        constitutionPath,
        constitutionFileNames[constitutionFileNames.length - 1],
      );
      const content = fs.readFileSync(latestConstitutionPath, 'utf8');

      // get the latest amendment number in the repo
      const toc = markdownToc(content).json;
      let localLatestAmendmentNumber = 0;
      toc.forEach((item) => {
        if (item.content.startsWith('Amendment')) {
          const num = parseInt(item.content.match(/\d+/)[0], 10);
          if (num > localLatestAmendmentNumber) localLatestAmendmentNumber = num;
        }
      });

      // get the latest amendment from Secretary of State's website
      const url = 'http://arc-sos.state.al.us/cgi/elactnum.mbr/output';
      console.log(`Retrieving ${url}`);
      let fetchedLatestAmendmentNumber = 0;
      return fetch(url)
        .then(res => res.text())
        .then((html) => {
          const $ = cheerio.load(html);

          $('tbody tr').each((i, tr) => {
            if ($(tr).find('.aiSosPageLinkBar').length > 0) return null;

            const amendmentNumber = $(tr).find('td').last().text()
              .trim();
            if (amendmentNumber.length === 3) { // 3-digit string
              const num = parseInt(amendmentNumber, 10);
              if (num > fetchedLatestAmendmentNumber) fetchedLatestAmendmentNumber = num;
            }
            return null;
          });
        })
        .then(() => {
          assert.equal(localLatestAmendmentNumber, fetchedLatestAmendmentNumber);
        });
    });
  });
});
