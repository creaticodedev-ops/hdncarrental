import AuditLog from '../models/AuditLog.js';
import AdminNotification from '../models/AdminNotification.js';

export const logAudit = async ({ owner, actor, action, entityType = '', entityId = '', details = '', meta = {} }) => {
  try {
    await AuditLog.create({
      owner,
      actor: actor || owner,
      action,
      entityType,
      entityId: entityId?.toString?.() || String(entityId || ''),
      details,
      meta,
    });
  } catch (error) {
    console.error('Audit log failed:', error.message);
  }
};

export const createNotification = async ({ owner, type = 'system', title, message = '', link = '/owner', meta = {} }) => {
  try {
    await AdminNotification.create({ owner, type, title, message, link, meta });
  } catch (error) {
    console.error('Notification create failed:', error.message);
  }
};
