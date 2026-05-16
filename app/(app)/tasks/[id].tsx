import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, TextInput, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/clerk-expo';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { db } from '../../../src/db/client';
import { userTasks, taskTemplates } from '../../../src/db/schema';
import { eq } from 'drizzle-orm';
import { getIconName } from '../../../src/lib/icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  // Local state for editing
  const [intervalDays, setIntervalDays] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(true);

  // Fetch specific task
  const fetchTask = async () => {
    if (!userId || !id) return null;
    
    const result = await db
      .select({
        id: userTasks.id,
        isCustom: userTasks.isCustom,
        customName: userTasks.customName,
        customIcon: userTasks.customIcon,
        nextDueDate: userTasks.nextDueDate,
        intervalDays: userTasks.intervalDays,
        frequencyType: userTasks.frequencyType,
        isActive: userTasks.isActive,
        notes: userTasks.notes,
        templateName: taskTemplates.name,
        templateIcon: taskTemplates.icon,
        isPremium: taskTemplates.isPremium,
      })
      .from(userTasks)
      .leftJoin(taskTemplates, eq(userTasks.templateId, taskTemplates.id))
      .where(eq(userTasks.id, id))
      .limit(1);
      
    return result[0] || null;
  };

  const { data: task, isLoading, isError } = useQuery({
    queryKey: ['task', id],
    queryFn: fetchTask,
    enabled: !!userId && !!id,
  });

  // Sync local state when task data loads
  useEffect(() => {
    if (task) {
      setIntervalDays(task.intervalDays?.toString() || '7');
      setNotes(task.notes || '');
      setIsActive(task.isActive);
    }
  }, [task]);

  // Update mutation
  const updateTaskMutation = useMutation({
    mutationFn: async () => {
      if (!userId || !id) throw new Error("No user found");
      const parsedInterval = parseInt(intervalDays, 10);
      if (isNaN(parsedInterval) || parsedInterval < 1) {
        throw new Error("Ongeldig interval");
      }

      await db.update(userTasks)
        .set({
          intervalDays: parsedInterval,
          notes: notes.trim() || null,
          isActive,
        })
        .where(eq(userTasks.id, id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      router.back();
    },
    onError: (err: any) => {
      Alert.alert('Fout bij opslaan', err.message || 'Er is een fout opgetreden.');
    }
  });

  // Delete mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async () => {
      if (!userId || !id) throw new Error("No user found");
      
      // Need to delete completions first due to foreign key
      const { taskCompletions } = require('../../../src/db/schema');
      await db.delete(taskCompletions).where(eq(taskCompletions.taskId, id));
      await db.delete(userTasks).where(eq(userTasks.id, id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      router.back();
    },
    onError: (err) => {
      Alert.alert('Fout bij verwijderen', 'Kan de taak niet verwijderen.');
      console.error(err);
    }
  });

  const handleDelete = () => {
    Alert.alert(
      'Taak verwijderen',
      'Weet je zeker dat je deze taak wilt verwijderen? Je verliest ook de geschiedenis van deze specifieke taak.',
      [
        { text: 'Annuleren', style: 'cancel' },
        { text: 'Verwijderen', style: 'destructive', onPress: () => deleteTaskMutation.mutate() }
      ]
    );
  };

  if (isLoading || !userId) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFAFA', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#ff550a" />
      </SafeAreaView>
    );
  }

  if (isError || !task) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFAFA', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#ef4444', fontWeight: 'bold' }}>Kan taak niet laden.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ color: '#64748b' }}>Ga terug</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const displayName = task.isCustom ? task.customName : task.templateName;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFAFA' }} edges={['top', 'bottom']}>
      {/* Navbar */}
      <View className="flex-row items-center justify-between px-6 py-4">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center -ml-2">
          <MaterialCommunityIcons name="arrow-left" size={28} color="#475569" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-slate-800 font-sans">Details</Text>
        <View className="w-10" />
      </View>

      <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
        
        {/* Header Info */}
        <View className="items-center mb-8 mt-4">
          <View className="w-20 h-20 bg-nlOrange-50 rounded-full items-center justify-center mb-4">
            <MaterialCommunityIcons 
              name={getIconName(task.templateIcon)} 
              size={40} 
              color="#ff550a" 
            />
          </View>
          <Text className="text-2xl font-bold text-slate-800 font-sans text-center">
            {displayName}
          </Text>
          {task.isPremium && !task.isCustom && (
            <View className="bg-nlOrange-100 px-3 py-1 rounded-md mt-2">
              <Text className="text-xs font-bold text-nlOrange-700 uppercase">Premium Taak</Text>
            </View>
          )}
        </View>

        {/* Settings Form */}
        <View className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm mb-6">
          
          {/* Frequency */}
          <View className="mb-6">
            <Text className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Frequentie (Dagen)</Text>
            <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-xl px-4 h-14">
              <MaterialCommunityIcons name="calendar-sync" size={20} color="#94a3b8" />
              <TextInput
                className="flex-1 ml-3 text-base text-slate-800 font-sans"
                value={intervalDays}
                onChangeText={setIntervalDays}
                keyboardType="numeric"
                placeholder="Bijv: 7"
              />
            </View>
            <Text className="text-xs text-slate-400 font-sans mt-2 ml-1">
              Hoeveel dagen nadat je deze taak hebt afgevinkt moet hij weer terugkomen?
            </Text>
          </View>

          {/* Notes */}
          <View className="mb-6">
            <Text className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Notities</Text>
            <View className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 min-h-[100px]">
              <TextInput
                className="flex-1 text-base text-slate-800 font-sans"
                value={notes}
                onChangeText={setNotes}
                multiline
                placeholder="Bijv: Vergeet de wasbak niet..."
                placeholderTextColor="#94a3b8"
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Active Toggle */}
          <View className="flex-row items-center justify-between border-t border-slate-100 pt-6">
            <View className="flex-1 mr-4">
              <Text className="text-base font-bold text-slate-800 font-sans mb-1">Taak Actief</Text>
              <Text className="text-sm text-slate-500 font-sans">
                Pauzeer deze taak als je hem tijdelijk niet wilt zien.
              </Text>
            </View>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              trackColor={{ false: '#e2e8f0', true: '#ff550a' }}
              thumbColor="white"
            />
          </View>
        </View>

        {/* Actions */}
        <TouchableOpacity 
          className={`h-14 rounded-2xl items-center justify-center shadow-md mb-4 ${updateTaskMutation.isPending ? 'bg-nlOrange-400' : 'bg-nlOrange-500 shadow-nlOrange-200'}`}
          onPress={() => updateTaskMutation.mutate()}
          disabled={updateTaskMutation.isPending || deleteTaskMutation.isPending}
        >
          {updateTaskMutation.isPending ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text className="text-white font-bold text-lg font-sans">Wijzigingen Opslaan</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          className="h-14 rounded-2xl items-center justify-center bg-red-50 border border-red-100 mb-10"
          onPress={handleDelete}
          disabled={updateTaskMutation.isPending || deleteTaskMutation.isPending}
        >
          {deleteTaskMutation.isPending ? (
            <ActivityIndicator color="#ef4444" size="small" />
          ) : (
            <Text className="text-red-600 font-bold text-lg font-sans">Taak Verwijderen</Text>
          )}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}
