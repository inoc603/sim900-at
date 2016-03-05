'use nodent-promise';
'use nodent-es7'
'use strict'

const Sim = require('./sim')
const serialport = require('serialport')
const sleep = require('./util').sleep

// serialport.list((err, ports) => {
//   console.log(ports)
//
// })


module.exports = async function main() {
  const sim = new Sim('/dev/ttyAMA0')

  sim.on('open', async () => {
    // console.log('open')
    var res = await sim.setEcho(false)
    console.log('set echo res', res)

    // res = await sim.getSignalQuality()
    // console.log('signal quality', res)

    // for (var i = 1; i < 7; i++) {
    //   res = await sim.readMsg(i)
    //   console.log('message', res)
    // }

    // res = await sim.readMsg(10)
    // console.log(res)

    res = await sim.checkTTS()


    // await sleep(1000)
    // console.log('cpin')
    // await sim.send('AT+CPIN?')
    // var res = await sim.test()
    // console.log(res)
  })

}



// process.on('SIGINT', () => {
//   console.log("Caught interrupt signal")
//   sim.port.close(() => {
//     process.exit()
//   })
// })


//
// sim.on('data', (data) => {
//   console.log('sim data', data, data.length)
// })
