'use strict'
const log = require('logger')
const Queue = require('bull')

const cmdProcessor = require('./cmdProcessor')
const processLocalQue = require('./processLocalQue')


const QUE_NAME = process.env.CMD_QUE_NAME || 'shardQue'
const NUM_JOBS = +process.env.NUM_JOBS || 1

const que = new Queue(QUE_NAME, {
  redis: {
    host: process.env.REDIS_SERVER,
    port: +process.env.REDIS_PORT,
    password: process.env.REDIS_PASS
  },
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: true,
    timeout: 120000,
    attempts: 1
  },
  settings: {
    maxStalledCount: 0
  }
})
module.exports.createListeners = ()=>{
  try{
    require('./createListeners')(que)
  }catch(e){
    throw(e)
  }
}
module.exports.newJob = async(data = {}, jobOpts = {})=>{
  try{
    await que.clean(10000, 'failed');
    return await que.add(data, jobOpts)
  }catch(e){
    throw(e)
  }
}
module.exports.getJobs = async()=>{
  try{
    return await que.getJobs()
  }catch(e){
    throw(e)
  }
}
module.exports.getJob = async(jobId)=>{
  try{
    if(!jobId) return
    return await que.getJob(jobId)
  }catch(e){
    throw(e)
  }
}
module.exports.removeJob = async(jobId)=>{
  try{
    let job = await que.getJob(jobId)
    if(job){
      await job.moveToCompleted(null, true, true)
      await job.remove()
    }
  }catch(e){
    return
  }
}
module.exports.start = async()=>{
  try{
    await processLocalQue()
    que.process('*', +NUM_JOBS, cmdProcessor)
    log.info(`Started processing ${QUE_NAME} with ${NUM_JOBS} workers`)
  }catch(e){
    throw(e)
  }
}
