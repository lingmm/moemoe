const _ = require('lodash');
const path = require('path');
const jieba = require('nodejieba');
const fs = require('fs-extra');
const cheerio = require('cheerio');
const probe = require('probe-image-size');
const Promise = require('bluebird');
const HighlightJS = require('highlight.js');
const DataURI = require('datauri');
const { SITE_CONFIG } = require('./config');
const { h } = require('./util');

const marked = Promise.promisify(require('marked'));

function extractKeywords(post, topN = 5) {
    return _.map(jieba.extract(post.content, topN), 'word');
}

function getSize(filename) {
    return probe.sync(fs.readFileSync(filename));
}

const renderer = new marked.Renderer();
renderer._image = renderer.image;

marked.setOptions(
    _.assign({
        highlight: function (code, lang) {
            return HighlightJS.highlightAuto(code).value;
        },
        renderer
    }, SITE_CONFIG.get('marked', {})));

async function markdown(text, url, dir, override) {
    renderer.image = function (src, title, alt) {
        if (src.startsWith('//') || /https?:\/\//i.test(src)) {
            return this._image(src, title, alt);
        } else {
            const full = path.join(dir, src);
            if (SITE_CONFIG.convertToDataURI && fs.existsSync(full)) {
                const uri = new DataURI(full);
                return h('img', { src: uri.content , alt, title });
            } else {
                let result;
                if (fs.existsSync(full) && (result = getSize(full))) {
                    return h('img', {
                        src: url + src,
                        alt,
                        title,
                        style: `width: ${result.width}${result.wUnits};height: ${result.height}${result.hUnits};`
                    });
                } else {
                    return this._image(url + src, title, alt);
                }
            }
        }
    }
    return marked(text, override);
}

module.exports = {
    extractKeywords,
    markdown,
    getSize
};