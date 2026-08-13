const { prisma } = require('../config/database');
const { ApiError } = require('../utils/ApiError');
const { hashPassword, verifyPassword } = require('../utils/password');
const { publicUser } = require('./auth.service');

async function getMe(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw ApiError.notFound('User not found', 'USER_NOT_FOUND');
  }
  return publicUser(user);
}

async function updateMe(userId, data) {
  if (data.email) {
    const existing = await prisma.user.findFirst({ where: { email: data.email, NOT: { id: userId } } });
    if (existing) {
      throw ApiError.conflict('An account with this email already exists', 'EMAIL_TAKEN');
    }
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data,
  });
  return publicUser(user);
}

async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw ApiError.notFound('User not found', 'USER_NOT_FOUND');
  }

  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) {
    throw ApiError.badRequest('Current password is incorrect', 'INCORRECT_PASSWORD');
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  return { success: true };
}

module.exports = { getMe, updateMe, changePassword };
