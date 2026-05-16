import { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@clerk/clerk-expo';
import { registerPushToken } from '../../src/services/notifications';

export default function AppLayout() {
  const { userId } = useAuth();

  useEffect(() => {
    if (userId) {
      registerPushToken(userId);
    }
  }, [userId]);

  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#ff550a' }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Vandaag',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons size={28} name="calendar-today" color={color} />,
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Taken',
          headerShown: false,
          tabBarIcon: ({ color }) => <MaterialCommunityIcons size={28} name="format-list-checks" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings/index"
        options={{
          title: 'Instellingen',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons size={28} name="cog-outline" color={color} />,
        }}
      />
    </Tabs>
  );
}