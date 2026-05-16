import { db } from '../src/db/client';
import { userTasks, taskTemplates, pushTokens } from '../src/db/schema';
import { eq, and, lte, inArray } from 'drizzle-orm';

export default async function handler(req: any, res: any) {
  // Beveiliging: Vercel stuurt een CRON secret header mee vanuit de vercel.json configuratie
  // Om lokaal te testen kun je deze check overslaan als process.env.NODE_ENV !== 'production'
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const today = new Date().toISOString().split('T')[0];

    // 1. Zoek alle actieve taken die VANDAAG (of eerder) gepland staan
    const dueTasks = await db
      .select({
        userId: userTasks.userId,
        customName: userTasks.customName,
        isCustom: userTasks.isCustom,
        templateName: taskTemplates.name,
      })
      .from(userTasks)
      .leftJoin(taskTemplates, eq(userTasks.templateId, taskTemplates.id))
      .where(
        and(
          eq(userTasks.isActive, true),
          lte(userTasks.nextDueDate, today)
        )
      );

    if (dueTasks.length === 0) {
      return res.status(200).json({ message: 'Geen openstaande taken voor vandaag.' });
    }

    // 2. Groepeer de taken per gebruiker, zodat we niet 5 losse pushberichten sturen
    const tasksByUser: Record<string, string[]> = {};
    for (const task of dueTasks) {
      if (!task.userId) continue;
      const taskName = task.isCustom ? task.customName : task.templateName;
      if (!taskName) continue;

      if (!tasksByUser[task.userId]) {
        tasksByUser[task.userId] = [];
      }
      tasksByUser[task.userId].push(taskName);
    }

    const userIdsWithTasks = Object.keys(tasksByUser);
    if (userIdsWithTasks.length === 0) {
        return res.status(200).json({ message: 'Geen gebruikers met openstaande taken.' });
    }

    // 3. Haal push tokens op voor specifiek de gebruikers die vandaag taken hebben
    const tokensResult = await db
      .select()
      .from(pushTokens)
      .where(inArray(pushTokens.userId, userIdsWithTasks));

    const messages = [];

    for (const tokenData of tokensResult) {
      const uId = tokenData.userId;
      if (!uId) continue;
      
      const userTasksList = tasksByUser[uId];
      if (!userTasksList) continue;

      const taskCount = userTasksList.length;
      
      const title = "Je hebt vandaag taken op de planning! 🧹";
      const body = taskCount === 1 
          ? `Je hebt 1 taak openstaan: ${userTasksList[0]}.`
          : `Je hebt ${taskCount} taken openstaan, waaronder: ${userTasksList[0]}.`;

      messages.push({
        to: tokenData.token,
        sound: 'default',
        title,
        body,
        data: { screen: 'Vandaag' }, // In de app kunnen we dit opvangen om direct naar het Vandaag scherm te navigeren
      });
    }

    // 4. Stuur berichten via de gratis Expo Push API
    if (messages.length > 0) {
      const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });
      const expoResult = await expoResponse.json();
      console.log('Expo Push API response:', expoResult);
    }

    return res.status(200).json({ success: true, messagesSent: messages.length });
  } catch (error: any) {
    console.error('Fout in cronjob:', error);
    return res.status(500).json({ error: error.message });
  }
}
