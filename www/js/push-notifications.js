/**
 * LeqoeHunt Push Notifications Handler
 * Manages Firebase Cloud Messaging for the mobile app
 */

import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

class LeqoeHuntNotifications {
    constructor() {
        this.isInitialized = false;
        this.deviceToken = null;
        this.initialize();
    }

    async initialize() {
        // Only initialize on mobile platforms
        if (!Capacitor.isNativePlatform()) {
            console.log('Push notifications not available on web platform');
            return;
        }

        try {
            // Request permission to use push notifications
            let permStatus = await PushNotifications.checkPermissions();

            if (permStatus.receive === 'prompt') {
                permStatus = await PushNotifications.requestPermissions();
            }

            if (permStatus.receive !== 'granted') {
                console.warn('Push notification permission denied');
                return;
            }

            // Register for push notifications
            await PushNotifications.register();

            // Listen for registration success
            await PushNotifications.addListener('registration', (token) => {
                console.log('Push registration success, token: ', token.value);
                this.deviceToken = token.value;
                this.sendTokenToServer(token.value);
            });

            // Listen for registration error
            await PushNotifications.addListener('registrationError', (error) => {
                console.error('Registration error: ', error.error);
            });

            // Listen for push notifications
            await PushNotifications.addListener('pushNotificationReceived', (notification) => {
                console.log('Push notification received: ', notification);
                this.handleNotificationReceived(notification);
            });

            // Listen for notification action (when user taps notification)
            await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
                console.log('Push notification action performed', notification);
                this.handleNotificationTapped(notification);
            });

            this.isInitialized = true;
            console.log('✅ LeqoeHunt Push Notifications initialized successfully');

        } catch (error) {
            console.error('Failed to initialize push notifications:', error);
        }
    }

    /**
     * Send device token to LeqoeHunt server
     */
    async sendTokenToServer(token) {
        try {
            // Get user info if available
            const userInfo = this.getUserInfo();

            const payload = {
                device_token: token,
                platform: 'android',
                app_version: '1.0.0',
                user_id: userInfo.userId || null,
                timestamp: new Date().toISOString()
            };

            // Send to LeqoeHunt backend
            const response = await fetch('https://leqoehunt.my/api/push-token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                console.log('✅ Device token registered with LeqoeHunt server');
            } else {
                console.warn('Failed to register token with server:', response.status);
            }

        } catch (error) {
            console.error('Error sending token to server:', error);
        }
    }

    /**
     * Handle received notification (when app is in foreground)
     */
    handleNotificationReceived(notification) {
        // Show in-app notification
        this.showInAppNotification({
            title: notification.title,
            body: notification.body,
            data: notification.data
        });

        // Track notification received
        this.trackNotificationEvent('received', notification);
    }

    /**
     * Handle notification tap (when user opens app from notification)
     */
    handleNotificationTapped(notification) {
        const data = notification.notification.data;

        // Handle different notification types
        if (data.type) {
            switch (data.type) {
                case 'kedai_verification':
                    this.navigateToKedai(data.kedai_id);
                    break;

                case 'photohunt_challenge':
                    this.navigateToPhotoHunt(data.challenge_id);
                    break;

                case 'business_update':
                    this.navigateToBusinessDashboard();
                    break;

                case 'promotional':
                    this.navigateToPromotion(data.promo_id);
                    break;

                default:
                    this.navigateToHome();
            }
        } else {
            this.navigateToHome();
        }

        // Track notification opened
        this.trackNotificationEvent('opened', notification.notification);
    }

    /**
     * Show in-app notification banner
     */
    showInAppNotification(notification) {
        // Create notification element
        const notificationEl = document.createElement('div');
        notificationEl.className = 'leqoehunt-notification';
        notificationEl.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">🔔</div>
                <div class="notification-text">
                    <div class="notification-title">${notification.title}</div>
                    <div class="notification-body">${notification.body}</div>
                </div>
                <div class="notification-close" onclick="this.parentElement.parentElement.remove()">×</div>
            </div>
        `;

        // Add styles
        notificationEl.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            right: 20px;
            background: linear-gradient(135deg, #4A55A2 0%, #667eea 100%);
            color: white;
            padding: 15px;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            z-index: 10000;
            animation: slideDown 0.3s ease-out;
        `;

        // Add CSS animation
        if (!document.querySelector('#leqoehunt-notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'leqoehunt-notification-styles';
            styles.textContent = `
                @keyframes slideDown {
                    from { transform: translateY(-100px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .notification-content {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .notification-icon {
                    font-size: 24px;
                }
                .notification-text {
                    flex: 1;
                }
                .notification-title {
                    font-weight: bold;
                    margin-bottom: 4px;
                }
                .notification-body {
                    font-size: 14px;
                    opacity: 0.9;
                }
                .notification-close {
                    font-size: 20px;
                    cursor: pointer;
                    opacity: 0.7;
                }
                .notification-close:hover {
                    opacity: 1;
                }
            `;
            document.head.appendChild(styles);
        }

        // Show notification
        document.body.appendChild(notificationEl);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notificationEl.parentElement) {
                notificationEl.remove();
            }
        }, 5000);
    }

    /**
     * Navigation helpers
     */
    navigateToKedai(kedaiId) {
        window.location.href = `https://leqoehunt.my/kedai/${kedaiId}`;
    }

    navigateToPhotoHunt(challengeId) {
        window.location.href = `https://leqoehunt.my/photohunt/${challengeId}`;
    }

    navigateToBusinessDashboard() {
        window.location.href = `https://leqoehunt.my/dashboard`;
    }

    navigateToPromotion(promoId) {
        window.location.href = `https://leqoehunt.my/promo/${promoId}`;
    }

    navigateToHome() {
        window.location.href = `https://leqoehunt.my/`;
    }

    /**
     * Get user info from localStorage or sessionStorage
     */
    getUserInfo() {
        try {
            // Try to get user info from localStorage
            const userInfo = localStorage.getItem('leqoehunt_user') ||
                           sessionStorage.getItem('leqoehunt_user');

            if (userInfo) {
                return JSON.parse(userInfo);
            }
        } catch (error) {
            console.warn('Could not parse user info:', error);
        }

        return { userId: null };
    }

    /**
     * Track notification events for analytics
     */
    trackNotificationEvent(action, notification) {
        try {
            // Send analytics to LeqoeHunt server
            fetch('https://leqoehunt.my/api/notification-analytics', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: action,
                    notification_id: notification.data?.notification_id,
                    type: notification.data?.type,
                    timestamp: new Date().toISOString(),
                    device_token: this.deviceToken
                })
            }).catch(error => {
                console.warn('Analytics tracking failed:', error);
            });
        } catch (error) {
            console.warn('Failed to track notification event:', error);
        }
    }

    /**
     * Public method to get device token
     */
    getDeviceToken() {
        return this.deviceToken;
    }

    /**
     * Public method to check if notifications are initialized
     */
    isReady() {
        return this.isInitialized;
    }
}

// Initialize notifications when page loads
const leqoeHuntNotifications = new LeqoeHuntNotifications();

// Export for global access
window.LeqoeHuntNotifications = leqoeHuntNotifications;

console.log('🔔 LeqoeHunt Push Notifications module loaded');