'use strict'

const Sim = require('./sim')
const serialport = require('serialport')

serialport.list((err, ports) => {
  console.log(ports)

})

const sim = new Sim('/dev/cu.usbserial')

process.on('SIGINT', () => {
  console.log("Caught interrupt signal")
  sim.port.close(() => {
    process.exit()
  })
})

sim.on('open', () => {
  console.log('open')
  sim.greet()
})

sim.on('data', (data) => {
  console.log('sim data', data)
})
