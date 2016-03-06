'use nodent-promise';
'use nodent-es7'
'use strict'

const EventEmitter = require('events').EventEmitter
const serialport = require('serialport')
const SerialPort = serialport.SerialPort
const promisify = require('es6-promisify')
const queue = require('queue')
const utils = require('./util')
const pdu = require('pdu')
const _ = require('lodash')
const debug = require('debug')('debug')

const DEFAULT_BAUDRATE = 115200
const DEFAULT_LINEENDING = '\r\n'

const EVENT_PATTERN = {
  NEW_MSG: /^\+CMTI: "SM",(\d+)$/,
  RING: /^RING$/,
}

const RESPONSE_PATTERN = {
  MSG_INFO: /^\+CMGR: "(\w+)", "(\d+)", "[0-9/:,+]"/
}

const HANDLERS = Object.create(null)

HANDLERS.NEW_MSG = async function recvNewMsg(response, cb) {
  let pos = EVENT_PATTERN.NEW_MSG.exec(response)[1]
  let msg = await this.readMsg(pos)
  if (_.has(msg, 'udh.parts') && _.has(msg, 'udh.current_part')) {
    debug('long message %d of %d', msg.udh.current_part, msg.udh.parts)
    const ref = msg.udh.reference_number
    this.tmpMsg[ref] = this.tmpMsg[ref] || []
    this.tmpMsg[ref][msg.udh.current_part - 1] = msg

    if (_.isNil(this.tmpMsgCount[ref]))
      this.tmpMsgCount[ref] = 1
    else
      this.tmpMsgCount[ref] += 1

    if (this.tmpMsgCount[ref] === msg.udh.parts) {
      debug('message complete')
      this.emit('message', this.tmpMsg[ref].reduce((wholeMsg, partMsg) => {
        if (_.isUndefined(wholeMsg))
          return partMsg
        wholeMsg.text += partMsg.text
        return wholeMsg
      }, undefined))
      delete this.tmpMsg[ref]
      delete this.tmpMsgCount[ref]
    }
  } else {
    this.emit('message', msg)
  }
  cb()
}

HANDLERS.RING = function hehe(response) {
  // console.log(EVENT_PATTERN.RING.exec(response))
  console.log('oh', response)
}

module.exports = class Sim extends EventEmitter {
  constructor(portName, baudrate) {
    super()
    this.response = ''
    this.res = []
    this.lineEnding = DEFAULT_LINEENDING
    this.handlers = Object.create(null)
    this.currentResponse = new EventEmitter()
    this.queue = queue()
    this.tmpMsg = Object.create(null)
    this.tmpMsgCount = Object.create(null)

    this.queue.on('error', (err) => {
      console.log('crap', err)
    })

    for (let event in HANDLERS) {
      this.handlers[event] = HANDLERS[event].bind(this)
    }

    this.port = new SerialPort(portName, {
      baudrate: baudrate || DEFAULT_BAUDRATE,
    })

    this.port.on('open', () => {
      this.port.flush(() => {
        this.emit('open')
      })
    })

    this.port.on('data', (data) => {
      this.response += data
      let sep
      while ((sep = this.response.indexOf(this.lineEnding)) !== -1) {
        if (sep > 0)
          this.emit('data', this.response.slice(0, sep))
        this.response = this.response.slice(sep + this.lineEnding.length)
      }
    })

    this.port.on('error', (err) => {
      this.emit('error', err)
    })

    this.on('data', (data) => {
      debug('sim data', data)
      let special = false
      for (const i in EVENT_PATTERN) {
        if (EVENT_PATTERN[i].test(data)) {
          this.handlers[i](data)
          special = true
          break
        }
      }
      if (!special) {
        this.res.push(data)
        if (data === 'OK' || data === 'ERROR') {
          this.currentResponse.emit('response', this.res)
          this.res = []
        }
      }
    })
  }

  send(cmd) {
    debug('send command:', cmd)
    return new Promise((resolve, reject) => {
      this.queue.push((cb) => {
        let resEmitter = new EventEmitter()
        resEmitter.on('response', resolve)
        this.currentResponse = resEmitter
        this.port.write(cmd + this.lineEnding, cb)
      })
      this.queue.start()
    })
  }

  greet() {
    this.send('AT')
  }

  async getSignalQuality() {
    let res = await this.send('AT+CSQ')
    return res
  }

  async setEcho(status) {
    let res = await this.send(`ATE${status ? '1' : '0'}`)
    if (res.length === 1 && res[0] === 'OK')
      return true
    else
      return false
  }

  async readMsg(pos) {
    await this.send('AT+CMGF=0')
    await this.send('AT+CSCS="UCS2"')
    await this.send('AT+CNMI=2,1')
    const res = await this.send(`AT+CMGR=${pos}`)
    let msg = pdu.parse(res[1])
    msg.text = msg.text.replace(/\u0000/g, '')
    return msg
  }

  async readFullMsg(pos) {
    let msg = await this.readMsg(pos)
    if (_.has(msg, 'udh.parts') && _.has(msg, 'udh.current_part')) {
      for (var i = 1; i <= msg.udh.parts - msg.udh.current_part; i++) {
        let nextMsg = await this.readMsg(parseInt(pos) + i)
        msg.text += nextMsg.text
      }
    }
    return msg
  }
}
