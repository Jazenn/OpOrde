import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/clerk-expo';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { db } from '../../src/db/client';
import { userTasks, taskTemplates, taskCompletions } from '../../src/db/schema';
import { eq, and, lte } from 'drizzle-orm';
import { getIconName } from '../../src/lib/icons';

// Helper om een reeks van 7 dagen te genereren (Vandaag gecentreerd, -3 tot +3)
const generateWeekDays = () => {
  const days = [];
  for (let i = -3; i <= 3; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push({
      dateObj: d,
      isoDate: d.toISOString().split('T')[0],
      dayName: d.toLocaleDateString('nl-NL', { weekday: 'short' }).replace('.', ''), // ma, di, wo
      dayNumber: d.getDate(),
      isToday: i === 0,
    });
  }
  return days;
};

export default function WeekScreen() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();

  const [selectedIsoDate, setSelectedIsoDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const weekDays = useMemo(() => generateWeekDays(), []);

  // Set initial selected date to today when component mounts
  useEffect(() => {
      setSelectedIsoDate(new Date().toISOString().split('T')[0]);
  }, []);

  const isViewingToday = selectedIsoDate === new Date().toISOString().split('T')[0];
  const todayIso = new Date().toISOString().split('T')[0];

  // Fetch overview of all active tasks to calculate the little dots in the calendar
  const fetchWeekOverview = async () => {
    if (!userId) return [];
    return await db.select({ nextDueDate: userTasks.nextDueDate })
      .from(userTasks)
      .where(and(eq(userTasks.userId, userId), eq(userTasks.isActive, true)));
  };

  const { data: allTasks } = useQuery({
    queryKey: ['tasks', 'overview'],
    queryFn: fetchWeekOverview,
    enabled: !!userId,
  });

  const fetchTasksForDate = async () => {
    if (!userId) return [];
    
    // Voor "Vandaag" pakken we alles wat VANDAAG of EERDER is (zodat achterstallige taken opduiken).
    // Voor elke andere dag (in het verleden of toekomst) kijken we EXACT naar die specifieke datum.
    const dateCondition = isViewingToday 
      ? lte(userTasks.nextDueDate, selectedIsoDate) 
      : eq(userTasks.nextDueDate, selectedIsoDate);

    const tasks = await db
      .select({
        id: userTasks.id,
        isCustom: userTasks.isCustom,
        customName: userTasks.customName,
        nextDueDate: userTasks.nextDueDate,
        intervalDays: userTasks.intervalDays,
        templateName: taskTemplates.name,
        templateIcon: taskTemplates.icon,
        isPremium: taskTemplates.isPremium,
      })
      .from(userTasks)
      .leftJoin(taskTemplates, eq(userTasks.templateId, taskTemplates.id))
      .where(
        and(
          eq(userTasks.userId, userId),
          eq(userTasks.isActive, true),
          dateCondition
        )
      );
      
    return tasks;
  };

  const { data: tasks, isLoading, isError, error } = useQuery({
    queryKey: ['tasks', selectedIsoDate],
    queryFn: fetchTasksForDate,
    enabled: !!userId,
  });

  const completeTaskMutation = useMutation({
    mutationFn: async (task: any) => {
      if (!userId) throw new Error("No user found");

      await db.insert(taskCompletions).values({
        taskId: task.id,
        completedBy: userId,
      });
      
      const nextDate = new Date(); // Vanaf het moment van afvinken (vandaag)
      nextDate.setDate(nextDate.getDate() + (task.intervalDays || 7));
      
      await db.update(userTasks)
        .set({
          nextDueDate: nextDate.toISOString().split('T')[0],
        })
        .where(eq(userTasks.id, task.id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (err) => {
      console.error("Failed to complete task:", err);
    }
  });

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

  const getTaskCountForDay = (dayIso: string, isTodayFlag: boolean) => {
    if (!allTasks) return 0;
    
    return allTasks.filter(t => {
      let dateStr = '';
      if (t.nextDueDate instanceof Date) {
        dateStr = t.nextDueDate.toISOString().split('T')[0];
      } else {
        dateStr = String(t.nextDueDate).split('T')[0];
      }

      if (isTodayFlag) {
        return dateStr <= dayIso;
      }
      return dateStr === dayIso;
    }).length;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
      <View style={{ flex: 1, paddingTop: 20 }}>
        
        {/* Header & Date Selector */}
        <View className="px-6 mb-6">
          <Text className="text-3xl font-bold text-slate-800 font-sans mb-4">
            {isViewingToday ? 'Vandaag' : new Date(selectedIsoDate).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
          
          {/* Horizontal Week Calendar */}
          <View className="flex-row justify-between bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
            {weekDays.map((day) => {
              const isSelected = day.isoDate === selectedIsoDate;
              const taskCount = getTaskCountForDay(day.isoDate, day.isToday);

              return (
                <TouchableOpacity
                  key={day.isoDate}
                  onPress={() => setSelectedIsoDate(day.isoDate)}
                  activeOpacity={0.7}
                  className={`items-center justify-center w-[13%] py-2 rounded-xl relative ${
                    isSelected ? 'bg-nlOrange-500' : (day.isToday ? 'bg-slate-100' : 'bg-transparent')
                  }`}
                >
                  <Text className={`text-xs font-bold font-sans uppercase mb-1 ${
                    isSelected ? 'text-nlOrange-100' : 'text-slate-400'
                  }`}>
                    {day.dayName}
                  </Text>
                  <Text className={`text-lg font-bold font-sans leading-none ${
                    isSelected ? 'text-white' : (day.isToday ? 'text-nlOrange-600' : 'text-slate-700')
                  }`}>
                    {day.dayNumber}
                  </Text>

                  {/* Task Dots */}
                  <View className="flex-row items-center justify-center mt-1 h-1.5 gap-[2px]">
                    {Array.from({ length: Math.min(taskCount, 4) }).map((_, i) => (
                      <View key={i} className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-nlOrange-200' : 'bg-nlOrange-400'}`} />
                    ))}
                    {taskCount > 4 && (
                      <Text className={`text-[10px] font-bold leading-none ${isSelected ? 'text-nlOrange-200' : 'text-nlOrange-400'}`}>+</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {isLoading || !userId ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#ff550a" />
          </View>
        ) : (
          <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
            {tasks?.length === 0 && (
              <View className="items-center justify-center py-16">
                <View className="w-24 h-24 bg-nlOrange-50 rounded-full items-center justify-center mb-6">
                  <MaterialCommunityIcons name="party-popper" size={48} color="#ff550a" />
                </View>
                <Text className="text-xl font-bold text-slate-700 font-sans mb-2">
                  {isViewingToday ? 'Goed bezig!' : 'Helemaal vrij!'}
                </Text>
                <Text className="text-center text-slate-500 font-sans px-8">
                  {isViewingToday 
                    ? 'Neem wat tijd voor jezelf, het huishouden is op orde.' 
                    : 'Er staan nog geen taken gepland voor deze dag.'}
                </Text>
              </View>
            )}

            {tasks?.map(task => {
              const displayName = task.isCustom ? task.customName : task.templateName;
              const displayIcon = task.isCustom ? task.customIcon : task.templateIcon;
              const isPending = completeTaskMutation.variables?.id === task.id && completeTaskMutation.isPending;

              return (
                <TouchableOpacity 
                  key={task.id}
                  onPress={() => router.push(`/tasks/${task.id}`)}
                  activeOpacity={0.7}
                  className="flex-row items-center bg-white p-4 rounded-2xl mb-4 shadow-sm border border-slate-100"
                >
                  <View className="w-12 h-12 bg-nlOrange-50 rounded-full items-center justify-center mr-4">
                    <MaterialCommunityIcons 
                      name={getIconName(displayIcon)} 
                      size={24} 
                      color="#ff550a" 
                    />
                  </View>

                  <View className="flex-1">
                    <Text className="text-lg font-bold text-slate-800 font-sans">
                      {displayName}
                    </Text>
                    <Text className="text-sm text-slate-500 font-sans">
                      {task.isPremium && !task.isCustom ? 'Premium Taak' : 'Basis Taak'}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => completeTaskMutation.mutate(task)}
                    disabled={isPending}
                    activeOpacity={0.7}
                    className={`w-10 h-10 rounded-full border-2 items-center justify-center ${
                      isPending ? 'border-nlOrange-200 bg-nlOrange-50' : 'border-slate-200 bg-white'
                    }`}
                  >
                    {isPending ? (
                      <ActivityIndicator size="small" color="#ff550a" />
                    ) : (
                      <MaterialCommunityIcons name="check" size={20} color="#e2e8f0" />
                    )}
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}
            <View className="h-10" />
          </ScrollView>
        )}

      </View>
    </SafeAreaView>
  );
}
