import logo from "./logo.webp";
import gmail_logo from "./gmail_logo.svg";
import facebook_logo from "./facebook_logo.svg";
import instagram_logo from "./instagram_logo.svg";
import twitter_logo from "./twitter_logo.svg";
import menu_icon from "./menu_icon.svg";
import search_icon from "./search_icon.svg"
import close_icon from "./close_icon.svg"
import users_icon from "./users_icon.svg"
import car_icon from "./car_icon.svg"
import location_icon from "./location_icon.svg"
import fuel_icon from "./fuel_icon.svg"
import addIcon from "./addIcon.svg"
import carIcon from "./carIcon.svg"
import carIconColored from "./carIconColored.svg"
import dashboardIcon from "./dashboardIcon.svg"
import dashboardIconColored from "./dashboardIconColored.svg"
import addIconColored from "./addIconColored.svg"
import listIcon from "./listIcon.svg"
import listIconColored from "./listIconColored.svg"
import cautionIconColored from "./cautionIconColored.svg"
import arrow_icon from "./arrow_icon.svg"
import star_icon from "./star_icon.svg"
import check_icon from "./check_icon.svg"
import tick_icon from "./tick_icon.svg"
import delete_icon from "./delete_icon.svg"
import eye_icon from "./eye_icon.svg"
import eye_close_icon from "./eye_close_icon.svg"
import filter_icon from "./filter_icon.svg"
import edit_icon from "./edit_icon.svg"
import calendar_icon_colored from "./calendar_icon_colored.svg"
import location_icon_colored from "./location_icon_colored.svg"
import banner_car_image from "./banner_car_image.webp"
import upload_icon from "./upload_icon.svg"
import car_image1 from "./car_image1.webp"
import car_image2 from "./car_image2.webp"
import car_image3 from "./car_image3.webp"
import car_image4 from "./car_image4.webp"

/** Stable public URL for LCP preload (unhashed). Prefer over bundled assets on hero. */
export const HERO_IMAGE = {
  webp: '/images/main_car.webp',
}

export const assets = {
    logo,
    gmail_logo,
    facebook_logo,
    instagram_logo,
    twitter_logo,
    menu_icon,
    search_icon,
    close_icon,
    users_icon,
    edit_icon,
    car_icon,
    location_icon,
    fuel_icon,
    addIcon,
    carIcon,
    carIconColored,
    dashboardIcon,
    dashboardIconColored,
    addIconColored,
    listIcon,
    listIconColored,
    cautionIconColored,
    calendar_icon_colored,
    location_icon_colored,
    arrow_icon,
    star_icon,
    check_icon,
    tick_icon,
    delete_icon,
    eye_icon,
    eye_close_icon,
    filter_icon,
    banner_car_image,
    car_image1,
    car_image2,
    car_image3,
    car_image4,
    upload_icon,
}

export const menuLinks = [
    { name: "Home", path: "/" },
    { name: "Cars", path: "/cars" },
    { name: "Locations", path: "/location-voiture-maroc" },
    { name: "Contact", path: "/contact" },
]

/** Admin sidebar: professional IA (permissions + paths unchanged). */
export const ownerNavGroups = [
    {
        id: 'main',
        labelKey: 'admin.menuGroups.main',
        items: [
            { nameKey: "admin.menu.dashboard", path: "/owner", iconId: 'dashboard', permission: "dashboard" },
        ],
    },
    {
        id: 'operations',
        labelKey: 'admin.menuGroups.operations',
        items: [
            { nameKey: "admin.menu.reservations", path: "/owner/manage-bookings", iconId: 'reservations', permission: "bookings" },
            { nameKey: "admin.menu.walkIn", path: "/owner/walk-in", iconId: 'walkIn', permission: "bookings" },
            { nameKey: "admin.menu.calendar", path: "/owner/calendar", iconId: 'calendar', permission: "calendar" },
            { nameKey: "admin.menu.customers", path: "/owner/customers", iconId: 'customers', permission: "customers" },
            { nameKey: "admin.menu.fleet", path: "/owner/manage-cars", iconId: 'cars', permission: "fleet" },
            { nameKey: "admin.menu.addCar", path: "/owner/add-car", iconId: 'add', permission: "fleet" },
            { nameKey: "admin.menu.catalogOrder", path: "/owner/catalog-order", iconId: 'catalog', permission: "fleet" },
            { nameKey: "admin.menu.vehicleStats", path: "/owner/vehicle-stats", iconId: 'stats', permission: "fleet" },
            { nameKey: "admin.menu.chauffeurs", path: "/owner/chauffeurs", iconId: 'chauffeurs', permission: "chauffeurs" },
            { nameKey: "admin.menu.maintenance", path: "/owner/maintenance", iconId: 'maintenance', permission: "maintenance" },
            { nameKey: "admin.menu.locations", path: "/owner/locations", iconId: 'locations', permission: "locations" },
        ],
    },
    {
        id: 'partners',
        labelKey: 'admin.menuGroups.partners',
        items: [
            { nameKey: "admin.menu.samsars", path: "/owner/samsars", iconId: 'partners', permission: "partners" },
            { nameKey: "admin.menu.partnerCompanies", path: "/owner/partner-companies", iconId: 'company', permission: "partners" },
        ],
    },
    {
        id: 'finance',
        labelKey: 'admin.menuGroups.finance',
        items: [
            { nameKey: "admin.menu.accountingOverview", path: "/owner/accounting", iconId: 'accounting', permission: "accounting" },
            { nameKey: "admin.menu.revenues", path: "/owner/accounting/revenues", iconId: 'revenue', permission: "accounting" },
            { nameKey: "admin.menu.samsarPayments", path: "/owner/accounting/samsar-payments", iconId: 'expense', permission: "accounting" },
            { nameKey: "admin.menu.agencyExpenses", path: "/owner/accounting/agency-expenses", iconId: 'expense', permission: "accounting" },
            { nameKey: "admin.menu.vehicleExpenses", path: "/owner/accounting/vehicle-expenses", iconId: 'expense', permission: "accounting" },
        ],
    },
    {
        id: 'documents',
        labelKey: 'admin.menuGroups.documents',
        items: [
            { nameKey: "admin.menu.contracts", path: "/owner/contracts", iconId: 'contracts', permission: "contracts" },
            { nameKey: "admin.menu.signatureRequests", path: "/owner/signature-requests", iconId: 'signature', permission: "bookings" },
            { nameKey: "admin.menu.invoices", path: "/owner/invoices", iconId: 'invoices', permission: "contracts" },
            { nameKey: "admin.menu.templates", path: "/owner/templates", iconId: 'templates', permission: "templates" },
        ],
    },
    {
        id: 'insights',
        labelKey: 'admin.menuGroups.insights',
        items: [
            { nameKey: "admin.menu.analytics", path: "/owner/analytics", iconId: 'analytics', permission: "analytics" },
            { nameKey: "admin.menu.reports", path: "/owner/reports", iconId: 'reports', permission: "reports" },
            { nameKey: "admin.menu.audit", path: "/owner/audit", iconId: 'audit', permission: "audit" },
        ],
    },
    {
        id: 'settings',
        labelKey: 'admin.menuGroups.settings',
        pinBottom: true,
        items: [
            { nameKey: "admin.menu.settings", path: "/owner/settings", iconId: 'settings' },
        ],
    },
]

/** Flat list for any legacy consumers — same items/permissions as before. */
export const ownerMenuLinks = ownerNavGroups.flatMap((group) => group.items)
