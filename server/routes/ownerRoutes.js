import express from "express";
import { protect } from "../middleware/auth.js";
import { requireOwner } from "../middleware/ownerAuth.js";
import { requirePermission } from "../middleware/requirePermission.js";
import upload, { handleMulterError } from "../middleware/multer.js";
import {
  addCar,
  deleteCar,
  getAdminOverview,
  getCustomers,
  getDashboardData,
  getOwnerCarById,
  getOwnerCars,
  getVehicleStats,
  toggleCarAvailability,
  updateCar,
  updateUserImage,
} from "../controllers/ownerController.js";
import {
  addCustomerNote,
  getAuditLogs,
  getCrmCustomerDetail,
  getCrmCustomers,
  getNotifications,
  getOpsDashboard,
  getRevenueAnalytics,
  globalSearch,
  markNotificationRead,
  rateCustomer,
  updateCustomerStatus,
} from "../controllers/adminOpsController.js";
import {
  exportReportXlsx,
  exportAccountingXlsx,
  exportMaintenanceXlsx,
  exportVehicleStatsXlsx,
  exportCustomersXlsx,
} from "../controllers/xlsxExportController.js";
import {
  getFleetMaintenance,
  updateCarMaintenance,
  listMaintenanceRecords,
  createMaintenanceRecord,
  updateMaintenanceRecord,
  deleteMaintenanceRecord,
  getMaintenanceCalendar,
  getMaintenanceReport,
} from "../controllers/maintenanceController.js";
import {
  getCatalogOrder,
  updateCatalogOrder,
} from "../controllers/catalogOrderController.js";
import {
  getAgencySettings,
  updateAgencySettings,
} from "../controllers/agencySettingsController.js";
import {
  changeAccountPassword,
  signOutOtherSessions,
  updateAccountProfile,
} from "../controllers/accountController.js";
import {
  listPromotions,
  getPromotion,
  createPromotion,
  updatePromotion,
  setPromotionActive,
  deletePromotion,
  previewPromotion,
} from "../controllers/promotionController.js";
import {
  chauffeurs,
  samsars,
  partnerCompanies,
} from "../controllers/directoryController.js";
import {
  getAccountingMeta,
  getKpis,
  getRevenues,
  listAccountingCars,
  listAccountingSamsars,
  listAgencyExpense,
  createAgencyExpense,
  updateAgencyExpense,
  deleteAgencyExpense,
  listVehicleExpense,
  createVehicleExpense,
  updateVehicleExpense,
  deleteVehicleExpense,
  listSamsarPayment,
  createSamsarPayment,
  updateSamsarPayment,
  deleteSamsarPayment,
} from "../controllers/accountingController.js";

const ownerRouter = express.Router();
const gate = (perm) => [protect, requireOwner, requirePermission(perm)];

ownerRouter.post("/add-car", ...gate('fleet'), upload.single("image"), handleMulterError, addCar);
ownerRouter.get("/cars", ...gate('fleet'), getOwnerCars);
ownerRouter.get("/cars/:id", ...gate('fleet'), getOwnerCarById);
ownerRouter.get("/cars/:id/stats", ...gate('fleet'), getVehicleStats);
ownerRouter.get("/vehicles/:id", ...gate('fleet'), getOwnerCarById);
ownerRouter.get("/vehicles/:id/stats", ...gate('fleet'), getVehicleStats);
ownerRouter.get("/vehicles/:id/stats/export", ...gate('fleet'), exportVehicleStatsXlsx);
ownerRouter.post("/update-car", ...gate('fleet'), upload.single("image"), handleMulterError, updateCar);
ownerRouter.post("/toggle-car", ...gate('fleet'), toggleCarAvailability);
ownerRouter.post("/delete-car", ...gate('fleet'), deleteCar);
ownerRouter.get("/catalog-order", ...gate('fleet'), getCatalogOrder);
ownerRouter.put("/catalog-order", ...gate('fleet'), updateCatalogOrder);

ownerRouter.get('/dashboard', ...gate('dashboard'), getDashboardData);
ownerRouter.get('/ops-dashboard', ...gate('dashboard'), getOpsDashboard);
ownerRouter.get('/analytics', ...gate('analytics'), getRevenueAnalytics);
ownerRouter.get('/overview', ...gate('dashboard'), getAdminOverview);
ownerRouter.get('/customers', ...gate('customers'), getCustomers);
ownerRouter.get('/crm/customers', ...gate('customers'), getCrmCustomers);
ownerRouter.get('/crm/customers/export', ...gate('customers'), exportCustomersXlsx);
ownerRouter.get('/crm/customers/:email', ...gate('customers'), getCrmCustomerDetail);
ownerRouter.post('/crm/rate', ...gate('customers'), rateCustomer);
ownerRouter.post('/crm/note', ...gate('customers'), addCustomerNote);
ownerRouter.post('/crm/status', ...gate('customers'), updateCustomerStatus);
ownerRouter.get('/maintenance', ...gate('maintenance'), getFleetMaintenance);
ownerRouter.post('/maintenance/update', ...gate('maintenance'), updateCarMaintenance);
ownerRouter.get('/maintenance/records', ...gate('maintenance'), listMaintenanceRecords);
ownerRouter.post('/maintenance/records', ...gate('maintenance'), createMaintenanceRecord);
ownerRouter.patch('/maintenance/records', ...gate('maintenance'), updateMaintenanceRecord);
ownerRouter.post('/maintenance/records/delete', ...gate('maintenance'), deleteMaintenanceRecord);
ownerRouter.get('/maintenance/calendar', ...gate('maintenance'), getMaintenanceCalendar);
ownerRouter.get('/maintenance/report', ...gate('maintenance'), getMaintenanceReport);
ownerRouter.get('/maintenance/export', ...gate('maintenance'), exportMaintenanceXlsx);
ownerRouter.get('/notifications', protect, requireOwner, getNotifications);
ownerRouter.post('/notifications/read', protect, requireOwner, markNotificationRead);
ownerRouter.get('/audit-logs', ...gate('audit'), getAuditLogs);
ownerRouter.get('/search', protect, requireOwner, globalSearch);
ownerRouter.get('/reports/export', ...gate('reports'), exportReportXlsx);
ownerRouter.post('/update-image', protect, requireOwner, upload.single("image"), handleMulterError, updateUserImage);

ownerRouter.put('/account/profile', protect, requireOwner, updateAccountProfile);
ownerRouter.put('/account/password', protect, requireOwner, changeAccountPassword);
ownerRouter.post('/account/sign-out-others', protect, requireOwner, signOutOtherSessions);

ownerRouter.get('/settings', protect, requireOwner, getAgencySettings);
ownerRouter.put('/settings', protect, requireOwner, updateAgencySettings);
ownerRouter.get('/settings/whatsapp', protect, requireOwner, getAgencySettings);
ownerRouter.put('/settings/whatsapp', protect, requireOwner, updateAgencySettings);

ownerRouter.get('/promotions', protect, requireOwner, listPromotions);
ownerRouter.post('/promotions/preview', protect, requireOwner, previewPromotion);
ownerRouter.post('/promotions', protect, requireOwner, createPromotion);
ownerRouter.get('/promotions/:id', protect, requireOwner, getPromotion);
ownerRouter.put('/promotions/:id', protect, requireOwner, updatePromotion);
ownerRouter.patch('/promotions/:id/active', protect, requireOwner, setPromotionActive);
ownerRouter.delete('/promotions/:id', protect, requireOwner, deletePromotion);

/* —— Directory: Chauffeurs / Samsars / Partner companies (Phase A) —— */
ownerRouter.get('/chauffeurs', ...gate('chauffeurs'), chauffeurs.list);
ownerRouter.post('/chauffeurs', ...gate('chauffeurs'), chauffeurs.create);
ownerRouter.get('/chauffeurs/:id', ...gate('chauffeurs'), chauffeurs.getOne);
ownerRouter.put('/chauffeurs/:id', ...gate('chauffeurs'), chauffeurs.update);
ownerRouter.patch('/chauffeurs/:id/status', ...gate('chauffeurs'), chauffeurs.setStatus);

ownerRouter.get('/samsars', ...gate('partners'), samsars.list);
ownerRouter.post('/samsars', ...gate('partners'), samsars.create);
ownerRouter.get('/samsars/:id', ...gate('partners'), samsars.getOne);
ownerRouter.put('/samsars/:id', ...gate('partners'), samsars.update);
ownerRouter.patch('/samsars/:id/status', ...gate('partners'), samsars.setStatus);

ownerRouter.get('/partner-companies', ...gate('partners'), partnerCompanies.list);
ownerRouter.post('/partner-companies', ...gate('partners'), partnerCompanies.create);
ownerRouter.get('/partner-companies/:id', ...gate('partners'), partnerCompanies.getOne);
ownerRouter.put('/partner-companies/:id', ...gate('partners'), partnerCompanies.update);
ownerRouter.patch('/partner-companies/:id/status', ...gate('partners'), partnerCompanies.setStatus);

/* —— Accounting / Comptabilité (Phase B) —— */
ownerRouter.get('/accounting/meta', ...gate('accounting'), getAccountingMeta);
ownerRouter.get('/accounting/kpis', ...gate('accounting'), getKpis);
ownerRouter.get('/accounting/export', ...gate('accounting'), exportAccountingXlsx);
ownerRouter.get('/accounting/revenues', ...gate('accounting'), getRevenues);
ownerRouter.get('/accounting/cars', ...gate('accounting'), listAccountingCars);
ownerRouter.get('/accounting/samsars', ...gate('accounting'), listAccountingSamsars);

ownerRouter.get('/accounting/agency-expenses', ...gate('accounting'), listAgencyExpense);
ownerRouter.post('/accounting/agency-expenses', ...gate('accounting'), createAgencyExpense);
ownerRouter.put('/accounting/agency-expenses/:id', ...gate('accounting'), updateAgencyExpense);
ownerRouter.delete('/accounting/agency-expenses/:id', ...gate('accounting'), deleteAgencyExpense);

ownerRouter.get('/accounting/vehicle-expenses', ...gate('accounting'), listVehicleExpense);
ownerRouter.post('/accounting/vehicle-expenses', ...gate('accounting'), createVehicleExpense);
ownerRouter.put('/accounting/vehicle-expenses/:id', ...gate('accounting'), updateVehicleExpense);
ownerRouter.delete('/accounting/vehicle-expenses/:id', ...gate('accounting'), deleteVehicleExpense);

ownerRouter.get('/accounting/samsar-payments', ...gate('accounting'), listSamsarPayment);
ownerRouter.post('/accounting/samsar-payments', ...gate('accounting'), createSamsarPayment);
ownerRouter.put('/accounting/samsar-payments/:id', ...gate('accounting'), updateSamsarPayment);
ownerRouter.delete('/accounting/samsar-payments/:id', ...gate('accounting'), deleteSamsarPayment);

export default ownerRouter;
