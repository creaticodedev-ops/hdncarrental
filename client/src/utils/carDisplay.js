/** Some catalog brands are stored with a trailing separator ("RENAULT -"). */
export const cleanBrand = (brand) => String(brand || '').replace(/\s*[-–—]+\s*$/, '').trim()

export const carDisplayName = (car) => `${cleanBrand(car?.brand)} ${car?.model || ''}`.replace(/\s+/g, ' ').trim()

/** Name + year, without repeating a year the model string already carries ("CLIO 5 (2026)"). */
export const carDisplayTitle = (car) => {
  const name = carDisplayName(car)
  const year = car?.year ? String(car.year) : ''
  if (!year || name.includes(year)) return name
  return `${name} ${year}`
}
