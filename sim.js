'use strict'

const EventEmitter = require('events').EventEmitter
const serialport = require('serialport')
const SerialPort = serialport.SerialPort

const DEFAULT_BAUDRATE = 115200
const DEFAULT_LINEENDING = '\r'

module.exports = class Sim extends EventEmitter {
  constructor(portName, baudrate) {
    super()
    this.response = ''
    this.lineEnding = DEFAULT_LINEENDING
    this.port = new SerialPort(portName, {
      baudrate: baudrate || DEFAULT_BAUDRATE,
      parser: serialport.parsers.readline('\r'),
    })
    this.port.on('open', () => {
      // this.port.drain()
      this.port.flush(() => {
        this.emit('open')
      })
    })
    this.port.on('data', (data) => {
      console.log('sp data', data)
      // this.response += data.toString()
      // let sep
      // while ((sep = this.response.indexOf('\r')) !== -1) {
      //   this.emit('data', this.response.slice(0, sep))
      //   this.response = this.response.slice(sep + 1)
      // }
      this.emit('data', data.toString())
    })
    this.port.on('error', (err) => {
      this.emit('error', err)
    })
  }

  _wrap(command) {
    return command + this.lineEnding
  }

  greet() {
    this.port.write(this._wrap('AT+CPIN'), (err, sent) => {
      console.log('sent:', this._wrap('AT'), err, sent)
    })
  }
}
