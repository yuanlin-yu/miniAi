// 获取文件完整路径
function getFullPath(filename) {
  return `${wx.env.USER_DATA_PATH}/${filename}_memory`
}

/**
 * 写入文件（增）
 * @param {string} filename - 文件名
 * @param {string} content - 要写入的内容
 * @param {string} encoding - 编码格式，默认utf-8
 * @return {Promise} 返回Promise对象
 */
 export function writeFile(filename, content, encoding = 'utf-8') {
  const filePath = getFullPath(filename)
  return new Promise((resolve, reject) => {
    wx.getFileSystemManager().writeFile({
      filePath: filePath,
      data: content,
      encoding: encoding,
      success: res => resolve(res),
      fail: err => reject(err)
    })
  })
}

/**
 * 读取文件（查）
 * @param {string} filename - 文件名
 * @param {string} encoding - 编码格式，默认utf-8
 * @return {Promise} 返回Promise对象，resolve时返回文件内容
 */
export function readFile(filename, encoding = 'utf-8') {
  const filePath = getFullPath(filename)
  return new Promise((resolve, reject) => {
    wx.getFileSystemManager().readFile({
      filePath: filePath,
      encoding: encoding,
      success: res => resolve(res.data),
      fail: err => reject(err)
    })
  })
}

/**
 * 删除文件（删）
 * @param {string} filename - 文件名
 * @return {Promise} 返回Promise对象
 */
export function deleteFile(filename) {
  const filePath = getFullPath(filename)
  return new Promise((resolve, reject) => {
    wx.getFileSystemManager().unlink({
      filePath: filePath,
      success: res => resolve(res),
      fail: err => reject(err)
    })
  })
}

/**
 * 追加文件内容（改）
 * @param {string} filename - 文件名
 * @param {string} content - 要追加的内容
 * @param {string} encoding - 编码格式，默认utf-8
 * @return {Promise} 返回Promise对象
 */
export function appendFile(filename, content, encoding = 'utf-8') {
  const filePath = getFullPath(filename)
  return new Promise((resolve, reject) => {
    wx.getFileSystemManager().appendFile({
      filePath: filePath,
      data: content,
      encoding: encoding,
      success: res => resolve(res),
      fail: err => reject(err)
    })
  })
}

/**
 * 重命名文件（改）
 * @param {string} oldName - 原文件名
 * @param {string} newName - 新文件名
 * @return {Promise} 返回Promise对象
 */
export function renameFile(oldName, newName) {
  const oldPath = getFullPath(oldName)
  const newPath = getFullPath(newName)
  return new Promise((resolve, reject) => {
    wx.getFileSystemManager().rename({
      oldPath: oldPath,
      newPath: newPath,
      success: res => resolve(res),
      fail: err => reject(err)
    })
  })
}

/**
 * 检查文件是否存在
 * @param {string} filename - 文件名
 * @return {Promise} 返回Promise对象，resolve时表示存在，reject时表示不存在
 */
export function checkFileExist(filename) {
  const filePath = getFullPath(filename)
  return new Promise((resolve, reject) => {
    wx.getFileSystemManager().access({
      path: filePath,
      success: () => resolve(true),
      fail: () => reject(false)
    })
  })
}

/**
 * 获取文件信息
 * @param {string} filename - 文件名
 * @return {Promise} 返回Promise对象，resolve时返回文件信息
 */
export function getFileInfo(filename) {
  const filePath = getFullPath(filename)
  return new Promise((resolve, reject) => {
    wx.getFileSystemManager().stat({
      path: filePath,
      success: res => resolve(res.stats),
      fail: err => reject(err)
    })
  })
}