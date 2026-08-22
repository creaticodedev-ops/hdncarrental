const filenameFromDisposition = (header) => {
  if (!header) return null
  const star = /filename\*=UTF-8''([^;]+)/i.exec(header)
  if (star?.[1]) {
    try {
      return decodeURIComponent(star[1])
    } catch {
      return star[1]
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(header)
  return plain?.[1] || null
}

export const downloadXlsx = async (axios, url, { params = {}, language = 'en', fallbackName = 'report.xlsx' } = {}) => {
  const response = await axios.get(url, {
    params: { ...params, lang: language },
    responseType: 'blob',
  })
  const contentType = String(response.headers['content-type'] || '')
  if (contentType.includes('application/json')) {
    const text = await response.data.text()
    let message = 'Export failed'
    try {
      message = JSON.parse(text).message || message
    } catch {
      /* ignore */
    }
    throw new Error(message)
  }
  const name = filenameFromDisposition(response.headers['content-disposition']) || fallbackName
  const blob = new Blob([response.data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = name
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(objectUrl)
  return name
}

export default downloadXlsx
