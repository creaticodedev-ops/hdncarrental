/** Public browse order for vehicle categories */
export const VEHICLE_CATEGORIES = [
  'Economy',
  'Compact',
  'Sedan',
  'SUV',
  'Luxury',
  'Van',
  'Pickup',
  'Sports',
  'Electric',
  'Other',
]

export const categorySortIndex = (category) => {
  const i = VEHICLE_CATEGORIES.findIndex(
    (c) => c.toLowerCase() === String(category || '').toLowerCase()
  )
  return i === -1 ? VEHICLE_CATEGORIES.length : i
}

export const groupCarsByCategory = (cars = []) => {
  const map = new Map()
  for (const car of cars) {
    const key = car.category || 'Other'
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(car)
  }
  return [...map.entries()]
    .sort(([a], [b]) => categorySortIndex(a) - categorySortIndex(b))
    .map(([category, items]) => ({
      category,
      cars: items.sort((x, y) => Number(x.pricePerDay) - Number(y.pricePerDay)),
    }))
}
