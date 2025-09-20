import React, { useState, useEffect } from 'react';
import { BellIcon, DevicePhoneMobileIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon } from '@heroicons/react/24/solid';
import pushManager from '../utils/pushNotifications';

interface Device {
  deviceId: string;
  platform: string;
  browser: string;
  lastActiveAt: string;
  enabled: boolean;
  hasFCM: boolean;
}

interface Environment {
  browser: string;
  platform: string;
}

const PushNotificationSettings = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [environment, setEnvironment] = useState<Environment | null>(null);

  useEffect(() => {
    checkSupport();
    checkSubscriptionStatus();
    loadDevices();
    detectEnvironment();
  }, []);

  const checkSupport = () => {
    const supported = pushManager.isSupported;
    setIsSupported(supported);
    if (!supported) {
      setError('Push notifications are not supported in this browser');
    }
  };

  const detectEnvironment = () => {
    const env = pushManager.detectEnvironment();
    setEnvironment(env);
  };

  const checkSubscriptionStatus = async () => {
    try {
      const subscribed = await pushManager.isSubscribed();
      setIsSubscribed(subscribed);
    } catch (error) {
      console.error('Failed to check subscription status:', error);
    }
  };

  const loadDevices = async () => {
    try {
      const devicesData = await pushManager.getDevices();
      setDevices(devicesData.devices || []);
    } catch (error) {
      console.error('Failed to load devices:', error);
    }
  };

  const handleSubscribe = async () => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await pushManager.subscribe();
      setSuccess('Push notifications enabled successfully!');
      setIsSubscribed(true);
      await loadDevices();
    } catch (error: any) {
      setError(error.message || 'Failed to enable push notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      await pushManager.unsubscribe();
      setSuccess('Push notifications disabled successfully!');
      setIsSubscribed(false);
      await loadDevices();
    } catch (error: any) {
      setError(error.message || 'Failed to disable push notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeviceToggle = async (deviceId: string, enabled: boolean) => {
    try {
      await pushManager.updateDeviceSettings({ enabled });
      await loadDevices();
      setSuccess(`Device ${enabled ? 'enabled' : 'disabled'} successfully!`);
    } catch (error: any) {
      setError(error.message || 'Failed to update device settings');
    }
  };

  const getBrowserIcon = (browser: string) => {
    switch (browser) {
      case 'chrome':
        return '🌐';
      case 'firefox':
        return '🦊';
      case 'safari':
        return '🧭';
      case 'edge':
        return '📘';
      default:
        return '🌍';
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'ios':
        return <DevicePhoneMobileIcon className="h-5 w-5" />;
      case 'android':
        return <DevicePhoneMobileIcon className="h-5 w-5" />;
      case 'mac':
      case 'web':
        return <ComputerDesktopIcon className="h-5 w-5" />;
      default:
        return <ComputerDesktopIcon className="h-5 w-5" />;
    }
  };

  const getRecommendedMethod = () => {
    if (!environment) return 'auto';
    
    if (environment.platform === 'ios' && environment.browser === 'safari') {
      return 'FCM (optimized for iOS Safari)';
    }
    
    if (environment.platform === 'android') {
      return 'FCM (native Android support)';
    }
    
    return 'Firebase Cloud Messaging (FCM)';
  };

  if (!isSupported) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-3">
          <XCircleIcon className="h-8 w-8 text-red-500" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Push Notifications Not Supported</h3>
            <p className="text-gray-600">Your browser doesn't support push notifications.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Settings Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <BellIcon className="h-8 w-8 text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Push Notifications</h3>
              <p className="text-gray-600">Get notified about new posts and activity</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {isSubscribed ? (
              <CheckCircleIcon className="h-6 w-6 text-green-500" />
            ) : (
              <ExclamationTriangleIcon className="h-6 w-6 text-gray-400" />
            )}
            <span className={`text-sm font-medium ${isSubscribed ? 'text-green-600' : 'text-gray-500'}`}>
              {isSubscribed ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>

        {/* Environment Info */}
        {environment && (
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-3 mb-2">
              {getPlatformIcon(environment.platform)}
              <span className="text-sm font-medium text-blue-800">
                {getBrowserIcon(environment.browser)} {environment.browser} on {environment.platform}
              </span>
            </div>
            <p className="text-sm text-blue-700">
              <strong>Recommended method:</strong> {getRecommendedMethod()}
            </p>
          </div>
        )}

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-center space-x-2">
              <XCircleIcon className="h-5 w-5 text-red-500" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <div className="flex items-center space-x-2">
              <CheckCircleIcon className="h-5 w-5 text-green-500" />
              <p className="text-sm text-green-700">{success}</p>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="flex justify-center">
          {isSubscribed ? (
            <button
              onClick={handleUnsubscribe}
              disabled={isLoading}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Disabling...</span>
                </>
              ) : (
                <>
                  <BellIcon className="h-4 w-4" />
                  <span>Disable Notifications</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleSubscribe}
              disabled={isLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Enabling...</span>
                </>
              ) : (
                <>
                  <BellIcon className="h-4 w-4" />
                  <span>Enable Notifications</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Devices List */}
      {devices.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Your Devices</h4>
          <div className="space-y-3">
            {devices.map((device) => (
              <div key={device.deviceId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  {getPlatformIcon(device.platform)}
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {getBrowserIcon(device.browser)} {device.browser} on {device.platform}
                    </p>
                    <p className="text-xs text-gray-500">
                      Last active: {new Date(device.lastActiveAt).toLocaleDateString()}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      {device.hasFCM && (
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">FCM</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={device.enabled}
                    onChange={(e) => handleDeviceToggle(device.deviceId, e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-600">
                    {device.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Information Card */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-blue-900 mb-3">How it works</h4>
        <ul className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start space-x-2">
            <span className="text-blue-600">•</span>
            <span>Uses Firebase Cloud Messaging (FCM) for reliable cross-platform notifications</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-blue-600">•</span>
            <span>Works on all modern browsers including mobile Safari and Chrome</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-blue-600">•</span>
            <span>Optimized for mobile devices with proper notification display</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-blue-600">•</span>
            <span>You can manage notifications for each device separately</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default PushNotificationSettings;