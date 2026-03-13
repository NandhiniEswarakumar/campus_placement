const Notification = require('../models/Notification');

const streamClients = new Map();

const roleModelMap = {
  student: 'Student',
  hr: 'HR',
  coordinator: 'Coordinator',
};

function getStreamKey(recipientId, recipientModel) {
  return `${recipientModel}:${recipientId}`;
}

function addNotificationClient(recipientId, recipientModel, res) {
  const key = getStreamKey(recipientId, recipientModel);
  const clients = streamClients.get(key) || new Set();
  clients.add(res);
  streamClients.set(key, clients);
}

function removeNotificationClient(recipientId, recipientModel, res) {
  const key = getStreamKey(recipientId, recipientModel);
  const clients = streamClients.get(key);
  if (!clients) return;

  clients.delete(res);
  if (clients.size === 0) {
    streamClients.delete(key);
  }
}

function broadcastNotification(notification) {
  const key = getStreamKey(notification.recipient.toString(), notification.recipientModel);
  const clients = streamClients.get(key);
  if (!clients || clients.size === 0) return;

  const payload = JSON.stringify({ type: 'notification', notification });
  clients.forEach((client) => {
    client.write(`data: ${payload}\n\n`);
  });
}

async function createNotification(data) {
  const notification = await Notification.create(data);
  broadcastNotification(notification.toObject());
  return notification;
}

async function createManyNotifications(items) {
  if (!items || items.length === 0) return [];

  const notifications = await Notification.insertMany(items);
  notifications.forEach((notification) => {
    broadcastNotification(notification.toObject());
  });
  return notifications;
}

module.exports = {
  addNotificationClient,
  broadcastNotification,
  createNotification,
  createManyNotifications,
  removeNotificationClient,
  roleModelMap,
};