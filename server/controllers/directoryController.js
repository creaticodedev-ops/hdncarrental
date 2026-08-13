import Chauffeur from '../models/Chauffeur.js';
import Samsar from '../models/Samsar.js';
import PartnerCompany from '../models/PartnerCompany.js';
import { logAudit } from '../utils/adminOps.js';
import {
  getOwnedEntity,
  listDirectoryEntities,
  normalizeChauffeurInput,
  normalizePartnerCompanyInput,
  normalizeSamsarInput,
} from '../services/directoryService.js';

const sendError = (res, error, fallback) => {
  const status = error.status || 500;
  if (status >= 500) console.error('[directory]', error.message);
  return res.status(status).json({
    success: false,
    message: status < 500 ? error.message : fallback,
  });
};

const makeHandlers = ({
  Model,
  entityType,
  normalize,
  listKey,
  searchFields,
  labelField,
}) => {
  const list = async (req, res) => {
    try {
      const ownerId = req.user._id;
      const { q, status, page, limit, sort } = req.query;
      const result = await listDirectoryEntities(Model, ownerId, {
        q,
        status,
        page,
        limit,
        sort,
        searchFields,
      });
      res.json({
        success: true,
        [listKey]: result.items,
        pagination: result.pagination,
      });
    } catch (error) {
      sendError(res, error, `Failed to list ${entityType}`);
    }
  };

  const getOne = async (req, res) => {
    try {
      const doc = await getOwnedEntity(Model, req.user._id, req.params.id);
      if (!doc) {
        return res.status(404).json({ success: false, message: `${entityType} not found` });
      }
      res.json({ success: true, [entityType]: doc });
    } catch (error) {
      sendError(res, error, `Failed to load ${entityType}`);
    }
  };

  const create = async (req, res) => {
    try {
      const ownerId = req.user._id;
      const payload = normalize(req.body || {}, { partial: false });
      const doc = await Model.create({
        ...payload,
        owner: ownerId,
        createdBy: ownerId,
        updatedBy: ownerId,
      });
      try {
        await logAudit({
          owner: ownerId,
          actor: ownerId,
          action: `${entityType}.create`,
          entityType: Model.modelName,
          entityId: doc._id,
          details: `Created ${entityType} ${doc[labelField] || doc._id}`,
        });
      } catch (auditError) {
        console.error('[directory] audit', auditError.message);
      }
      res.status(201).json({ success: true, message: 'Created', [entityType]: doc });
    } catch (error) {
      sendError(res, error, `Failed to create ${entityType}`);
    }
  };

  const update = async (req, res) => {
    try {
      const ownerId = req.user._id;
      const doc = await getOwnedEntity(Model, ownerId, req.params.id);
      if (!doc) {
        return res.status(404).json({ success: false, message: `${entityType} not found` });
      }
      const payload = normalize({ ...doc.toObject(), ...req.body }, { partial: false });
      Object.assign(doc, payload, { updatedBy: ownerId });
      await doc.save();
      try {
        await logAudit({
          owner: ownerId,
          actor: ownerId,
          action: `${entityType}.update`,
          entityType: Model.modelName,
          entityId: doc._id,
          details: `Updated ${entityType} ${doc[labelField] || doc._id}`,
        });
      } catch (auditError) {
        console.error('[directory] audit', auditError.message);
      }
      res.json({ success: true, message: 'Updated', [entityType]: doc });
    } catch (error) {
      sendError(res, error, `Failed to update ${entityType}`);
    }
  };

  const setStatus = async (req, res) => {
    try {
      const ownerId = req.user._id;
      const doc = await getOwnedEntity(Model, ownerId, req.params.id);
      if (!doc) {
        return res.status(404).json({ success: false, message: `${entityType} not found` });
      }
      const next = req.body?.status === 'inactive' ? 'inactive' : 'active';
      doc.status = next;
      doc.updatedBy = ownerId;
      await doc.save();
      try {
        await logAudit({
          owner: ownerId,
          actor: ownerId,
          action: `${entityType}.status`,
          entityType: Model.modelName,
          entityId: doc._id,
          details: `Set ${entityType} status to ${next}`,
        });
      } catch (auditError) {
        console.error('[directory] audit', auditError.message);
      }
      res.json({ success: true, message: 'Status updated', [entityType]: doc });
    } catch (error) {
      sendError(res, error, `Failed to update ${entityType} status`);
    }
  };

  return { list, getOne, create, update, setStatus };
};

export const chauffeurs = makeHandlers({
  Model: Chauffeur,
  entityType: 'chauffeur',
  normalize: normalizeChauffeurInput,
  listKey: 'chauffeurs',
  searchFields: ['fullName', 'phone', 'email', 'licenseNumber'],
  labelField: 'fullName',
});

export const samsars = makeHandlers({
  Model: Samsar,
  entityType: 'samsar',
  normalize: normalizeSamsarInput,
  listKey: 'samsars',
  searchFields: ['fullName', 'phone', 'email'],
  labelField: 'fullName',
});

export const partnerCompanies = makeHandlers({
  Model: PartnerCompany,
  entityType: 'partnerCompany',
  normalize: normalizePartnerCompanyInput,
  listKey: 'partnerCompanies',
  searchFields: ['companyName', 'legalName', 'contactName', 'phone', 'email', 'taxId'],
  labelField: 'companyName',
});

export default { chauffeurs, samsars, partnerCompanies };
