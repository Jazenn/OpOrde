import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/clerk-expo';
import { useQuery } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { db } from '../../../src/db/client';
import { userTasks, taskTemplates } from '../../../src/db/schema';
import { eq } from 'drizzle-orm';
import { getIconName } from '../../../src/lib/icons';
import { useRouter } from 'expo-router';

export default function AllTasksScreen() {
  const { userId } = useAuth();
  const router = useRouter();

  const fetchAllTasks = async () => {
    if (!userId) return [];
    
    const tasks = await db
      .select({
        id: userTasks.id,
        isCustom: userTasks.isCustom,
        customName: userTasks.customName,
        nextDueDate: userTasks.nextDueDate,
        intervalDays: userTasks.intervalDays,
        frequencyType: userTasks.frequencyType,
        isActive: userTasks.isActive,
        templateName: taskTemplates.name,
        templateIcon: taskTemplates.icon,
        isPremium: taskTemplates.isPremium,
      })
      .from(userTasks)
      .leftJoin(taskTemplates, eq(userTasks.templateId, taskTemplates.id));
      
    return tasks;
  };

  const { data: tasks, isLoading, isError, error } = useQuery({
    queryKey: ['tasks', 'all'],
    queryFn: fetchAllTasks,
    enabled: !!userId,
  });

  if (isLoading || !userId) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#ff550a" />
          <Text style={{ marginTop: 16, color: '#64748b', fontFamily: 'Nunito_400Regular' }}>
            Alle taken inladen...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#ef4444" />
          <Text style={{ marginTop: 16, color: '#ef4444', fontWeight: 'bold', fontFamily: 'Nunito_700Bold' }}>
            Er is een fout opgetreden
          </Text>
          <Text style={{ marginTop: 8, color: '#64748b', textAlign: 'center', fontFamily: 'Nunito_400Regular' }}>
            {String(error)}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const activeTasks = tasks?.filter(t => t.isActive) || [];
  const inactiveTasks = tasks?.filter(t => !t.isActive) || [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
      <View style={{ flex: 1, paddingTop: 20 }}>
        
        {/* Header */}
        <View className="px-6 mb-6">
          <Text className="text-3xl font-bold text-slate-800 font-sans mb-1">Alle Taken</Text>
          <Text className="text-base text-slate-500 font-sans">
            Je hebt {activeTasks.length} actieve huishoudtaken.
          </Text>
        </View>

        {/* Tasks List */}
        <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
          
          <Text className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Actieve Taken</Text>
          
          {activeTasks.length === 0 && (
            <View className="bg-white p-6 rounded-2xl border border-slate-100 items-center mb-6">
              <MaterialCommunityIcons name="clipboard-text-off-outline" size={40} color="#cbd5e1" className="mb-2" />
              <Text className="text-slate-500 font-sans text-center">Geen actieve taken gevonden.</Text>
            </View>
          )}

          {activeTasks.map(task => {
            const displayName = task.isCustom ? task.customName : task.templateName;
            // E.g. 7 days interval
            const frequencyLabel = task.intervalDays === 1 ? 'Elke dag' : 
                                   task.intervalDays === 7 ? 'Wekelijks' : 
                                   task.intervalDays === 14 ? 'Elke 2 weken' :
                                   task.intervalDays === 30 ? 'Maandelijks' : `Elke ${task.intervalDays} dagen`;

            return (
              <TouchableOpacity 
                key={task.id}
                activeOpacity={0.7}
                onPress={() => router.push(`/tasks/${task.id}`)}
                className="flex-row items-center bg-white p-4 rounded-2xl mb-4 shadow-sm border border-slate-100"
              >
                {/* Icon */}
                <View className="w-12 h-12 bg-nlOrange-50 rounded-full items-center justify-center mr-4">
                  <MaterialCommunityIcons 
                    name={getIconName(task.templateIcon)} 
                    size={24} 
                    color="#ff550a" 
                  />
                </View>

                {/* Info */}
                <View className="flex-1">
                  <Text className="text-lg font-bold text-slate-800 font-sans">
                    {displayName}
                  </Text>
                  <View className="flex-row items-center mt-1">
                    <MaterialCommunityIcons name="calendar-sync" size={14} color="#64748b" />
                    <Text className="text-sm text-slate-500 font-sans ml-1">
                      {frequencyLabel}
                    </Text>
                    {task.isPremium && !task.isCustom && (
                      <View className="bg-nlOrange-100 px-2 py-0.5 rounded-md ml-2">
                        <Text className="text-[10px] font-bold text-nlOrange-700 uppercase">Premium</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Chevron */}
                <MaterialCommunityIcons name="chevron-right" size={24} color="#cbd5e1" />
              </TouchableOpacity>
            );
          })}

          {inactiveTasks.length > 0 && (
            <>
              <Text className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 mt-6">Gepauzeerde Taken</Text>
              {inactiveTasks.map(task => {
                const displayName = task.isCustom ? task.customName : task.templateName;
                return (
                  <TouchableOpacity 
                    key={task.id}
                    activeOpacity={0.7}
                    onPress={() => router.push(`/tasks/${task.id}`)}
                    className="flex-row items-center bg-slate-50 p-4 rounded-2xl mb-4 border border-slate-200 opacity-60"
                  >
                    <View className="w-12 h-12 bg-slate-200 rounded-full items-center justify-center mr-4">
                      <MaterialCommunityIcons 
                        name={getIconName(task.isCustom ? task.customIcon : task.templateIcon)} 
                        size={24} 
                        color="#64748b" 
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-lg font-bold text-slate-600 font-sans line-through decoration-slate-400">
                        {displayName}
                      </Text>
                      <Text className="text-sm text-slate-400 font-sans">Gepauzeerd</Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={24} color="#cbd5e1" />
                  </TouchableOpacity>
                );
              })}
            </>
          )}

          {/* Spacer for Floating Button */}
          <View className="h-24" />
        </ScrollView>

        {/* Floating Add Button */}
        <View className="absolute bottom-6 right-6">
          <TouchableOpacity 
            activeOpacity={0.8}
            className="w-16 h-16 bg-nlOrange-500 rounded-full items-center justify-center shadow-lg shadow-nlOrange-300"
            onPress={() => router.push('/tasks/add')}
          >
            <MaterialCommunityIcons name="plus" size={32} color="white" />
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
}

