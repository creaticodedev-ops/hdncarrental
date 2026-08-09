import { BRAND_NAME } from '../constants/brand.js'

export const SITE_ORIGIN = 'https://hdncar.com'
export const SITE_NAME = BRAND_NAME

/** Public NAP — must stay consistent with Footer (no invented addresses). */
export const NAP = {
  legalName: BRAND_NAME,
  streetAddress: 'AB IBN BATTOUTA QUARTIER AZIB DERAI',
  addressLocality: 'Safi',
  addressCountry: 'MA',
  addressRegion: 'Marrakesh-Safi',
  postalCode: '',
  telephone: '+212661865184',
  telephoneDisplay: '+212 6 61 86 51 84',
  email: 'haddanecar@gmail.com',
  url: SITE_ORIGIN,
}

export const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/images/main_car.webp`

export const absoluteUrl = (path = '/') => {
  if (!path) return SITE_ORIGIN
  if (path.startsWith('http')) return path
  return `${SITE_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`
}
