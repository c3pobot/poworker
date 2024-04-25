'use strict'
const log = require('logger')
const rabbitmq = require('src/helpers/rabbitmq')
const cmdProcessor = require('./cmdProcessor')
let QUE_NAME = process.env.WORKER_QUE_NAME_SPACE || 'default', POD_NAME = process.env.POD_NAME || 'po-worker', consumer, publisher, publisherReady
QUE_NAME += `.worker.arena`

const clearQue = async()=>{
  return await rabbitmq.queueDelete(QUE_NAME)
}
const processCmd = async(obj = {})=>{
  try{
    await cmdProcessor(obj)
    return 1
  }catch(e){
    log.error(e)
    return 1
  }
}
const startConsumer = async()=>{
  if(consumer) await consumer.close()
  consumer = rabbitmq.createConsumer({ consumerTag: POD_NAME, concurrency: 1, qos: { prefetchCount: 1 }, queue: QUE_NAME, queueOptions: { durable: true, arguments: { 'x-queue-type': 'quorum', 'x-message-ttl': 600000  } } }, processCmd)
  consumer.on('error', (err)=>{
    log.info(err)
  })
  consumer.on('ready', ()=>{
    log.info(`${POD_NAME} arena consumer created...`)
  })
  return true
}
module.exports.startConsumer = startConsumer
module.exports.startProducer = async()=>{
  let status = await clearQue()
  log.info(status)
  publisher = rabbitmq.createPublisher({ confirm: true, queues: [{ queue: QUE_NAME, durable: true, arguments: { 'x-queue-type': 'quorum', 'x-message-ttl': 600000 } }]})
  log.info(`${POD_NAME} arena publisher started...`)
  publisherReady = true
  return true
}
module.exports.send = async(payload = {})=>{
  if(!publisherReady) return
  await publisher.send(QUE_NAME, payload )
  return true
}
module.exports.restartConsumer = async(data)=>{
  if(!data || data?.set !== 'po-worker' || data?.cmd !== 'restart') return
  log.info(`${POD_NAME} received a consumer restart cmd...`)
  startConsumer()
}
