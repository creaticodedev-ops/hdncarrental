import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { logAudit } from '../utils/adminOps.js';

const MIN_PASSWORD_LENGTH = 8;

/**
 * Auth is stateless (JWT + `tokenVersion`), so "sign out everywhere" is a version
 * bump. The caller keeps working because we hand back a token on the new version.
 */
const issueToken = (user) =>
  jwt.sign(
    { _id: user._id.toString(), tv: user.tokenVersion || 0 },
    process.env.JWT_SECRET,
    { expiresIn: '7d' },
  );

const audit = (user, action, details) =>
  logAudit({
    owner: user._id,
    actor: user._id,
    action,
    entityType: 'User',
    entityId: user._id,
    details,
  });

/** Update the signed-in admin's own display name. */
export const updateAccountProfile = async (req, res) => {
  try {
    const name = String(req.body?.name ?? '').trim();
    if (name.length < 2) {
      return res.status(400).json({ success: false, message: 'Name must be at least 2 characters' });
    }

    await User.findByIdAndUpdate(req.user._id, { name });
    await audit(req.user, 'account.profile.update', `Renamed account to "${name}"`);

    res.json({ success: true, message: 'Profile updated', user: { name } });
  } catch (error) {
    console.error('[updateAccountProfile]', error.message);
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
};

/**
 * Change own password. Every other session is revoked; the current one is kept
 * alive with a freshly signed token.
 */
export const changeAccountPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ success: false, message: 'Current and new password are required' });
    }
    if (String(newPassword).length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `New password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      });
    }
    if (String(currentPassword) === String(newPassword)) {
      return res
        .status(400)
        .json({ success: false, message: 'New password must be different from the current one' });
    }

    // `protect` strips the hash, so read it explicitly for the comparison.
    const account = await User.findById(req.user._id).select('+password');
    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }

    const matches = await bcrypt.compare(String(currentPassword), account.password);
    if (!matches) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    account.password = await bcrypt.hash(String(newPassword), 10);
    account.tokenVersion = (account.tokenVersion || 0) + 1;
    await account.save();
    await audit(account, 'account.password.change', 'Changed own password');

    res.json({
      success: true,
      message: 'Password changed. Other devices have been signed out.',
      token: issueToken(account),
    });
  } catch (error) {
    console.error('[changeAccountPassword]', error.message);
    res.status(500).json({ success: false, message: 'Failed to change password' });
  }
};

/** Revoke every issued token, then re-authorize the current device. */
export const signOutOtherSessions = async (req, res) => {
  try {
    const account = await User.findById(req.user._id);
    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }

    account.tokenVersion = (account.tokenVersion || 0) + 1;
    await account.save();
    await audit(account, 'account.sessions.revoke', 'Signed out all other sessions');

    res.json({
      success: true,
      message: 'All other sessions have been signed out',
      token: issueToken(account),
    });
  } catch (error) {
    console.error('[signOutOtherSessions]', error.message);
    res.status(500).json({ success: false, message: 'Failed to sign out other sessions' });
  }
};

export default {
  updateAccountProfile,
  changeAccountPassword,
  signOutOtherSessions,
};
