'use nodent-promise';
'use nodent-es7'
'use strict'

module.exports.parseMsg = function parseMsg(msg) {
  return msg.match(/.{1,4}/g).map((s) => {
    return unescape('%' + s.slice(2))
  }).join('')
}

module.exports.sleep = async function sleep(ms) {
  return setTimeout(() => {}, ms)
}
