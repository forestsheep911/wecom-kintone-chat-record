const axios = require('axios')
const FormData = require('form-data')
const path = require('path')
const fs = require('fs')
const logger = require('./logger')

const handleError = (error) => {
  if (error.response && error.response.data && error.response.data.message) {
    throw new Error(error.response.data.message)
  }
  throw error
}

const getFileKeys = (template, key) => {
  if (!template.has(key)) template.set(key, { jsType: key, fileKeys: [] })
  return template.get(key).fileKeys
}

module.exports = class Client {
  constructor(host, username, password) {
    this.instance = axios.create({
      baseURL: `https://${host}`,
      timeout: 10000,
      headers: {
        'X-Cybozu-Authorization': Buffer.from(`${username}:${password}`).toString('base64'),
      },
    })
  }

  async upload(files, types) {
    let list = []
    types.forEach((key) => {
      list = list.concat(
        files.map((file) => {
          return {
            path: file,
            name: path.basename(file),
            type: path.extname(file).slice(1) === 'js' ? key : `${key}_CSS`,
          }
        }),
      )
    })

    const responses = await Promise.all(
      list.map((file) => {
        const fd = new FormData()
        fd.append('file', fs.readFileSync(file.path), file.name)
        const config = {
          headers: {
            'Content-Type': fd.getHeaders()['content-type'],
          },
        }
        return this.instance.post('/k/v1/file.json', fd, config)
      }),
    )
    return responses.map((response, index) => {
      return {
        type: list[index].type,
        name: list[index].name,
        contentId: response.data.fileKey,
      }
    })
  }

  async customizeLinks(appid, urls, cover) {
    try {
      if (urls.length === 0) {
        logger.warn('URL not found')
        return
      }
      const arr = urls.map((url) => {
        return { types: new Set(cover), contentUrl: url }
      })
      const cb = (scripts) => {
        const template = new Map()
        scripts.forEach((file) => {
          const fileKeys = getFileKeys(template, file.type)
          if (file.locationType === 'URL') {
            const index = arr.findIndex((el) => el.contentUrl === file.contentUrl)
            if (index !== -1) {
              arr[index].types.delete(file.type)
              if (arr[index].types.size === 0) arr.splice(index, 1)
            }
          }
          fileKeys.push(file.locationType === 'URL' ? file.contentUrl : file.contentId)
        })
        if (arr.length === 0) return undefined
        arr.forEach((url) => url.types.forEach((value) => getFileKeys(template, value).push(url.contentUrl)))
        return Array.from(template.values())
      }
      await this.customize(appid, cb)
    } catch (err) {
      handleError(err)
    }
  }

  async customizeFiles(appid, files, cover) {
    try {
      if (files.length === 0) {
        logger.warn('File not found')
        return
      }
      const arr = await this.upload(files, cover)
      const cb = (scripts) => {
        const template = new Map()
        scripts.forEach((file) => {
          let contentId
          const fileKeys = getFileKeys(template, file.type)
          if (file.locationType === 'BLOB') {
            const index = arr.findIndex((el) => el.name === file.name && el.type === file.type)
            if (index !== -1) {
              contentId = arr[index].contentId
              arr.splice(index, 1)
            }
          }
          fileKeys.push(file.locationType === 'BLOB' ? contentId || file.contentId : file.contentUrl)
        })
        arr.forEach((file) => getFileKeys(template, file.type).push(file.contentId))
        return Array.from(template.values())
      }
      await this.customize(appid, cb)
    } catch (err) {
      handleError(err)
    }
  }

  async customize(appid, callback) {
    const settings = await this.instance.post('/k/api/js/get.json', { app: appid })
    const jsFiles = callback(settings.data.result.scripts)
    if (jsFiles) {
      const app = await this.instance.get(`/k/v1/app.json?id=${appid}`)
      const body = {
        jsScope: settings.data.result.scope,
        id: appid,
        name: app.data.name,
        jsFiles,
      }
      await this.instance.post('/k/api/dev/app/update.json', body)
      const result = await this.instance.post('/k/api/dev/app/deploy.json', {
        app: appid,
      })
      if (result.data.success) return logger.info(`The configuration has been updated to ${app.data.name}`)
    }
    return logger.info('No need to update!')
  }
}
