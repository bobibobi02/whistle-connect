// Firebase Cloud Messaging Service Worker
// This handles background push notifications for the web app

importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Firebase config will be injected at build time or fetched from the app
// For now, we handle messages generically
self.addEventListener('push', function(event) {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.notification?.body || data.body || 'You have a new notification',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      vibrate: [100, 50, 100],
      data: data.data || {},
      actions: [
        { action: 'open', title: 'Open' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(
        data.notification?.title || data.title || 'Whistle',
        options
      )
    );
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const data = event.notification.data || {};
  let url = '/';

  // Navigate based on notification type
  if (data.type === 'comment' || data.type === 'upvote' || data.type === 'mention') {
    if (data.postId) {
      url = `/post/${data.postId}`;
    }
  } else if (data.type === 'follow') {
    if (data.userId) {
      url = `/profile/${data.userId}`;
    }
  } else if (data.type === 'community') {
    if (data.communityName) {
      url = `/c/${data.communityName}`;
    }
  } else if (data.link) {
    url = data.link;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // If a window is already open, focus it
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
