import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { db } from '../db/client';
import { pushTokens } from '../db/schema';

// Configuratie voor hoe in-app notificaties worden behandeld als de app open staat
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerPushToken(userId: string) {
  if (!Device.isDevice) {
    console.log('Je moet een fysiek apparaat gebruiken voor Push Notificaties (werkt niet goed in simulator).');
    return;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Geen toestemming gekregen voor push notificaties.');
    return;
  }

  try {
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;

    if (!projectId) {
      console.warn('EAS Project ID ontbreekt in app.json. Dit is nodig voor production push notifications.');
    }

    // Get the token (we pass projectId to ensure it works correctly in EAS builds)
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: projectId || undefined,
    });
    const token = tokenData.data;
    console.log('Push token ontvangen:', token);

    // Sla het token op in de database of werk deze bij als de gebruiker/platform combi al bestaat
    await db.insert(pushTokens).values({
      userId,
      token,
      platform: Platform.OS as 'ios' | 'android',
    }).onConflictDoUpdate({
      target: [pushTokens.userId, pushTokens.platform],
      set: { token, updatedAt: new Date() }
    });
    
    console.log('Push token opgeslagen in Neon database!');
  } catch (error) {
    console.error('Fout bij ophalen of opslaan van push token:', error);
  }
}
