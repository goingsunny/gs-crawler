const Crawler = require('crawler');
const url = require('url');
const axios = require('axios');
const sanitize = require('sanitize-html');
const targetEndpoint = process.argv[2] || '';
const startUrl = process.argv[3];
const includePattern = process.argv[4] || '';

const urlParse = url.parse(startUrl);
const host = url.format({ protocol: urlParse.protocol, hostname: urlParse.hostname });
const checkedList = {};

const addLinksToQueue = ($) => {
  const links = $('a');
  $(links).each((i, item) => {
    const link = $(item).attr('href');
    if (!link) {
      return;
    }

    if (link.indexOf(includePattern) >= 0 && !checkedList[link]) {
      if (link.startsWith('/')) {
        c.queue(`${host}${link}`);
      } else {
        c.queue(link);
      }
    }

    checkedList[link] = true;
  });
}

const parseData = $ => {
  const scope = 'article';
  const article = sanitize($(scope).html());
  const title = $(`${scope} h1.hTitle`).text() || '---';
  $(`${scope} h1.hTitle`).remove();
  $(`${scope} input`).remove();
  const question = sanitize($(`${scope} .tip .inner`).html());
  $(`${scope} .tip.qbox`).remove();
  const tip = sanitize($(`${scope} .tip .inner`).html());
  $(`${scope} .tip`).remove();
  $(`${scope} script`).remove();
  $(`${scope} h3`).remove();
  $(`${scope} ins`).remove();
  const sample = sanitize($(scope).html());

  return {
    title,
    tip,
    attach: '',
    question,
    modelAnswer: sample,
    article,
  };
};

let count = 0;
const c = new Crawler({  
  maxConnection: 10,
  drain: () => null,
  callback: (error, res, done) => {
    const href = res.request.uri.href;

    if (error) {
      throw new Error(error);
    }
    
    const $ = res.$;
    addLinksToQueue($);
    
    count += 1;
    const data = parseData($);
    console.log('checking', count, href, data);
    axios.post(targetEndpoint, {
      ...data,
      source: href,
    })
    .then(() => {
      console.log('done', count);
      done();
    })
    .catch((err) => {
      console.log('err', count, err.data);
      done();
    });
  },
});

c.on('drain', () => {
  console.log('Done', );
});

c.queue(startUrl);
